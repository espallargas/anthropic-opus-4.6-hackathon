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
      json_msg = message.to_json
      Rails.logger.info("[EMIT] #{type}: #{json_msg[0..150]}")
      if @sse
        # SSE.write expects a hash, will convert to JSON automatically with 'data: ' prefix
        @sse.write(message)
        Rails.logger.info("[✓ EMIT_SUCCESS] #{type} written to SSE stream")
      else
        Rails.logger.warn("[✗ EMIT_WARNING] SSE is nil, cannot write #{type}")
      end
    rescue StandardError => e
      Rails.logger.error("[✗ EMIT_ERROR] #{type}: #{e.class} - #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
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
    current_search_id = nil
    search_started_ids = Set.new
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

      # VERBOSE LOGGING - Every single event
      log_event_details(event, event_count)

      # Emit thinking blocks in real-time (every chunk)
      if event.type == 'content_block_delta'
        if event.delta.respond_to?(:thinking) && event.delta.thinking
          Rails.logger.info("  ✓ THINKING DELTA: #{event.delta.thinking[0..80]}")
          emit(:thinking, text: event.delta.thinking, is_summary: false, operation_id: operation_id)
        end

        if event.delta.respond_to?(:text) && event.delta.text
          text = event.delta.text
          Rails.logger.info("  ✓ TEXT DELTA: #{text[0..80]}")
          # Emit Claude's text output in real-time
          emit(:claude_text, text: text)
        end

        if event.delta.respond_to?(:input) && event.delta.input
          input_text = event.delta.input.to_s
          Rails.logger.info("  ✓ INPUT DELTA: #{input_text[0..80]}")
        end
      end

      # Detect web_search tool use start
      if event.type == 'content_block_start'
        Rails.logger.info("  → BLOCK START: type=#{event.content_block.type}")
        if event.content_block.type == 'tool_use'
          Rails.logger.info("    TOOL_USE block: name=#{event.content_block.name}, id=#{event.content_block.id}")
          if event.content_block.name == 'web_search'
            search_count += 1
            current_search_id = event.content_block.id
            Rails.logger.info("    🔍 WEB_SEARCH ##{search_count} DETECTED (id: #{current_search_id})")
          end
        elsif event.content_block.type == 'text'
          Rails.logger.info("    TEXT block starting")
        elsif event.content_block.type == 'thinking'
          Rails.logger.info("    THINKING block starting")
        end
      end

      # Emit search_started only on first input delta for this search
      if event.type == 'content_block_delta'
        if event.delta.respond_to?(:input) && event.delta.input && current_search_id
          input_text = event.delta.input.to_s
          if input_text.length > 5 && !search_started_ids.include?(current_search_id)
            search_started_ids.add(current_search_id)

            # Infer category from input
            category = 'Federal Laws'
            category_map.each do |keyword, cat_name|
              if input_text.downcase.include?(keyword.downcase)
                category = cat_name
                break
              end
            end

            Rails.logger.info("  🔍 SEARCH_STARTED: category=#{category}, query=#{input_text[0..60]}")
            emit(:search_started, operation_id: operation_id, category: category, query: input_text, index: search_count, total: 6)
          end
        end
      end

      # Clear current_search_id on block end
      if event.type == 'content_block_stop'
        Rails.logger.info("  ← BLOCK STOP (index: #{event.index})")
        current_search_id = nil
      end

      # Emit token tracking
      if event.type == 'message_delta' && event.delta.respond_to?(:usage)
        input_tokens = event.delta.usage.input_tokens || 0
        output_tokens = event.delta.usage.output_tokens || 0
        Rails.logger.info("  📊 TOKENS: input=#{input_tokens}, output=#{output_tokens}")
        emit(:tokens, input_tokens: input_tokens, output_tokens: output_tokens, total_budget: 128000)
      end

      # Message start/stop
      if event.type == 'message_start'
        Rails.logger.info("  📨 MESSAGE_START: model=#{event.message.model if event.message.respond_to?(:model)}")
      end

      if event.type == 'message_stop'
        Rails.logger.info("  📨 MESSAGE_STOP: stop_reason=#{event.message.stop_reason if event.message.respond_to?(:stop_reason)}")
      end

      collector.add_event(event)
    end

    Rails.logger.info("\n" + "="*80)
    Rails.logger.info("STREAM SUMMARY:")
    Rails.logger.info("  Total events: #{event_count}")
    Rails.logger.info("  Content blocks: #{collector.content.length}")
    Rails.logger.info("  Web searches detected: #{search_count}")
    Rails.logger.info("="*80 + "\n")

    collector
  end

  private def log_event_details(event, count)
    case event.type
    when 'content_block_start'
      Rails.logger.info("▶ [Event ##{count}] CONTENT_BLOCK_START - type: #{event.content_block&.type}")
    when 'content_block_delta'
      delta_keys = []
      delta_keys << 'thinking' if event.delta.respond_to?(:thinking) && event.delta.thinking
      delta_keys << 'text' if event.delta.respond_to?(:text) && event.delta.text
      delta_keys << 'input' if event.delta.respond_to?(:input) && event.delta.input
      Rails.logger.info("▪ [Event ##{count}] CONTENT_BLOCK_DELTA - contains: #{delta_keys.join(', ')}")
    when 'content_block_stop'
      Rails.logger.info("◀ [Event ##{count}] CONTENT_BLOCK_STOP - index: #{event.index}")
    when 'message_start'
      Rails.logger.info("📬 [Event ##{count}] MESSAGE_START - model: #{event.message&.model}")
    when 'message_delta'
      Rails.logger.info("📊 [Event ##{count}] MESSAGE_DELTA - usage available: #{event.delta.respond_to?(:usage)}")
    when 'message_stop'
      Rails.logger.info("📭 [Event ##{count}] MESSAGE_STOP - stop_reason: #{event.message&.stop_reason}")
    else
      Rails.logger.info("? [Event ##{count}] #{event.type.upcase}")
    end
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
          {"title": "Law Name/Ref", "summary": "2-3 sentences", "source_url": "https://...", "date_effective": "YYYY-MM-DD"}
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
      - summary MUST be 2-3 sentences based on search results
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
        # Define web_search tool explicitly with native type
        web_search_tool = {
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 6
        }

        response = build_response_from_stream(
          current_operation_id,
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: {
            type: "adaptive"
          },
          tools: [web_search_tool],
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


  def build_user_prompt
    <<~PROMPT
      # Research Immigration Legislation for #{@country.name}

      ## CRITICAL REQUIREMENTS

      ❌ DO NOT generate fake data
      ❌ DO NOT return empty results
      ❌ DO NOT skip any of the 6 required searches
      ❌ DO NOT include generic or non-official law names
      ✅ YOU MUST use web_search to find real legislation
      ✅ YOU MUST execute searches for ALL 6 categories
      ✅ YOU MUST compile results into the exact JSON format below

      ## STEP 1: Execute Web Searches

      You WILL use web_search for EACH of these 6 categories. Execute searches in this order:

      1. **Federal Laws & Constitutional Provisions**
         Query: "#{@country.name} main immigration law constitution national"

      2. **Official Regulations & Procedures**
         Query: "#{@country.name} immigration ministry official regulations procedures"

      3. **Visa Requirements & Embassy Procedures**
         Query: "#{@country.name} visa requirements documents embassy consular"

      4. **Regional/Provincial Immigration Rules**
         Query: "#{@country.name} regional provincial immigration rules jurisdiction"

      5. **Health Requirements & Complementary Laws**
         Query: "#{@country.name} immigration health requirements vaccines medical"

      6. **Statistics, Quotas & Occupational Lists**
         Query: "#{@country.name} immigration statistics quotas occupation demand"

      For each search:
      - Use the suggested query or formulate a better one if needed
      - Wait for results
      - Extract laws with specific names, numbers, and dates
      - Record the source URL from search results

      ## STEP 2: Compile Results into JSON

      After completing ALL 6 searches, return ONLY this JSON (no other text before or after):

      {
        "federal_laws": [
          {"title": "Official Law Name/Reference (Year)", "summary": "2-3 sentence description", "source_url": "https://...", "date_effective": "YYYY-MM-DD"}
        ],
        "regulations": [
          {"title": "...", "summary": "...", "source_url": "...", "date_effective": "..."}
        ],
        "consular": [...],
        "jurisdictional": [...],
        "complementary": [...],
        "auxiliary": [...]
      }

      ## RULES

      - ONLY include laws actually found via web_search (verified sources)
      - Use EXACT official law names with reference numbers (e.g., "Lei 13.445/2017")
      - Include 1-3 quality entries per category (better few & good than many & generic)
      - Dates in YYYY-MM-DD format (use 2024-01-01 if exact date unknown)
      - source_url MUST be a real URL from search results
      - Reject generic titles like "Immigration Law" or "Regulations 2024"
      - Reject laws from other countries (verify country match)
      - Empty arrays only if NO legislation found for category
      - Return ONLY valid JSON, no explanations

      ## Existing Legislation to Avoid Duplicates

      Current database for #{@country.name}:
      #{@country.legislations.pluck(:title, :date_effective).map { |t, d| "- #{t} (#{d})" }.join("\n")}

      If you find the exact same title + same date = skip (duplicate)
      If you find same title + newer date = include as UPDATE
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
