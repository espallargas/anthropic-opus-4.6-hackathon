class LegislationCrawlerService
  MODEL = 'claude-opus-4-6'
  MAX_TOKENS = 128000  # Max tokens for extended thinking budget

  def initialize(country, sse = nil)
    @country = country
    @sse = sse
    @client = Rails.application.config.x.anthropic
    @operation_id_counter = 0
    @current_operation_id = nil
    @thinking_effort = "high"  # Configure thinking effort level: low, medium, high, max
    @thinking_type_emitted = false  # Track if we've emitted the thinking type
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
      if @sse
        @sse.write(message)
        Rails.logger.info("[EMIT] #{type}") if type == 'search_started'
      else
        Rails.logger.warn("[✗ SSE_NIL] Cannot send #{type} - SSE is nil")
      end
    rescue ActionController::Live::ClientDisconnected
      # Client disconnected - this is expected when user cancels crawl
      Rails.logger.info("[CLIENT_DISCONNECTED] Crawl was stopped by user")
      raise # Re-raise to stop processing
    rescue StandardError => e
      Rails.logger.error("[✗ EMIT_ERROR] #{type}: #{e.class} - #{e.message}")
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

    # Get actual count from database (more accurate than results count)
    total_docs = @country.legislations.count
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
        if event.content_block.type == 'web_search_tool_result' && event.content_block.respond_to?(:content)
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
            Rails.logger.debug("[COLLECTOR] Added content block: type=#{@current_block[:type]}, text_len=#{@current_block[:text].length rescue 0}")
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
      when 'server_tool_use'
        # web_search tool - similar to tool_use but from server
        tool_block = Struct.new(:type, :id, :name, :input).new(
          :server_tool_use,
          block_data[:id],
          block_data[:name],
          block_data[:input]
        )
        tool_block
      when 'web_search_tool_result'
        # web_search results block
        result_block = Struct.new(:type, :content).new(
          :web_search_tool_result,
          block_data[:content]
        )
        result_block
      else
        Rails.logger.warn("[COLLECTOR] Unknown block type: #{block_type.inspect} (#{block_data[:type].class})")
        nil
      end
    end
  end

  def build_response_from_stream(operation_id = nil, **options)
    puts "[BUILD_RESPONSE_FROM_STREAM] Starting with @sse=#{@sse.class rescue 'nil'}"
    $stdout.flush

    collector = StreamResponseCollector.new
    event_count = 0
    search_count = 0
    current_search_id = nil
    search_started_ids = Set.new
    text_block_completed = false
    current_block_type = nil
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

    # Track which web_search server_tool_use blocks we've seen to emit search_started
    server_tool_use_indices = Set.new
    category_list = ['Federal Laws', 'Regulations', 'Consular Rules', 'Jurisdictional', 'Health & Complementary', 'Auxiliary']

    stream_response = @client.messages.stream(**options)
    puts "[STREAM_START] About to iterate over events"
    $stdout.flush
    stream_response.each do |event|
      event_count += 1
      puts "[EVENT_RECEIVED] ##{event_count} type=#{event.type}"
      $stdout.flush

      # Detect web_search tool use blocks during streaming
      event_type = event.type.to_s
      if event_type == 'content_block_start'
        block_type = event.content_block.type.to_s

        # Detect web_search_tool_result which indicates a search happened
        if block_type == 'web_search_tool_result' && !server_tool_use_indices.include?(event.index)
          server_tool_use_indices.add(event.index)
          search_num = server_tool_use_indices.size

          # Try to count results from the content
          result_count = 0
          if event.content_block.respond_to?(:content) && event.content_block.content
            content = event.content_block.content
            # Count result objects in the content
            if content.is_a?(Array)
              result_count = content.length
            elsif content.is_a?(String) && content.include?('[')
              # Try to parse as JSON array to count
              begin
                parsed = JSON.parse(content)
                result_count = parsed.is_a?(Array) ? parsed.length : 0
              rescue
                # Fallback: count by occurrences of "title" field
                result_count = content.scan(/"title"/).length
              end
            end
          end

          if search_num <= category_list.length
            category = category_list[search_num - 1]
            puts "[SEARCH_DONE] #{category} (#{search_num}/6) - #{result_count} results"
            $stdout.flush
            Rails.logger.info("[SEARCH_DONE] #{category} (#{search_num}/6) - #{result_count} results")

            emit(:search_result,
              category: category,
              result_count: result_count,
              index: search_num,
              total: 6
            )
          end
        end
      end

      # Emit thinking blocks in real-time (every chunk)
      if event.type.to_s == 'content_block_delta'
        begin
          if event.delta.respond_to?(:thinking) && event.delta.thinking
            thinking_text = event.delta.thinking
            # Emit thinking type only once at the start
            thinking_type = @thinking_type_emitted ? nil : @thinking_effort
            @thinking_type_emitted = true if !@thinking_type_emitted
            emit(:thinking, text: thinking_text, is_summary: false, operation_id: operation_id, thinking_type: thinking_type)
          end
        rescue => e
          # Silent
        end

        begin
          if event.delta.respond_to?(:text) && event.delta.text
            text = event.delta.text
            # Emit Claude's text output in real-time
            emit(:claude_text, text: text)
          end
        rescue => e
          # Silent
        end
      end



      # Emit token tracking
      if event.type.to_s == 'message_delta' && event.delta.respond_to?(:usage)
        input_tokens = event.delta.usage.input_tokens || 0
        output_tokens = event.delta.usage.output_tokens || 0
        emit(:tokens, input_tokens: input_tokens, output_tokens: output_tokens, total_budget: 128000)
      end

      collector.add_event(event)
    end

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

      Existing legislation in database for #{@country.name}:
      #{existing_list.present? ? existing_list : "None"}

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
        # Define web_search tool - Opus 4.6 supports native web_search
        web_search_tool = {
          type: "web_search_20250305",
          name: "web_search"
        }

        # Define structured output schema for legislation JSON
        legislation_schema = build_legislation_schema

        response = build_response_from_stream(
          current_operation_id,
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
            effort: @thinking_effort,
            format: {
              type: "json_schema",
              schema: legislation_schema
            }
          }
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

        # FALLBACK: If search_results were never emitted during streaming,
        # emit them now with the complete response
        Rails.logger.info("[POST-STREAM] Checking if search_results need to be emitted...")
        emit_search_results_post_stream(response)
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

    # If Claude used tool_use (web_search), handle it
    has_tool_use = response.content.any? { |block| block.type == :tool_use }

    if has_tool_use
      Rails.logger.info("[TOOL_USE] Claude used web_search! Processing tool results...")
      emit(:phase, message: "Processing web_search results")

      # For now, since web_search is server-side, Claude should have already included results
      # Extract what we can from text blocks
      emit(:phase, message: "Extracting legislation results")
      legislation_results = extract_legislation_from_response(response)
    else
      Rails.logger.warn("[NO_TOOL_USE] Claude did not use web_search, trying to extract from text blocks")
      emit(:phase, message: "Extracting legislation results (no web_search used)")
      legislation_results = extract_legislation_from_response(response)
    end

    doc_count = legislation_results.values.sum { |v| v.is_a?(Array) ? v.count : 0 }
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
        date_effective: { type: ["string", "null"], description: "YYYY-MM-DD format or null" }
      },
      required: ["title", "summary", "source_url"],
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
      required: ["federal_laws", "regulations", "consular", "jurisdictional", "complementary", "auxiliary"],
      additionalProperties: false
    }
  end

  def build_user_prompt
    <<~PROMPT
      TASK: Use the web_search tool to research immigration laws for #{@country.name}.

      IMPORTANT: You MUST use the web_search tool exactly 6 times, once for each category below.

      STEP 1: Execute web_search for each category:

      1. FEDERAL: Use web_search("#{@country.name} constitution national immigration law")
      2. REGULATIONS: Use web_search("#{@country.name} immigration official regulations ministry")
      3. VISA: Use web_search("#{@country.name} visa requirements embassy consular procedures")
      4. REGIONAL: Use web_search("#{@country.name} state provincial regional immigration rules")
      5. HEALTH: Use web_search("#{@country.name} immigration health medical requirements")
      6. STATISTICS: Use web_search("#{@country.name} immigration statistics asylum quotas")

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

    # Log all content blocks for debugging
    Rails.logger.info("[EXTRACT] Response has #{response.content.length} content blocks:")
    response.content.each_with_index do |block, idx|
      Rails.logger.info("  Block #{idx}: type=#{block.type}")
      if block.type == :text
        Rails.logger.info("    Text (first 200 chars): #{block.text[0..200]}")
      elsif block.type == :tool_use
        Rails.logger.info("    ToolUse: #{block.name}")
      end
    end

    # Find text block with JSON
    json_text = nil
    response.content.each do |block|
      next unless block.type == :text
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
      end

    rescue JSON::ParserError, StandardError => e
      Rails.logger.warn("Failed to parse legislation JSON: #{e.message}")
    end

    results
  end

  def emit_search_results_for_stream(collector)
    # Extract JSON from response text blocks and emit search_result for each category
    # This is called DURING the streaming loop (when message_stop event arrives)
    # So events are sent before the HTTP response closes

    Rails.logger.info("="*80)
    Rails.logger.info("🔍 [SEARCH_RESULTS_STREAM] STARTING - Emitting search_results during stream")
    Rails.logger.info("   Content blocks available: #{collector.content.length}")
    Rails.logger.info("="*80)

    category_map = {
      'federal_laws' => 'Federal Laws',
      'regulations' => 'Regulations',
      'consular' => 'Consular Rules',
      'jurisdictional' => 'Jurisdictional',
      'complementary' => 'Health & Complementary',
      'auxiliary' => 'Auxiliary'
    }

    # Find text blocks that might contain JSON
    text_blocks = collector.content.select { |block| block.type == :text }
    Rails.logger.info("   Text blocks found: #{text_blocks.length}")
    return if text_blocks.empty?

    # Try to parse JSON from concatenated text
    full_text = text_blocks.map { |block| block.text }.join("\n")
    Rails.logger.info("   Full text length: #{full_text.length} chars")

    begin
      # Extract JSON from the text (Claude might have text before/after JSON)
      json_match = full_text.match(/\{[\s\S]*\}/)
      Rails.logger.info("   JSON match found: #{!json_match.nil?}")
      return unless json_match

      json_str = json_match[0]
      data = JSON.parse(json_str)

      return unless data.is_a?(Hash)

      # Fallback: Emit search_started for all categories if not already emitted
      # This ensures categories show their progress even if we missed the real events
      Rails.logger.info("   🔍 FALLBACK: Emitting search_started for all categories")
      search_index = 0
      category_map.each do |_category_key, category_label|
        search_index += 1
        Rails.logger.info("     ✓ Emitting search_started: #{category_label} (#{search_index}/6)")
        emit(:search_started, category: category_label, query: "Searching #{category_label}...", index: search_index, total: 6)
      end
      Rails.logger.info("   🔍 FALLBACK: Done emitting search_started")

      # Emit search_result for each category with actual count from parsed data
      # IMPORTANT: Emit for ALL categories (even if 0 results) so frontend can mark them as done
      search_index = 0
      category_map.each do |category_key, category_label|
        search_index += 1
        items = data[category_key] || []
        count = items.is_a?(Array) ? items.length : 0

        Rails.logger.info("  📊 Emitting search_result (stream): #{category_label} (#{count} items)")

        # First emit all the web search results (fake events from final JSON)
        if items.is_a?(Array) && items.length > 0
          items.each_with_index do |item, idx|
            title = item['title'] || 'Unknown'
            url = item['source_url'] || ''
            snippet = item['summary'] || ''

            Rails.logger.info("    🌐 Emitting web_search_result for #{category_label}: #{title[0..40]}")
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

        # Then emit the search_result to mark category as done
        Rails.logger.info("[SEARCH] Result: #{category_label} - #{count} items")
        emit(:search_result, category: category_label, result_count: count)

        # Immediately emit category_parse_complete since we have parsed all items from the JSON
        Rails.logger.info("  ✅ Emitting category_parse_complete: #{category_label} (#{count} items)")
        emit(:category_parse_complete, category: category_label, item_count: count)
      end
    rescue JSON::ParserError => e
      Rails.logger.warn("Failed to parse JSON for search_result emission: #{e.message}")
      # Fallback: emit search_result for all categories with 0 results to mark as done
      category_map.each do |_category_key, category_label|
        emit(:search_result, category: category_label, result_count: 0)
      end
    rescue => e
      Rails.logger.warn("Error emitting search_results: #{e.message}")
      # Fallback: emit search_result for all categories with 0 results to mark as done
      category_map.each do |_category_key, category_label|
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
          begin
            title = result.respond_to?(:title) ? result.title : (result['title'] rescue 'Unknown')
            url = result.respond_to?(:url) ? result.url : (result['url'] rescue '')
            snippet = result.respond_to?(:snippet) ? result.snippet : (result['snippet'] rescue '')

            Rails.logger.info("[WEB_SEARCH_RESULTS] Result #{idx + 1}: #{title[0..40]}")

            emit(
              :web_search_result,
              title: title,
              url: url,
              snippet: snippet,
              index: idx + 1,
              total: results.length
            )
          rescue => e
            Rails.logger.warn("[WEB_SEARCH_RESULTS] Error processing result #{idx}: #{e.message}")
          end
        end
      else
        Rails.logger.warn("[WEB_SEARCH_RESULTS] result_block.content is not an array or doesn't exist")
      end
    rescue => e
      Rails.logger.error("[WEB_SEARCH_RESULTS] Error emitting web search results: #{e.message}")
    end
  end

  def emit_search_results_post_stream(response)
    # FALLBACK: Emit search_results after streaming if they weren't emitted during streaming
    # This ensures categories are always marked as 'done' even if streaming logic fails
    Rails.logger.info("[POST-STREAM] emit_search_results_post_stream called")

    category_map = {
      'federal_laws' => 'Federal Laws',
      'regulations' => 'Regulations',
      'consular' => 'Consular Rules',
      'jurisdictional' => 'Jurisdictional',
      'complementary' => 'Health & Complementary',
      'auxiliary' => 'Auxiliary'
    }

    # Find text blocks
    text_blocks = response.content.select { |block| block.type == :text }
    Rails.logger.info("[POST-STREAM] Found #{text_blocks.length} text blocks")

    return if text_blocks.empty?

    # Try to parse JSON from concatenated text
    full_text = text_blocks.map { |block| block.text }.join("\n")
    Rails.logger.info("[POST-STREAM] Full text length: #{full_text.length} chars")

    begin
      # Extract JSON from the text
      json_match = full_text.match(/\{[\s\S]*\}/)
      Rails.logger.info("[POST-STREAM] JSON match found: #{!json_match.nil?}")
      return unless json_match

      json_str = json_match[0]
      data = JSON.parse(json_str)

      return unless data.is_a?(Hash)

      # Emit search_result for each category with actual count from parsed data
      Rails.logger.info("[POST-STREAM] Emitting search results for all categories")
      category_map.each do |category_key, category_label|
        items = data[category_key] || []
        count = items.is_a?(Array) ? items.length : 0

        Rails.logger.info("[POST-STREAM] Emitting search_result: #{category_label} (#{count} items)")
        emit(:search_result, category: category_label, result_count: count)

        # Immediately emit category_parse_complete since we have parsed all items from the JSON
        Rails.logger.info("[POST-STREAM] Emitting category_parse_complete: #{category_label} (#{count} items)")
        emit(:category_parse_complete, category: category_label, item_count: count)
      end
    rescue => e
      Rails.logger.warn("[POST-STREAM] Error parsing JSON or emitting results: #{e.message}")
      # Fallback: emit 0 results for all categories
      Rails.logger.info("[POST-STREAM] FALLBACK: Emitting 0 results for all categories")
      category_map.each do |_category_key, category_label|
        emit(:search_result, category: category_label, result_count: 0)
        emit(:category_parse_complete, category: category_label, item_count: 0)
      end
    end
  end

  def emit_search_results_from_response(collector)
    # This method is no longer used - we now emit during stream at message_stop
    # Keeping it in case we need it for debugging
    Rails.logger.info("⚠️  [DEPRECATED] emit_search_results_from_response called (should use emit_search_results_for_stream)")
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
