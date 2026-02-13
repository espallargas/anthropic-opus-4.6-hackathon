class LegislationCrawlerService
  MODEL = 'claude-opus-4-6'
  MAX_TOKENS = 128000  # Max tokens for extended thinking budget

  def initialize(country, sse = nil)
    @country = country
    @sse = sse
    @client = Rails.application.config.x.anthropic
    @operation_id_counter = 0
    @current_operation_id = nil
  end

  # Generate a unique operation ID for grouping related messages
  def next_operation_id
    @operation_id_counter += 1
    "op_#{@operation_id_counter}"
  end

  # Single unified emit method - type-safe with schema validation
  def emit(type, **data)
    begin
      message = ::SSEMessageSchema.format(type, data)
      Rails.logger.info("[EMIT] #{type}: #{message.to_json[0..100]}")
      if @sse
        # SSE.write expects a hash, will convert to JSON automatically with 'data: ' prefix
        @sse.write(message)
        Rails.logger.info("[EMIT_SUCCESS] #{type} written to SSE")
      else
        Rails.logger.warn("[EMIT_WARNING] SSE is nil, cannot write #{type}")
      end
    rescue StandardError => e
      Rails.logger.error("Emit error for type #{type}: #{e.class} - #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
      # Try to send error message anyway
      @sse&.write({ type: 'error', message: "Emit error: #{e.message}", timestamp: Time.current.iso8601(3) })
    end
  end

  def crawl
    Rails.logger.info("[CRAWL_START] SSE class: #{@sse.class}, nil? #{@sse.nil?}")
    Rails.logger.info("[CRAWL_START] Country: #{@country.name}")
    emit(:phase, message: "Starting crawl for #{@country.name}")

    existing_count = @country.legislations.count
    crawl_type = @country.last_crawled_at.nil? ? "first_crawl" : "update_search"

    emit(:phase, message: "Crawl type: #{crawl_type}")
    emit(:phase, message: "Found #{existing_count} existing legislations")

    # Build system prompt
    system_prompt = build_system_prompt(crawl_type, existing_count)

    # Call Claude Opus 4.6 with web_search tool
    results = call_claude_crawler(system_prompt)

    # Save results to database
    emit(:phase, message: "Saving results to database")
    save_results(results)

    @country.update!(last_crawled_at: Time.current)
    total_docs = results.values.sum { |docs| docs.is_a?(Array) ? docs.count : 0 }
    emit(:complete, message: "Crawl complete", document_count: total_docs)
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
    end

    def add_event(event)
      case event.type
      when 'content_block_start'
        # Start a new content block
        @current_block = {
          type: event.content_block.type,
          id: event.content_block.id,
          index: event.index,
          text: "",
          thinking: "",
          name: event.content_block.name,
          input: event.content_block.input,
          tool_use_id: event.content_block.id
        }

      when 'content_block_delta'
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

      when 'content_block_stop'
        # Finalize current block and add to content array
        if @current_block
          # Convert to a proper block object
          block = convert_block(@current_block)
          @content << block if block
          @current_block = nil
        end

      when 'message_stop'
        # Message finished
        @stop_reason = event.message.stop_reason if event.message.respond_to?(:stop_reason)

      when 'message_start'
        @model = event.message.model if event.message.respond_to?(:model)
      end
    end

    private

    def convert_block(block_data)
      case block_data[:type]
      when 'text'
        # Return block-like object with text
        Struct.new(:type, :text).new(:text, block_data[:text])
      when 'thinking'
        # Return block-like object with thinking
        Struct.new(:type, :thinking).new(:thinking, block_data[:thinking])
      when 'tool_use'
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
      end
    end
  end

  def build_response_from_stream(operation_id = nil, **options)
    collector = StreamResponseCollector.new
    event_count = 0
    search_count = 0
    category_map = {
      'federal' => 'Federal Laws',
      'regulation' => 'Regulations',
      'consular' => 'Consular Rules',
      'visa' => 'Consular Rules',
      'embassy' => 'Consular Rules',
      'regional' => 'Jurisdictional',
      'provincial' => 'Jurisdictional',
      'jurisdiction' => 'Jurisdictional',
      'health' => 'Health & Complementary',
      'complementary' => 'Health & Complementary',
      'vaccine' => 'Health & Complementary',
      'statistic' => 'Auxiliary',
      'quota' => 'Auxiliary',
      'occupation' => 'Auxiliary'
    }

    stream_response = @client.messages.stream(**options)
    stream_response.each do |event|
      event_count += 1
      Rails.logger.info("Stream event ##{event_count}: #{event.type}")

      # Emit thinking blocks in real-time
      if event.type == 'content_block_delta'
        if event.delta.respond_to?(:thinking) && event.delta.thinking
          emit(:thinking, text: event.delta.thinking, is_summary: false, operation_id: operation_id)
        end
      end

      # Detect and emit web_search tool calls
      if event.type == 'content_block_start'
        if event.content_block.type == 'tool_use' && event.content_block.name == 'web_search'
          search_count += 1
          # Emit search_started - we'll get the query in the input delta
          Rails.logger.info("  -> Tool use (web_search) ##{search_count} started")
        end
      end

      # Capture query from input deltas
      if event.type == 'content_block_delta'
        if event.delta.respond_to?(:input) && event.delta.input
          query = event.delta.input.to_s
          if query.length > 10
            # Infer category from query
            category = 'Federal Laws'
            category_map.each do |keyword, cat_name|
              if query.downcase.include?(keyword.downcase)
                category = cat_name
                break
              end
            end
            emit(:search_started, operation_id: operation_id, category: category, query: query, index: search_count, total: 6)
            Rails.logger.info("  -> web_search query: #{query[0..50]}... (category: #{category})")
          end
        end
      end

      # Emit token tracking
      if event.type == 'message_delta' && event.delta.respond_to?(:usage)
        input_tokens = event.delta.usage.input_tokens || 0
        output_tokens = event.delta.usage.output_tokens || 0
        emit(:tokens, input_tokens: input_tokens, output_tokens: output_tokens, total_budget: 128000)
      end

      collector.add_event(event)
    end

    Rails.logger.info("Stream completed with #{event_count} events, #{collector.content.length} content blocks, #{search_count} searches")
    collector
  end

  def build_system_prompt(crawl_type, existing_count)
    existing_list = if existing_count > 0
      @country.legislations
        .select(:title, :date_effective)
        .order(:title)
        .map { |l| "- #{l.title} (effective: #{l.date_effective || 'unknown'})" }
        .join("\n")
    else
      "None"
    end

    <<~PROMPT
      You are a legislation researcher specializing in immigration law for #{@country.name}.

      Your task: Search for immigration legislation organized by category, then return structured JSON.

      === CRITICAL: NAMING CONVENTIONS FOR CLARITY ===

      Use EXACT, OFFICIAL law names with reference numbers (e.g., "Lei 13.445/2017", "Decreto 9.199/2017").
      DO NOT use generic names like "Federal Laws 1" or "Regulations 1" - these are meaningless for deduplication.

      For each law, include:
      - Official reference number if available (e.g., "Law No. 123/2020")
      - Official title in local language
      - Year/date context (e.g., "Lei 2024" if it's a 2024 update)

      === DEDUPLICATION AND UPDATES ===

      Existing legislation in database for #{@country.name}:
      #{existing_list}

      When you find legislation, check against this list:
      - IDENTICAL TITLE + SAME DATE = SKIP (duplicate)
      - IDENTICAL TITLE + NEWER DATE = INCLUDE as UPDATE (system will mark old as deprecated)
      - SIMILAR TITLE (e.g., amendment/revision) = INCLUDE with DIFFERENT NAME
        Example: If "Lei 13.445/2017" exists, and you find "Lei 13.445/2017 Amendment 2024", use EXACT name "Lei 13.445/2017 Amendment 2024"

      STEP 1: Search for legislation
      Use web_search to find information for EACH of these 6 categories:
      - federal_laws: Main immigration laws and constitutional provisions
      - regulations: Official immigration procedures and ministry regulations
      - consular: Visa requirements and embassy procedures
      - jurisdictional: Regional or provincial immigration rules
      - complementary: Health requirements and complementary laws
      - auxiliary: Statistics, quotas, and occupational lists

      For each search, look for:
      - Official law reference numbers and exact titles
      - Effective dates and recent updates
      - Amendment history
      - Summary of key requirements
      - Official sources and URLs

      STEP 2: Build JSON response
      After searching, compile ALL results into this exact JSON format (no other text):

      {
        "federal_laws": [
          {"title": "Official Law Name/Reference (Year if relevant)", "summary": "2-3 sentence summary", "source_url": "https://...", "date_effective": "YYYY-MM-DD", "is_deprecated": false}
        ],
        "regulations": [...],
        "consular": [...],
        "jurisdictional": [...],
        "complementary": [...],
        "auxiliary": [...]
      }

      IMPORTANT:
      - Return ONLY valid JSON with no other text before or after
      - Include at least 1-3 entries per category
      - Use EXACT official law names and reference numbers (not generic names)
      - Use real URLs from search results
      - Dates should be YYYY-MM-DD format (use 2024-01-01 as placeholder if unknown)
      - Set is_deprecated: false for all entries unless new law explicitly supersedes older one
      - Avoid duplicate entries with identical titles and dates
    PROMPT
  end

  def call_claude_crawler(system_prompt)
    emit(:phase, message: "Invoking Claude Opus 4.6 Agent")

    messages = [
      {
        role: "user",
        content: build_user_prompt
      }
    ]

    # Call Claude with streaming - use .stream() for real-time event handling
    # The API handles web_search tool execution natively
    Rails.logger.info("Calling Claude API with streaming, timeout: 300s")

    # Initialize operation_id for first streaming call
    current_operation_id = next_operation_id

    response = nil
    begin
      Timeout.timeout(300) do  # 5 minute timeout
        response = build_response_from_stream(
          current_operation_id,
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: {
            type: "adaptive"
          },
          system_: system_prompt,
          messages: messages
        )
        Rails.logger.info("Claude stream completed!")
        Rails.logger.info("Response stop_reason: #{response.stop_reason}")
        Rails.logger.info("Response content blocks: #{response.content.length}")
        response.content.each_with_index do |block, idx|
          Rails.logger.info("  Block #{idx}: type=#{block.type}")
          if block.type == :text
            Rails.logger.info("    Text length: #{block.text.length}")
          elsif block.type == :thinking
            Rails.logger.info("    Thinking length: #{block.thinking.to_s.length}")
          end
        end
      end
    rescue Timeout::Error => e
      Rails.logger.error("Claude API timeout after 300s: #{e.message}")
      emit(:error, message: "Claude API timeout - request took too long")
      raise
    rescue => e
      Rails.logger.error("Claude API error: #{e.class} - #{e.message}")
      emit(:error, message: "Claude API error: #{e.message}")
      raise
    end

    # Extract JSON results from text blocks
    emit(:phase, message: "Extracting legislation results")
    legislation_results = extract_legislation_from_response(response)

    doc_count = legislation_results.values.sum { |v| v.is_a?(Array) ? v.count : 0 }
    emit(:phase, message: "Preparing database save (#{doc_count} documents)")

    legislation_results
  end


  def build_user_prompt
    <<~PROMPT
      Your task: Research immigration legislation for #{@country.name} across 6 categories.

      Execute web_search calls IN PARALLEL for each category (you can call multiple searches at once):

      1. **Federal Laws**: National/Federal immigration laws and constitutional provisions for #{@country.name}
      2. **Regulations**: Official regulations and procedures
      3. **Consular**: Visa requirements and embassy/consular procedures
      4. **Jurisdictional**: Regional or provincial immigration rules
      5. **Complementary**: Health requirements and complementary laws
      6. **Auxiliary**: Immigration statistics, quotas, and occupational lists

      For each category, formulate 1-2 effective search queries and execute them. You can call multiple web_search in parallel.

      CRITICAL RULES:
      ✅ Search ONLY for #{@country.name} legislation
      ✅ Verify source URLs are from #{@country.name} government domain
      ❌ REJECT laws from other countries, generic titles, or entries without specific law numbers

      After all searches complete, analyze results and return ONLY this JSON (no other text):

      {
        "federal_laws": [
          {"title": "Official Law Name/Reference", "summary": "2-3 sentence summary", "source_url": "https://...", "date_effective": "YYYY-MM-DD"}
        ],
        "regulations": [...],
        "consular": [...],
        "jurisdictional": [...],
        "complementary": [...],
        "auxiliary": [...]
      }

      IMPORTANT:
      - Execute searches in parallel when possible (call multiple web_search at once)
      - Include 1-3 quality entries per category
      - Use EXACT official law names with reference numbers
      - Dates in YYYY-MM-DD format
      - Empty arrays if no results found for category
    PROMPT
  end

  def extract_legislation_from_response(response)
    category_map = {
      'federal_laws' => 'Federal Laws',
      'regulations' => 'Regulations',
      'consular' => 'Consular Rules',
      'jurisdictional' => 'Jurisdictional',
      'complementary' => 'Health & Complementary',
      'auxiliary' => 'Auxiliary'
    }

    results = {
      federal_laws: [],
      regulations: [],
      consular: [],
      jurisdictional: [],
      complementary: [],
      auxiliary: []
    }

    # Find text block with JSON
    json_text = nil
    response.content.each do |block|
      next unless block.type == :text
      json_text = block.text
      break if json_text&.include?('"federal_laws"')
    end

    return results if json_text.blank?

    begin
      # Extract JSON from text
      json_match = json_text.match(/\{[\s\S]*\}/)
      return results unless json_match

      data = JSON.parse(json_match[0])
      return results unless data.is_a?(Hash)

      # Process each category and emit search_result
      ['federal_laws', 'regulations', 'consular', 'jurisdictional', 'complementary', 'auxiliary'].each do |category|
        category_sym = category.to_sym
        category_label = category_map[category]
        items = data[category] || []

        items.each do |item|
          next unless item.is_a?(Hash)
          next if item['title'].blank?

          results[category_sym] << {
            title: item['title'].to_s.strip,
            content: item['summary'].to_s,
            summary: item['summary'].to_s,
            source_url: item['source_url'].to_s,
            date_effective: parse_date(item['date_effective']),
            is_deprecated: false,
            deprecation_notice: nil
          }
        end

        # Emit search result for this category
        emit(:search_result, category: category_label, result_count: results[category_sym].length)
      end
    rescue JSON::ParserError, StandardError => e
      Rails.logger.warn("Failed to parse legislation JSON: #{e.message}")
    end

    results
  end

  def parse_claude_results(results)
    parsed = {}

    results.each do |category_str, documents|
      category_sym = category_str.to_sym
      next unless Legislation.categories.key?(category_sym)

      parsed[category_sym] = documents.map do |doc|
        {
          title: doc['title'] || 'Untitled',
          content: doc['content'] || doc['summary'] || 'Content not available',
          summary: doc['summary'],
          source_url: doc['source_url'] || 'https://example.com',
          date_effective: parse_date(doc['date_effective']),
          is_deprecated: doc['is_deprecated'] || false,
          deprecation_notice: doc['deprecation_notice']
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

  def save_results(results)
    legislations_to_insert = []
    legislations_to_update = []

    results.each do |category, documents|
      documents.each do |doc|
        # Check if legislation with same title already exists
        existing = @country.legislations.find_by(title: doc[:title])

        if existing
          # Compare dates to determine if it's an update or duplicate
          new_date = doc[:date_effective]
          old_date = existing.date_effective

          if new_date && old_date && new_date > old_date
            # Newer version found - mark old as deprecated
            legislations_to_update << { existing_id: existing.id, new_doc: doc, new_category: category }
          else
            # Same or older date - skip as duplicate
            next
          end
        else
          # New legislation
          legislations_to_insert << {
            country_id: @country.id,
            category: Legislation.categories[category],
            title: doc[:title],
            content: doc[:content],
            summary: doc[:summary],
            source_url: doc[:source_url],
            date_effective: doc[:date_effective],
            is_deprecated: doc[:is_deprecated],
            crawled_at: Time.current,
            created_at: Time.current,
            updated_at: Time.current
          }
        end
      end
    end

    # Insert new legislations in batches with progress updates
    if legislations_to_insert.any?
      emit(:phase, message: "Saving #{legislations_to_insert.count} new legislations...")
      Legislation.insert_all(legislations_to_insert)

      # Query actual DB count and emit batch_saved update
      current_count = @country.legislations.count
      emit(:batch_saved, total_saved: current_count)

      # Small delay to ensure DB write is flushed
      sleep(0.5)
    end

    # Update existing with new versions
    if legislations_to_update.any?
      emit(:phase, message: "Processing #{legislations_to_update.count} updates...")

      legislations_to_update.each do |update|
        old_leg = Legislation.find(update[:existing_id])

        # Create new version
        new_leg = Legislation.create!(
          country_id: @country.id,
          category: Legislation.categories[update[:new_category]],
          title: update[:new_doc][:title],
          content: update[:new_doc][:content],
          summary: update[:new_doc][:summary],
          source_url: update[:new_doc][:source_url],
          date_effective: update[:new_doc][:date_effective],
          is_deprecated: update[:new_doc][:is_deprecated],
          crawled_at: Time.current
        )

        # Mark old as deprecated
        old_leg.update!(is_deprecated: true, replaced_by_id: new_leg.id)
      end

      # Query actual DB count and emit batch_saved update
      current_count = @country.legislations.count
      emit(:batch_saved, total_saved: current_count)

      # Small delay to ensure DB write is flushed
      sleep(0.5)
    end
  end
end
