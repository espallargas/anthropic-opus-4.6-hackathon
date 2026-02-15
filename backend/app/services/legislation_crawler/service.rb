module LegislationCrawler
  class Service
    MODEL = "claude-opus-4-6".freeze
    MAX_TOKENS = 128_000
    TIMEOUT_SECONDS = 1800

    attr_reader :country, :sse, :client, :thinking_effort
    attr_accessor :operation_id_counter, :current_operation_id, :thinking_type_emitted, :parse_complete_emitted

    def initialize(country, sse = nil)
      @country = country
      @sse = sse
      @client = Rails.application.config.x.anthropic
      @operation_id_counter = 0
      @current_operation_id = nil
      @thinking_effort = "high"
      @thinking_type_emitted = false
      @parse_complete_emitted = Set.new
    end

    def crawl
      emit(:phase, message: "Starting crawl for #{country.name}")

      existing_count = country.legislations.count
      crawl_type = country.last_crawled_at.nil? ? "first_crawl" : "update_search"

      emit(:phase, message: "Found #{existing_count} existing legislations")

      prompt_builder = PromptBuilder.new(country)
      system_prompt = prompt_builder.system_prompt(crawl_type, existing_count)
      progressive_saver = ProgressiveSaver.new(country, method(:emit), parse_complete_emitted)

      begin
        results = call_claude_crawler(system_prompt, prompt_builder, progressive_saver)
      rescue Anthropic::Errors::APIConnectionError, Timeout::Error => e
        Rails.logger.warn("Crawl interrupted: #{e.class} - #{e.message}")

        if progressive_saver.saved_categories.any?
          Rails.logger.info("Partial crawl: #{progressive_saver.saved_categories.size} categories saved before interruption")
          emit(:phase, message: "Crawl partially completed (#{progressive_saver.saved_categories.size} categories saved)")
          results = {}
        else
          raise
        end
      end

      # Save any categories not already saved during streaming
      emit(:phase, message: "Saving results to database")
      save_results(results, already_saved: progressive_saver.saved_categories)

      country.update!(last_crawled_at: Time.current)

      total_docs = country.legislations.count
      emit(:complete, message: "Crawl complete", document_count: total_docs)

      Rails.logger.info("Crawl complete: #{country.name} - #{total_docs} legislations")
    end

    private

    def emit(type, **data)
      message = SSEMessageSchema.format(type, data)
      return unless sse

      sse.write(message)
    rescue ActionController::Live::ClientDisconnected
      raise
    rescue StandardError => e
      Rails.logger.error("[EMIT_ERROR] #{type}: #{e.class} - #{e.message}")
    end

    def next_operation_id
      self.operation_id_counter = (operation_id_counter || 0) + 1
      "op_#{operation_id_counter}"
    end

    def call_claude_crawler(system_prompt, prompt_builder, progressive_saver = nil)
      Rails.logger.info("[CALL_CLAUDE] Starting call_claude_crawler")
      emit(:phase, message: "Invoking Claude Opus 4.6 Agent")

      messages = [{ role: "user", content: prompt_builder.user_prompt }]

      current_operation_id = next_operation_id
      response = nil
      begin
        Timeout.timeout(TIMEOUT_SECONDS) do
          web_search_tool = { type: "web_search_20250305", name: "web_search" }

          response = build_response_from_stream(
            current_operation_id,
            progressive_saver: progressive_saver,
            model: MODEL,
            max_tokens: MAX_TOKENS,
            thinking: { type: "adaptive" },
            tools: [web_search_tool],
            tool_choice: { type: "auto" },
            system_: system_prompt,
            messages: messages,
            output_config: {
              effort: thinking_effort,
              format: { type: "json_schema", schema: prompt_builder.legislation_schema }
            }
          )
          emit_search_results_post_stream(response)
        end
      rescue Timeout::Error => e
        Rails.logger.error("Claude API timeout after #{TIMEOUT_SECONDS}s: #{e.message}")
        emit(:error, message: "Claude API timeout - request took too long")
        raise
      rescue StandardError => e
        Rails.logger.error("Claude API error: #{e.class} - #{e.message}")
        emit(:error, message: "Claude API error: #{e.message}")
        raise
      end

      emit(:phase, message: "Extracting legislation results")
      legislation_results = response ? extract_legislation_from_response(response) : {}

      doc_count = legislation_results&.values&.sum { |v| v.is_a?(Array) ? v.count : 0 } || 0
      emit(:phase, message: "Preparing database save (#{doc_count} documents)")

      legislation_results
    end

    # rubocop:disable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
    def build_response_from_stream(operation_id = nil, progressive_saver: nil, **api_params)
      Rails.logger.info("[BUILD_RESPONSE] Starting stream response collection")
      collector = StreamResponseCollector.new
      event_count = 0

      server_tool_use_indices = Set.new
      search_started_indices = Set.new
      category_ids = PromptBuilder.category_ids
      category_labels = PromptBuilder.category_labels

      stream_response = client.messages.stream(**api_params)
      stream_response.each do |event|
        event_count += 1

        handle_block_start(event, search_started_indices, server_tool_use_indices, category_ids, category_labels)
        handle_block_delta(event, operation_id, progressive_saver)
        handle_token_tracking(event)

        collector.add_event(event)
      end

      Rails.logger.info("[BUILD_RESPONSE] Stream complete, got #{event_count} events, " \
                        "#{collector.content.length} content blocks")
      collector
    end
    # rubocop:enable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity

    def handle_block_start(event, search_started_indices, server_tool_use_indices, category_ids, category_labels)
      return unless event.type.to_s == "content_block_start"

      block_type = event.content_block.type.to_s

      if block_type == "server_tool_use" && search_started_indices.exclude?(event.index)
        search_started_indices.add(event.index)
        search_num = search_started_indices.size

        if search_num <= category_ids.length
          emit(:search_started, category: category_ids[search_num - 1],
                                query: "Searching #{category_labels[search_num - 1].downcase}")
        end
      end

      return unless block_type == "web_search_tool_result" && server_tool_use_indices.exclude?(event.index)

      server_tool_use_indices.add(event.index)
      search_num = server_tool_use_indices.size
      result_count = count_search_results(event)

      return unless search_num <= category_ids.length

      emit(:search_result, category: category_ids[search_num - 1], result_count: result_count)
    end

    def count_search_results(event)
      return 0 unless event.content_block.respond_to?(:content) && event.content_block.content

      content = event.content_block.content
      return content.length if content.is_a?(Array)
      return 0 unless content.is_a?(String) && content.include?("[")

      parsed = JSON.parse(content)
      parsed.is_a?(Array) ? parsed.length : 0
    rescue StandardError
      content.scan('"title"').length
    end

    def handle_block_delta(event, operation_id, progressive_saver)
      return unless event.type.to_s == "content_block_delta"

      emit_thinking_delta(event, operation_id)
      emit_text_delta(event, progressive_saver)
    end

    def emit_thinking_delta(event, operation_id)
      return unless event.delta.respond_to?(:thinking) && event.delta.thinking

      thinking_type = thinking_type_emitted ? nil : thinking_effort
      self.thinking_type_emitted = true unless thinking_type_emitted
      emit(:thinking, text: event.delta.thinking, is_summary: false, operation_id: operation_id,
                       thinking_type: thinking_type)
    rescue StandardError
      # Silent
    end

    def emit_text_delta(event, progressive_saver)
      return unless event.delta.respond_to?(:text) && event.delta.text

      emit(:claude_text, text: event.delta.text)
      progressive_saver&.on_text_delta(event.delta.text)
    rescue StandardError
      # Silent
    end

    def handle_token_tracking(event)
      return unless event.type.to_s == "message_delta" && event.delta.respond_to?(:usage)

      input_tokens = event.delta.usage.input_tokens || 0
      output_tokens = event.delta.usage.output_tokens || 0
      emit(:tokens, input_tokens: input_tokens, output_tokens: output_tokens, total_budget: 128_000)
    end

    def extract_legislation_from_response(response)
      results = PromptBuilder.category_ids.each_with_object({}) { |id, h| h[id.to_sym] = [] }

      return results if response.blank? || response.content.blank?

      json_text = find_json_text(response)
      return results if json_text.blank?

      parse_legislation_json(json_text, results)
    end

    def find_json_text(response)
      response.content.each do |block|
        next unless block.respond_to?(:type) && block.type == :text

        return block.text if block.text&.include?('"federal_laws"')
      end

      Rails.logger.warn("[EXTRACT] No JSON text found in response blocks!")
      nil
    end

    def parse_legislation_json(json_text, results)
      markdown_match = json_text.match(/```(?:json)?\s*(\{[\s\S]*\})(?:\s*```)?/m)

      json_to_parse = if markdown_match
                        markdown_match[1]
                      else
                        raw_match = json_text.match(/(\{[\s\S]*\})/)
                        raw_match[1] if raw_match
                      end

      return results unless json_to_parse

      data = JSON.parse(json_to_parse)
      return results unless data.is_a?(Hash)

      PromptBuilder::CATEGORIES.each_key do |category|
        category_sym = category.to_sym
        items = data[category] || []

        items.each do |item|
          next unless item.is_a?(Hash) && item["title"].present?

          results[category_sym] << {
            title: item["title"].to_s.strip,
            content: item["summary"].to_s,
            summary: item["summary"].to_s,
            source_url: item["source_url"].to_s,
            date_effective: parse_date(item["date_effective"]),
            is_deprecated: false,
            deprecation_notice: nil
          }
        end
      end

      results
    rescue StandardError => e
      Rails.logger.warn("Failed to parse legislation JSON: #{e.message}")
      results
    end

    def emit_search_results_post_stream(response)
      text_blocks = response.content.select { |block| block.type == :text }
      return if text_blocks.empty?

      full_text = text_blocks.map(&:text).join("\n")

      json_match = full_text.match(/\{[\s\S]*\}/)
      return unless json_match

      data = JSON.parse(json_match[0])
      return unless data.is_a?(Hash)

      PromptBuilder::CATEGORIES.each do |category_key, category_label|
        items = data[category_key] || []
        count = items.is_a?(Array) ? items.length : 0

        next if parse_complete_emitted.include?(category_label)

        emit(:category_parse_complete, category: category_label, item_count: count)
        parse_complete_emitted.add(category_label)
      end
    rescue StandardError => e
      Rails.logger.warn("[PARSE_ERROR] Error parsing JSON: #{e.message}")
      PromptBuilder::CATEGORIES.each_value do |category_label|
        next if parse_complete_emitted.include?(category_label)

        emit(:category_parse_complete, category: category_label, item_count: 0)
        parse_complete_emitted.add(category_label)
      end
    end

    def save_results(results, already_saved: Set.new)
      saved_count = 0

      results.each do |category, documents|
        next if already_saved.include?(category.to_s)

        documents.each do |doc|
          existing = country.legislations.find_by(title: doc[:title])

          if existing
            new_date = doc[:date_effective]
            old_date = existing.date_effective
            next if !new_date || !old_date || new_date <= old_date

            # Version update — deprecate old, create new
            new_leg = Legislation.create!(
              country_id: country.id,
              category: Legislation.categories[category],
              title: doc[:title],
              content: doc[:content],
              summary: doc[:summary],
              source_url: doc[:source_url],
              date_effective: doc[:date_effective],
              is_deprecated: doc[:is_deprecated],
              extraction_status: "pending",
              crawled_at: Time.current
            )
            LegislationContentExtractorJob.perform_async(new_leg.id)
            existing.update!(is_deprecated: true, replaced_by_id: new_leg.id)
            saved_count += 1
            next
          end

          # New legislation
          new_leg = Legislation.create!(
            country_id: country.id,
            category: Legislation.categories[category],
            title: doc[:title],
            content: doc[:content],
            summary: doc[:summary],
            source_url: doc[:source_url],
            date_effective: doc[:date_effective],
            is_deprecated: doc[:is_deprecated],
            extraction_status: "pending",
            crawled_at: Time.current
          )
          LegislationContentExtractorJob.perform_async(new_leg.id)
          saved_count += 1
        end

        emit(:batch_saved, total_saved: country.legislations.count) if saved_count.positive?
      end
    end

    def parse_date(date_str)
      return nil if date_str.blank?

      Date.parse(date_str.to_s)
    rescue StandardError
      nil
    end
  end
end
