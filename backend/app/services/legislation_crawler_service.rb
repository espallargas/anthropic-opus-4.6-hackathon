class LegislationCrawlerService
  MODEL = "claude-opus-4-6".freeze
  MAX_TOKENS = 128_000
  TIMEOUT_SECONDS = 300

  CATEGORY_LABEL_MAP = {
    "federal_laws" => "Federal Laws",
    "regulations" => "Regulations",
    "consular" => "Consular Rules",
    "jurisdictional" => "Jurisdictional",
    "complementary" => "Health & Complementary",
    "auxiliary" => "Auxiliary"
  }.freeze

  CATEGORY_LIST = ["Federal Laws", "Regulations", "Consular Rules", "Jurisdictional", "Health & Complementary",
                   "Auxiliary"].freeze

  CATEGORY_IDS = %w[federal_laws regulations consular jurisdictional complementary auxiliary].freeze

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

  # Generate a unique operation ID for grouping related messages
  def next_operation_id
    self.operation_id_counter = (operation_id_counter || 0) + 1
    "op_#{operation_id_counter}"
  end

  # Single unified emit method - type-safe with schema validation
  def emit(type, **data)
    message = SSEMessageSchema.format(type, data)
    return unless sse

    sse.write(message)
  rescue ActionController::Live::ClientDisconnected
    raise
  rescue StandardError => e
    Rails.logger.error("[EMIT_ERROR] #{type}: #{e.class} - #{e.message}")
  end

  def crawl
    emit(:phase, message: "Starting crawl for #{country.name}")

    existing_count = country.legislations.count
    crawl_type = country.last_crawled_at.nil? ? "first_crawl" : "update_search"

    emit(:phase, message: "Found #{existing_count} existing legislations")

    system_prompt = build_system_prompt(crawl_type, existing_count)
    progressive_saver = ProgressiveCategorySaver.new(country, method(:emit), parse_complete_emitted)
    results = call_claude_crawler(system_prompt, progressive_saver)

    # Save any categories not already saved during streaming
    emit(:phase, message: "Saving results to database")
    save_results(results, already_saved: progressive_saver.saved_categories)

    country.update!(last_crawled_at: Time.current)

    total_docs = country.legislations.count
    emit(:complete, message: "Crawl complete", document_count: total_docs)

    Rails.logger.info("Crawl complete: #{country.name} - #{total_docs} legislations")
  end

  private

  # StreamResponseCollector builds a response object from streaming events
  # This allows us to use the same iteration logic whether streaming or not
  class StreamResponseCollector
    attr_reader :content, :stop_reason, :model, :usage

    def initialize
      @content = []
      @stop_reason = nil
      @model = nil
      @usage = nil
      @current_block = nil
      @thinking_text = ""
      @text_buffer = ""
      @web_search_results = nil
    end

    attr_accessor :web_search_results

    def add_event(event)
      event_type = event.type.to_s.to_sym

      case event_type
      when :content_block_start
        # Start a new content block
        block_id = event.content_block.respond_to?(:id) ? event.content_block.id : nil
        @current_block = {
          type: event.content_block.type,
          id: block_id,
          index: event.index,
          text: "",
          thinking: "",
          content: nil,
          name: event.content_block.respond_to?(:name) ? event.content_block.name : nil,
          input: event.content_block.respond_to?(:input) ? event.content_block.input : nil,
          tool_use_id: block_id
        }

        # Capture web_search_tool_result content
        if event.content_block.type == "web_search_tool_result" && event.content_block.respond_to?(:content)
          @current_block[:content] = event.content_block.content
          @web_search_results = event.content_block.content
        end

      when :content_block_delta
        # Append delta to current block
        if @current_block
          if event.delta.respond_to?(:text) && event.delta.text
            @current_block[:text] ||= ""
            @current_block[:text] += event.delta.text
          elsif event.delta.respond_to?(:thinking) && event.delta.thinking
            @current_block[:thinking] ||= ""
            @current_block[:thinking] += event.delta.thinking
          elsif event.delta.respond_to?(:input) && event.delta.input
            @current_block[:input] ||= ""
            @current_block[:input] += event.delta.input
          end
        end

      when :content_block_stop
        # Finalize current block and add to content array
        if @current_block
          # Convert to a proper block object
          block = convert_block(@current_block)
          if block
            @content << block
            Rails.logger.debug do
              "[COLLECTOR] Added content block: type=#{@current_block[:type]}, text_len=#{begin
                @current_block[:text].length
              rescue StandardError
                0
              end}"
            end
          end
          @current_block = nil
        end

      when :message_stop
        # Message finished
        @stop_reason = event.message.stop_reason if event.message.respond_to?(:stop_reason)

      when :message_start
        @model = event.message.model if event.message.respond_to?(:model)
      end
    end

    private

    def convert_block(block_data)
      block_type = block_data[:type].to_s

      case block_type
      when "text"
        # Return block-like object with text
        Struct.new(:type, :text).new(:text, block_data[:text])
      when "thinking"
        # Return block-like object with thinking
        Struct.new(:type, :thinking).new(:thinking, block_data[:thinking])
      when "tool_use"
        # Return block-like object with tool_use properties
        tool_block = Struct.new(:type, :id, :name, :input).new(
          :tool_use,
          block_data[:id],
          block_data[:name],
          block_data[:input]
        )
        # Make it respond like the SDK's tool_use block
        def tool_block.respond_to_method?(method_name)
          [:type, :id, :name, :input].include?(method_name.to_sym)
        end
        tool_block
      when "server_tool_use"
        # web_search tool - similar to tool_use but from server
        Struct.new(:type, :id, :name, :input).new(
          :server_tool_use,
          block_data[:id],
          block_data[:name],
          block_data[:input]
        )

      when "web_search_tool_result"
        # web_search results block
        Struct.new(:type, :content).new(
          :web_search_tool_result,
          block_data[:content]
        )

      else
        Rails.logger.warn("[COLLECTOR] Unknown block type: #{block_type.inspect} (#{block_data[:type].class})")
        nil
      end
    end
  end

  # Parses streaming JSON text and saves each category as soon as its array closes.
  # This allows Sidekiq extraction jobs to start while Claude is still outputting later categories.
  class ProgressiveCategorySaver
    attr_reader :saved_categories

    def initialize(country, emit_proc, parse_complete_emitted)
      @country = country
      @emit_proc = emit_proc
      @parse_complete_emitted = parse_complete_emitted
      @text_buffer = ""
      @saved_categories = Set.new
      @saved_count = 0
    end

    def on_text_delta(text)
      @text_buffer += text
      try_save_completed_categories
    end

    private

    def try_save_completed_categories
      LegislationCrawlerService::CATEGORY_IDS.each do |category_id|
        next if @saved_categories.include?(category_id)

        items = extract_completed_category(category_id)
        next unless items

        @saved_categories.add(category_id)
        save_category(category_id.to_sym, items)
        Rails.logger.info("[PROGRESSIVE_SAVE] Saved category #{category_id} (#{items.length} items) during streaming")
      end
    end

    def extract_completed_category(category_id)
      pattern = /"#{Regexp.escape(category_id)}"\s*:\s*\[/
      match = @text_buffer.match(pattern)
      return nil unless match

      start_idx = match.end(0)
      end_idx = find_array_end(@text_buffer, start_idx)
      return nil unless end_idx

      array_json = "[#{@text_buffer[start_idx...(end_idx - 1)]}]"
      JSON.parse(array_json)
    rescue JSON::ParserError
      nil
    end

    # Bracket-aware scanner that respects JSON strings
    def find_array_end(text, start_idx)
      bracket_count = 1
      in_string = false
      escape_next = false
      idx = start_idx

      while idx < text.length && bracket_count.positive?
        char = text[idx]

        if escape_next
          escape_next = false
        elsif in_string
          escape_next = true if char == "\\"
          in_string = false if char == '"'
        else
          case char
          when '"' then in_string = true
          when "[" then bracket_count += 1
          when "]" then bracket_count -= 1
          end
        end

        idx += 1
      end

      bracket_count.zero? ? idx : nil
    end

    def save_category(category_sym, items)
      items.each do |item|
        next unless item.is_a?(Hash) && item["title"].present?

        existing = @country.legislations.find_by(title: item["title"])
        parsed_date = parse_date(item["date_effective"])

        if existing
          next if !parsed_date || !existing.date_effective || parsed_date <= existing.date_effective

          new_leg = create_legislation(category_sym, item, parsed_date)
          LegislationContentExtractorJob.perform_async(new_leg.id)
          existing.update!(is_deprecated: true, replaced_by_id: new_leg.id)
          @saved_count += 1
          next
        end

        new_leg = create_legislation(category_sym, item, parsed_date)
        LegislationContentExtractorJob.perform_async(new_leg.id)
        @saved_count += 1
      end

      @emit_proc.call(:batch_saved, total_saved: @country.legislations.count) if @saved_count.positive?

      # Mark category as parsed so frontend updates immediately
      category_label = LegislationCrawlerService::CATEGORY_LABEL_MAP[category_sym.to_s]
      return unless category_label && @parse_complete_emitted.exclude?(category_label)

      @emit_proc.call(:category_parse_complete, category: category_label, item_count: items.length)
      @parse_complete_emitted.add(category_label)
    end

    def create_legislation(category_sym, item, parsed_date)
      Legislation.create!(
        country_id: @country.id,
        category: Legislation.categories[category_sym],
        title: item["title"].to_s.strip,
        content: item["summary"].to_s,
        summary: item["summary"].to_s,
        source_url: item["source_url"].to_s,
        date_effective: parsed_date,
        is_deprecated: false,
        extraction_status: "pending",
        crawled_at: Time.current
      )
    end

    def parse_date(date_str)
      return nil if date_str.blank?

      Date.parse(date_str.to_s)
    rescue StandardError
      nil
    end
  end

  def build_response_from_stream(operation_id = nil, progressive_saver: nil, **api_params)
    Rails.logger.info("[BUILD_RESPONSE] Starting stream response collection")
    collector = StreamResponseCollector.new
    event_count = 0
    Set.new

    server_tool_use_indices = Set.new
    search_started_indices = Set.new

    stream_response = client.messages.stream(**api_params)
    stream_response.each do |event|
      event_count += 1

      # Detect web_search tool use blocks during streaming
      event_type = event.type.to_s
      if event_type == "content_block_start"
        block_type = event.content_block.type.to_s

        # Detect server_tool_use (web_search) start
        if block_type == "server_tool_use" && search_started_indices.exclude?(event.index)
          search_started_indices.add(event.index)
          search_num = search_started_indices.size

          if search_num <= CATEGORY_IDS.length
            category_id = CATEGORY_IDS[search_num - 1]
            category_label = CATEGORY_LIST[search_num - 1]
            emit(:search_started, category: category_id, query: "Searching #{category_label.downcase}")
          end
        end

        # Detect web_search_tool_result which indicates a search happened
        if block_type == "web_search_tool_result" && server_tool_use_indices.exclude?(event.index)
          server_tool_use_indices.add(event.index)
          search_num = server_tool_use_indices.size

          # Try to count results from the content
          result_count = 0
          if event.content_block.respond_to?(:content) && event.content_block.content
            content = event.content_block.content
            # Count result objects in the content
            if content.is_a?(Array)
              result_count = content.length
            elsif content.is_a?(String) && content.include?("[")
              # Try to parse as JSON array to count
              begin
                parsed = JSON.parse(content)
                result_count = parsed.is_a?(Array) ? parsed.length : 0
              rescue StandardError
                # Fallback: count by occurrences of "title" field
                result_count = content.scan('"title"').length
              end
            end
          end

          if search_num <= CATEGORY_IDS.length
            category_id = CATEGORY_IDS[search_num - 1]

            emit(:search_result,
                 category: category_id,
                 result_count: result_count)
          end
        end
      end

      # Emit thinking blocks in real-time (every chunk)
      if event.type.to_s == "content_block_delta"
        begin
          if event.delta.respond_to?(:thinking) && event.delta.thinking
            thinking_text = event.delta.thinking
            # Emit thinking type only once at the start
            thinking_type = thinking_type_emitted ? nil : thinking_effort
            self.thinking_type_emitted = true unless thinking_type_emitted
            emit(:thinking, text: thinking_text, is_summary: false, operation_id: operation_id,
                            thinking_type: thinking_type)
          end
        rescue StandardError
          # Silent
        end

        begin
          if event.delta.respond_to?(:text) && event.delta.text
            text = event.delta.text
            # Emit Claude's text output in real-time
            emit(:claude_text, text: text)
            # Feed to progressive saver for per-category saving during stream
            progressive_saver&.on_text_delta(text)
          end
        rescue StandardError
          # Silent
        end
      end

      # Emit token tracking
      if event.type.to_s == "message_delta" && event.delta.respond_to?(:usage)
        input_tokens = event.delta.usage.input_tokens || 0
        output_tokens = event.delta.usage.output_tokens || 0
        emit(:tokens, input_tokens: input_tokens, output_tokens: output_tokens, total_budget: 128_000)
      end

      collector.add_event(event)
    end

    Rails.logger.info("[BUILD_RESPONSE] Stream complete, got #{event_count} events, " \
                      "#{collector.content.length} content blocks")
    collector
  end

  def build_system_prompt(_crawl_type, existing_count)
    existing_list = if existing_count.positive?
                      country.legislations
                             .select(:title, :date_effective)
                             .order(:title)
                             .map { |l| "- #{l.title} (effective: #{l.date_effective || 'unknown'})" }
                             .join("\n")
                    else
                      "None"
                    end

    <<~PROMPT
      # System: Immigration Legislation Researcher

      You are an expert legislation researcher. Your ONLY job is to:
      1. Use web_search to find immigration laws
      2. Return structured JSON with results

      ## MANDATORY RULES

      🔴 YOU WILL use web_search - this is not optional
      🔴 YOU WILL search for ALL 6 categories - do not skip any
      🔴 YOU WILL NOT generate fake data or hallucinate laws
      🔴 YOU WILL NOT return text that looks like JSON - return ONLY valid JSON
      🔴 YOU WILL use exact law names with reference numbers

      ## HOW THIS WORKS

      The user will provide you with 6 specific search queries.
      You WILL execute each query using web_search.
      You WILL collect results from each search.
      You WILL then compile the results into a JSON response.

      This is a RESEARCH task, not a WRITING task.
      You are gathering facts via web_search, not creating content.

      ## DEDUPLICATION CONTEXT

      Existing legislation in database for #{country.name}:
      #{existing_list.presence || 'None'}

      Rules:
      - IDENTICAL TITLE + SAME DATE = do not include (duplicate)
      - IDENTICAL TITLE + NEWER DATE = include as update
      - Different title but similar (amendment) = include with exact new name

      ## OUTPUT FORMAT

      IMPORTANT: Return ONLY this JSON structure. No text before, no text after.

      {
        "federal_laws": [
          {"title": "Law Name/Ref", "summary": "1-2 sentence brief description", "source_url": "https://...", "date_effective": "YYYY-MM-DD"}
        ],
        "regulations": [...],
        "consular": [...],
        "jurisdictional": [...],
        "complementary": [...],
        "auxiliary": [...]
      }

      ## CITATION RULES

      - source_url MUST be a real URL from web_search results
      - title MUST match the official law name exactly
      - summary MUST be 1-2 sentences, concise and direct
      - date_effective MUST be YYYY-MM-DD format
      - If date unknown, use "2024-01-01" as placeholder
    PROMPT
  end

  def call_claude_crawler(system_prompt, progressive_saver = nil)
    Rails.logger.info("[CALL_CLAUDE] Starting call_claude_crawler")
    emit(:phase, message: "Invoking Claude Opus 4.6 Agent")

    messages = [
      {
        role: "user",
        content: build_user_prompt
      }
    ]

    current_operation_id = next_operation_id
    response = nil
    begin
      Timeout.timeout(TIMEOUT_SECONDS) do
        # Define web_search tool - Opus 4.6 supports native web_search
        web_search_tool = {
          type: "web_search_20250305",
          name: "web_search"
        }

        # Define structured output schema for legislation JSON
        legislation_schema = build_legislation_schema

        response = build_response_from_stream(
          current_operation_id,
          progressive_saver: progressive_saver,
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: {
            type: "adaptive"
          },
          tools: [web_search_tool],
          tool_choice: { type: "auto" },
          system_: system_prompt,
          messages: messages,
          output_config: {
            effort: thinking_effort,
            format: {
              type: "json_schema",
              schema: legislation_schema
            }
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

  def build_legislation_schema
    legislation_item = {
      type: "object",
      properties: {
        title: { type: "string", description: "Official law/regulation name" },
        summary: { type: "string", description: "Brief 1-2 sentence description" },
        source_url: { type: "string", description: "URL source" },
        date_effective: { type: %w[string null], description: "YYYY-MM-DD format or null" }
      },
      required: %w[title summary source_url],
      additionalProperties: false
    }

    {
      type: "object",
      properties: {
        federal_laws: { type: "array", items: legislation_item },
        regulations: { type: "array", items: legislation_item },
        consular: { type: "array", items: legislation_item },
        jurisdictional: { type: "array", items: legislation_item },
        complementary: { type: "array", items: legislation_item },
        auxiliary: { type: "array", items: legislation_item }
      },
      required: %w[federal_laws regulations consular jurisdictional complementary auxiliary],
      additionalProperties: false
    }
  end

  def build_user_prompt
    <<~PROMPT
      TASK: Use the web_search tool to research immigration laws for #{country.name}.

      IMPORTANT: You MUST use the web_search tool exactly 6 times, once for each category below.

      STEP 1: Execute web_search for each category:

      1. FEDERAL: Use web_search("#{country.name} constitution national immigration law")
      2. REGULATIONS: Use web_search("#{country.name} immigration official regulations ministry")
      3. VISA: Use web_search("#{country.name} visa requirements embassy consular procedures")
      4. REGIONAL: Use web_search("#{country.name} state provincial regional immigration rules")
      5. HEALTH: Use web_search("#{country.name} immigration health medical requirements")
      6. STATISTICS: Use web_search("#{country.name} immigration statistics asylum quotas")

      Do NOT skip any searches. Execute all 6 web_search calls.

      STEP 2: After completing all 6 web_searches, return the results in the specified JSON format:

      Each category must have objects with:
      - title: Official law/regulation name
      - summary: 1-2 sentence description
      - source_url: URL where information was found
      - date_effective: Date in YYYY-MM-DD format (or null if unknown)

      CONSTRAINTS:
      - Use ONLY information from web_search results
      - Each category: Include all relevant entries found
      - Use exact official law names, not generic descriptions
      - Return ONLY valid JSON matching the required schema
    PROMPT
  end

  def extract_legislation_from_response(response)
    results = {
      federal_laws: [],
      regulations: [],
      consular: [],
      jurisdictional: [],
      complementary: [],
      auxiliary: []
    }

    return results if response.blank? || response.content.blank?

    # Find text block with JSON
    json_text = nil
    response.content.each do |block|
      next unless block.respond_to?(:type) && block.type == :text

      json_text = block.text
      break if json_text&.include?('"federal_laws"')
    end

    if json_text.blank?
      Rails.logger.warn("[EXTRACT] No JSON text found in response blocks!")
      return results
    end

    begin
      # Extract JSON from text (handle markdown code fences)
      # Try markdown code fence first (with greedy matching for full JSON)
      markdown_match = json_text.match(/```(?:json)?\s*(\{[\s\S]*\})(?:\s*```)?/m)

      json_to_parse = if markdown_match
                        markdown_match[1]
                      else
                        # Fallback to raw JSON extraction
                        raw_match = json_text.match(/(\{[\s\S]*\})/)
                        raw_match[1] if raw_match
                      end

      return results unless json_to_parse

      data = JSON.parse(json_to_parse)
      return results unless data.is_a?(Hash)

      # First pass: extract all items from each category
      CATEGORY_LABEL_MAP.each_key do |category|
        category_sym = category.to_sym
        items = data[category] || []

        items.each do |item|
          next unless item.is_a?(Hash)
          next if item["title"].blank?

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
    rescue StandardError => e
      Rails.logger.warn("Failed to parse legislation JSON: #{e.message}")
    end

    results
  end

  def emit_search_results_for_stream(collector)
    # Find text blocks that might contain JSON
    text_blocks = collector.content.select { |block| block.type == :text }
    return if text_blocks.empty?

    full_text = text_blocks.map(&:text).join("\n")

    begin
      json_match = full_text.match(/\{[\s\S]*\}/)
      return unless json_match

      json_str = json_match[0]
      data = JSON.parse(json_str)

      return unless data.is_a?(Hash)

      search_index = 0
      CATEGORY_LABEL_MAP.each do |category_key, category_label|
        search_index += 1
        items = data[category_key] || []
        count = items.is_a?(Array) ? items.length : 0

        if items.is_a?(Array) && items.length.positive?
          items.each_with_index do |item, idx|
            title = item["title"] || "Unknown"
            url = item["source_url"] || ""
            snippet = item["summary"] || ""

            emit(
              :web_search_result,
              category: category_label,
              title: title,
              url: url,
              snippet: snippet,
              index: idx + 1,
              total: count
            )
          end
        end

        emit(:search_result, category: category_label, result_count: count)

        unless parse_complete_emitted.include?(category_label)
          emit(:category_parse_complete, category: category_label, item_count: count)
          parse_complete_emitted.add(category_label)
        end
      end
    rescue JSON::ParserError => e
      Rails.logger.warn("Failed to parse JSON for search_result emission: #{e.message}")
      CATEGORY_LABEL_MAP.each_value do |category_label|
        emit(:search_result, category: category_label, result_count: 0)
      end
    rescue StandardError => e
      Rails.logger.warn("Error emitting search_results: #{e.message}")
      CATEGORY_LABEL_MAP.each_value do |category_label|
        emit(:search_result, category: category_label, result_count: 0)
      end
    end
  end

  def emit_web_search_results(result_block)
    # Extract and emit web search results
    # result_block.content is an array of search results with title, url, snippet
    Rails.logger.info("[WEB_SEARCH_RESULTS] Processing web search results")

    begin
      if result_block.respond_to?(:content) && result_block.content.is_a?(Array)
        results = result_block.content
        Rails.logger.info("[WEB_SEARCH_RESULTS] Found #{results.length} web search results")

        # Emit each result so frontend can display progress
        results.each_with_index do |result, idx|
          title = if result.respond_to?(:title)
                    result.title
                  else
                    begin
                      result["title"]
                    rescue StandardError
                      "Unknown"
                    end
                  end
          url = if result.respond_to?(:url)
                  result.url
                else
                  begin
                    result["url"]
                  rescue StandardError
                    ""
                  end
                end
          snippet = if result.respond_to?(:snippet)
                      result.snippet
                    else
                      begin
                        result["snippet"]
                      rescue StandardError
                        ""
                      end
                    end

          Rails.logger.info("[WEB_SEARCH_RESULTS] Result #{idx + 1}: #{title[0..40]}")

          emit(
            :web_search_result,
            title: title,
            url: url,
            snippet: snippet,
            index: idx + 1,
            total: results.length
          )
        rescue StandardError => e
          Rails.logger.warn("[WEB_SEARCH_RESULTS] Error processing result #{idx}: #{e.message}")
        end
      else
        Rails.logger.warn("[WEB_SEARCH_RESULTS] result_block.content is not an array or doesn't exist")
      end
    rescue StandardError => e
      Rails.logger.error("[WEB_SEARCH_RESULTS] Error emitting web search results: #{e.message}")
    end
  end

  def emit_search_results_post_stream(response)
    text_blocks = response.content.select { |block| block.type == :text }
    return if text_blocks.empty?

    full_text = text_blocks.map(&:text).join("\n")

    begin
      json_match = full_text.match(/\{[\s\S]*\}/)
      return unless json_match

      json_str = json_match[0]
      data = JSON.parse(json_str)

      return unless data.is_a?(Hash)

      CATEGORY_LABEL_MAP.each do |category_key, category_label|
        items = data[category_key] || []
        count = items.is_a?(Array) ? items.length : 0

        next if parse_complete_emitted.include?(category_label)

        emit(:category_parse_complete, category: category_label, item_count: count)
        parse_complete_emitted.add(category_label)
      end
    rescue StandardError => e
      Rails.logger.warn("[PARSE_ERROR] Error parsing JSON: #{e.message}")
      CATEGORY_LABEL_MAP.each_value do |category_label|
        next if parse_complete_emitted.include?(category_label)

        emit(:category_parse_complete, category: category_label, item_count: 0)
        parse_complete_emitted.add(category_label)
      end
    end
  end

  def parse_claude_results(results)
    parsed = {}

    results.each do |category_str, documents|
      category_sym = category_str.to_sym
      next unless Legislation.categories.key?(category_sym)

      parsed[category_sym] = documents.map do |doc|
        {
          title: doc["title"] || "Untitled",
          content: doc["content"] || doc["summary"] || "Content not available",
          summary: doc["summary"],
          source_url: doc["source_url"] || "https://example.com",
          date_effective: parse_date(doc["date_effective"]),
          is_deprecated: doc["is_deprecated"] || false,
          deprecation_notice: doc["deprecation_notice"]
        }
      end
    end

    parsed
  end

  def parse_date(date_str)
    return nil if date_str.blank?

    Date.parse(date_str.to_s)
  rescue StandardError
    nil
  end

  def save_results(results, already_saved: Set.new)
    saved_count = 0

    results.each do |category, documents|
      next if already_saved.include?(category.to_s)

      documents.each do |doc|
        existing = country.legislations.find_by(title: doc[:title])

        # Skip duplicates with same or older date
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

      # Progress after each category
      emit(:batch_saved, total_saved: country.legislations.count) if saved_count.positive?
    end
  end
end
