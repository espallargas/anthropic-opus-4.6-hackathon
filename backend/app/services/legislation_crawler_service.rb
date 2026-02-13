class LegislationCrawlerService
  MODEL = 'claude-opus-4-6'
  MAX_TOKENS = 16000  # Increased to accommodate thinking budget

  CATEGORIES = {
    federal_laws: "Federal Laws",
    regulations: "Regulations",
    consular: "Consular Rules",
    jurisdictional: "Jurisdictional Rules",
    complementary: "Health & Complementary",
    auxiliary: "Auxiliary Information"
  }.freeze

  SEARCH_QUERIES = {
    federal_laws: "main immigration law constitution",
    regulations: "immigration regulations ministry official",
    consular: "visa requirements documents embassies",
    jurisdictional: "regional immigration rules provinces",
    complementary: "health requirements vaccines medical",
    auxiliary: "immigration statistics occupation demand"
  }.freeze

  SEARCH_DESCRIPTIONS = {
    federal_laws: "main immigration laws and constitutional provisions",
    regulations: "official regulations and procedures",
    consular: "visa requirements and embassy procedures",
    jurisdictional: "regional and provincial immigration rules",
    complementary: "health requirements and complementary laws",
    auxiliary: "statistics, quotas and occupational lists"
  }.freeze

  def initialize(country, sse = nil)
    @country = country
    @sse = sse
    @client = Rails.application.config.x.anthropic
  end

  # Single unified emit method - type-safe with schema validation
  def emit(type, **data)
    begin
      message = ::SSEMessageSchema.format(type, data)
      @sse&.write(message)
    rescue StandardError => e
      Rails.logger.error("Emit error for type #{type}: #{e.class} - #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
      # Try to send error message anyway
      @sse&.write({ type: 'error', message: "Emit error: #{e.message}", timestamp: Time.current.iso8601(3) })
    end
  end

  def crawl
    emit(:phase, message: "Starting crawl for #{@country.name}")

    existing_count = @country.legislations.count
    crawl_type = @country.last_crawled_at.nil? ? "first_crawl" : "update_search"

    emit(:phase, message: "Crawl type: #{crawl_type}")
    emit(:phase, message: "Found #{existing_count} existing legislations")

    # Build system prompt
    system_prompt = build_system_prompt(crawl_type, existing_count)

    # Call Claude Opus 4.6 with web_search tool
    emit(:phase, message: "Invoking Claude Opus 4.6 to search legislation")
    results = call_claude_crawler(system_prompt)

    # Save results to database
    emit(:phase, message: "Saving results to database")
    save_results(results)

    @country.update!(last_crawled_at: Time.current)
    total_docs = results.values.sum { |docs| docs.is_a?(Array) ? docs.count : 0 }
    emit(:complete, message: "Crawl complete", document_count: total_docs)
  end

  private

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

    response = @client.messages.create(
      model: MODEL,
      max_tokens: MAX_TOKENS,
      thinking: {
        type: "adaptive"
      },
      system_: system_prompt,
      tools: Tools::Definitions::TOOLS,
      messages: messages
    )

    # Process tool use calls and continue conversation
    all_results = {}
    iteration = 0
    max_iterations = 3  # Reduced from 8 to prevent infinite loops with repetitive results
    web_search_count = 0
    max_web_searches = 6

    while iteration < max_iterations
      iteration += 1

      # Check if we got a stop reason
      if response.stop_reason == "end_turn"
        emit(:phase, message: "Search complete")
        break
      end

      # Process tool uses
      has_tool_use = false
      tool_results = []

      response.content.each do |block|
        if block.type == :tool_use
          has_tool_use = true
          tool_name = block.name

          if tool_name == "web_search"
            web_search_count += 1
            category = determine_category_from_input(block.input)
            category_label = SEARCH_DESCRIPTIONS[category] || "legislation"
            query = if block.input.is_a?(Hash)
              (block.input['query'] || block.input[:query])
            else
              block.input.to_s
            end

            if web_search_count > max_web_searches
              tool_result = { error: "Maximum web search limit reached (6)", results: [] }.to_json
            else
              emit(:search, count: web_search_count, total: max_web_searches, category: category_label, query: query)
              # Execute the tool
              tool_result = Tools::Executor.call(block.name, block.input)
            end
          else
            tool_result = Tools::Executor.call(block.name, block.input)
          end

          # Parse and collect results
          if block.name == "web_search"
            category = determine_category_from_input(block.input)
            category_label = SEARCH_DESCRIPTIONS[category] || "legislation"

            begin
              data = JSON.parse(tool_result)
              if data.is_a?(Hash) && data['results'] && data['results'].any?
                if category
                  all_results[category] = data
                  emit(:search_result, result_count: data['results'].length)
                elsif web_search_count <= max_web_searches
                  emit(:warning, message: 'Could not detect category from search')
                end
              end
            rescue JSON::ParserError
              emit(:error, message: 'Failed to parse web_search response')
            end
          end

          tool_results << {
            type: "tool_result",
            tool_use_id: block.id,
            content: tool_result
          }
        elsif block.type == :text
          if block.text.length > 0
            emit(:claude_text, text: block.text)
          end
        elsif block.type == :thinking
          thinking_text = block.thinking.to_s.strip
          Rails.logger.info("Got thinking block: #{thinking_text.length} chars")
          if thinking_text.length > 0
            Rails.logger.info("Emitting thinking block")
            emit(:thinking, text: thinking_text, is_summary: false)
          end
        end
      end

      # If no tool uses, we're done
      Rails.logger.info("Iteration #{iteration} - has_tool_use: #{has_tool_use}, response.stop_reason: #{response.stop_reason}")
      break unless has_tool_use

      # Continue conversation with tool results
      emit(:phase, message: "Analyzing results...")

      # Only include tool_use blocks in conversation, NOT thinking blocks
      # (thinking blocks are too large and not needed for next iteration)
      assistant_content = response.content.select { |block| block.type == :tool_use }
      if assistant_content.any?
        messages << { role: "assistant", content: assistant_content }
        messages << { role: "user", content: tool_results }
      end

      if iteration > 1
        emit(:phase, message: "Waiting for Claude to analyze results...")
      end
      start_time = Time.current

      begin
        response = @client.messages.create(
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: {
            type: "adaptive"
          },
          system_: system_prompt,
          tools: Tools::Definitions::TOOLS,
          messages: messages
        )
        elapsed = ((Time.current - start_time) * 1000).round
        Rails.logger.info("Claude responded in #{elapsed}ms (iteration #{iteration})")
        emit(:timing, message: "Claude responded", elapsed_ms: elapsed)
      rescue StandardError => e
        Rails.logger.error("Claude API error: #{e.class} - #{e.message}")
        emit(:error, message: "Claude error: #{e.message}")
        raise
      end
    end

    # Generate legislation from collected search results
    emit(:phase, message: "Processing search results")
    legislation_results = generate_legislation_from_searches(all_results)

    doc_count = legislation_results.values.sum { |v| v.is_a?(Array) ? v.count : 0 }
    emit(:phase, message: "Preparing database save", document_count: doc_count)

    legislation_results
  end

  def determine_category_from_input(input)
    # Extract query text
    query_text = if input.is_a?(Hash)
      (input[:query] || input['query']).to_s
    elsif input.respond_to?(:query)
      input.query.to_s
    elsif input.respond_to?(:[])
      (input[:query] || input['query']).to_s
    else
      input.to_s
    end

    query_lower = query_text.downcase

    # Match category by finding the search term from SEARCH_QUERIES in the query
    best_match = nil
    best_match_length = 0

    SEARCH_QUERIES.each do |category, search_term|
      search_lower = search_term.downcase
      if query_lower.include?(search_lower)
        if search_lower.length > best_match_length
          best_match = category
          best_match_length = search_lower.length
        end
      end
    end

    best_match
  end

  def build_user_prompt
    <<~PROMPT
      Your task: Use the web_search tool to find SPECIFIC immigration legislation for #{@country.name}.

      Focus on finding OFFICIAL LAW NAMES and REFERENCE NUMBERS (e.g., "Lei 13.445/2017" not "Official Legislation 2024").

      You MUST call the web_search tool 6 times, once for each category below:

      1. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:federal_laws]}"
      2. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:regulations]}"
      3. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:consular]}"
      4. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:jurisdictional]}"
      5. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:complementary]}"
      6. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:auxiliary]}"

      CRITICAL FILTERING RULES - REJECT generic/placeholder titles:
      ❌ REJECT titles like: "Official Legislation", "Regulations and Procedures", "2024 Updates", "Immigration Procedures"
      ❌ REJECT titles that start with just a dash "-" or are single words
      ❌ REJECT titles without a law number or specific name
      ✅ ACCEPT titles like: "Lei 13.445/2017", "Decreto 9.199/2017", "Resolution No. 123", "Constitutional Amendment 45/2019"

      If search results only contain generic placeholders, do NOT use them. Return empty results for that category instead.
      Better to have no results than misleading generic ones.

      IMPORTANT:
      - Search results should contain SPECIFIC law names and reference numbers
      - Do not accept generic results like "Official Legislation 2024"
      - Only use search results that include real law names with proper reference numbers
      - Make sure to use the web_search tool for each query. Do not skip any categories.
      - Prefer results with: year/number, official source, and descriptive title
    PROMPT
  end

  def generate_legislation_from_searches(search_results)
    results = {}

    search_results.each do |category, json_or_hash|
      results[category] = []

      begin
        # Handle both JSON string and Hash responses
        data = if json_or_hash.is_a?(String)
          JSON.parse(json_or_hash)
        else
          json_or_hash
        end

        results_array = data.is_a?(Hash) ? data['results'] || data['data'] || [] : data

        results_array.each_with_index do |item, idx|
          # Use the title from search result directly
          title = item['title'].to_s.strip

          # Skip very generic/placeholder titles
          if title.blank? || title =~ /^\d+$/ ||
             title =~ /^(Official|Legislation|Procedure|Regulations|Updates|Rules|Immigration|Law|Document)/i ||
             title =~ /^-\s/ ||
             title =~ /^\w+\s+(1|2|3|4|5|6)$/
            next
          end

          results[category] << {
            title: title,
            content: "#{item['snippet'] || item['description']}\n\nSource: #{item['url']}",
            summary: item['snippet'] || item['description'],
            source_url: item['url'],
            date_effective: parse_date(item['date']),
            is_deprecated: false,
            deprecation_notice: nil
          }
        end
      rescue JSON::ParserError, TypeError, NoMethodError => e
        # If parsing fails, continue
      end
    end

    results
  end

  def build_extraction_prompt(search_results)
    prompt = "Extract immigration legislation for #{@country.name} from these search results.\n\n"

    search_results.each do |category, results|
      prompt += "**#{CATEGORIES[category]}**\n"
      prompt += "#{results}\n\n"
    end

    prompt += <<~TEXT
      Based on these search results, return ONLY valid JSON (no other text) with extracted legislation in this format:
      {
        "federal_laws": [{"title": "...", "summary": "...", "source_url": "...", "date_effective": "...", "is_deprecated": false}],
        "regulations": [...],
        "consular": [...],
        "jurisdictional": [...],
        "complementary": [...],
        "auxiliary": [...]
      }
    TEXT

    prompt
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

    # Insert new legislations
    Legislation.insert_all(legislations_to_insert) if legislations_to_insert.any?

    # Update existing with new versions
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
  end
end
