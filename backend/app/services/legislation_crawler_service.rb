class LegislationCrawlerService
  MODEL = 'claude-opus-4-6'
  MAX_TOKENS = 4096

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

  def initialize(country, sse = nil)
    @country = country
    @sse = sse
    @client = Rails.application.config.x.anthropic
  end

  def crawl
    emit("Starting crawl for #{@country.name}...")

    existing_count = @country.legislations.count
    crawl_type = @country.last_crawled_at.nil? ? "first_crawl" : "update_search"

    emit("Crawl type: #{crawl_type}")
    emit("Found #{existing_count} existing legislations")

    # Build system prompt
    system_prompt = build_system_prompt(crawl_type, existing_count)

    # Call Claude Opus 4.6 with web_search tool
    emit("Initiating Claude Opus 4.6 crawl...")
    results = call_claude_crawler(system_prompt)

    # Save results to database
    save_results(results)

    @country.update!(last_crawled_at: Time.current)
    emit("✓ Crawl complete: #{results.values.sum { |docs| docs.count }} documents stored")
  end

  private

  def build_system_prompt(crawl_type, existing_count)
    existing_list = if existing_count > 0
      @country.legislations
        .select(:title, :date_effective)
        .order(:title)
        .map { |l| "- #{l.title} (#{l.date_effective})" }
        .join("\n")
    else
      "None"
    end

    <<~PROMPT
      You are a legislation researcher specializing in immigration law for #{@country.name}.

      Your task: Search for immigration legislation organized by category, then return structured JSON.

      STEP 1: Search for legislation
      Use web_search to find information for EACH of these 6 categories:
      - federal_laws: Main immigration laws and constitutional provisions
      - regulations: Official immigration procedures and ministry regulations
      - consular: Visa requirements and embassy procedures
      - jurisdictional: Regional or provincial immigration rules
      - complementary: Health requirements and complementary laws
      - auxiliary: Statistics, quotas, and occupational lists

      For each search, look for:
      - Official law titles and reference numbers
      - Effective dates and recent updates
      - Summary of key requirements
      - Official sources and URLs

      STEP 2: Build JSON response
      After searching, compile ALL results into this exact JSON format (no other text):

      {
        "federal_laws": [
          {"title": "Law name", "summary": "2-3 sentence summary", "source_url": "https://...", "date_effective": "YYYY-MM-DD", "is_deprecated": false}
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
      - Use real URLs from search results
      - Dates should be YYYY-MM-DD format
      - Set is_deprecated: false for all entries unless new law supersedes older one
    PROMPT
  end

  def call_claude_crawler(system_prompt)
    emit("🔍 Invoking Claude Opus 4.6 with tool_use...")

    messages = [
      {
        role: "user",
        content: build_user_prompt
      }
    ]

    response = @client.messages.create(
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system_: system_prompt,
      tools: Tools::Definitions::TOOLS,
      messages: messages
    )

    # Process tool use calls and continue conversation
    all_results = {}
    iteration = 0
    max_iterations = 10

    while iteration < max_iterations
      iteration += 1

      # Check if we got a stop reason
      if response.stop_reason == "end_turn"
        emit("✓ Claude completed search")
        break
      end

      # Process tool uses
      has_tool_use = false
      tool_results = []

      response.content.each do |block|
        if block.type == :tool_use
          has_tool_use = true
          emit("🔎 Claude called: #{block.name}")

          # Execute the tool
          tool_result = Tools::Executor.call(block.name, block.input)

          # Parse and collect results
          if block.name == "web_search"
            emit("  Searching for: #{block.input}")
            category = determine_category_from_input(block.input)
            begin
              data = JSON.parse(tool_result)
              if data.is_a?(Hash) && data['results']
                all_results[category] = data if category
                emit("  ✓ Category: #{category}, Found #{data['results'].length} results")
              else
                emit("  No results in response")
              end
            rescue JSON::ParserError => e
              emit("  ⚠ Parse error: #{e.message[0..50]}")
            end
          end

          tool_results << {
            type: "tool_result",
            tool_use_id: block.id,
            content: tool_result
          }
        elsif block.type == :text
          emit("📝 Claude: #{block.text[0..50]}...")
        end
      end

      # If no tool uses, we're done
      break unless has_tool_use

      # Continue conversation with tool results
      messages << { role: "assistant", content: response.content }
      messages << { role: "user", content: tool_results }

      response = @client.messages.create(
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system_: system_prompt,
        tools: Tools::Definitions::TOOLS,
        messages: messages
      )
    end

    # Generate legislation from collected search results
    emit("🔄 Processing search results...")
    legislation_results = generate_legislation_from_searches(all_results)

    doc_count = legislation_results.values.sum { |v| v.is_a?(Array) ? v.count : 0 }
    emit("✓ Processed #{doc_count} documents from search results")

    legislation_results
  end

  def determine_category_from_input(input)
    # Handle both Hash and object responses from Anthropic
    query_text = if input.is_a?(Hash)
      input['query'].to_s
    elsif input.respond_to?(:query)
      input.query.to_s
    elsif input.respond_to?(:[])
      (input[:query] || input['query']).to_s
    else
      input.to_s
    end

    query_lower = query_text.downcase

    # Match category by finding the search term from SEARCH_QUERIES in the query
    # Returns the first category that matches
    best_match = nil
    best_match_length = 0

    SEARCH_QUERIES.each do |category, search_term|
      search_lower = search_term.downcase
      # Check if the search term appears as consecutive words in the query
      if query_lower.include?(search_lower)
        # Prefer longer matches (more specific)
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
      Your task: Use the web_search tool to find immigration legislation for #{@country.name}.

      You MUST call the web_search tool 6 times, once for each category below:

      1. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:federal_laws]}"
      2. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:regulations]}"
      3. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:consular]}"
      4. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:jurisdictional]}"
      5. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:complementary]}"
      6. Call web_search with query: "#{@country.name} #{SEARCH_QUERIES[:auxiliary]}"

      Make sure to use the web_search tool for each query. Do not skip any categories.
    PROMPT
  end

  def generate_legislation_from_searches(search_results)
    results = {}

    search_results.each do |category, json_results|
      results[category] = []

      begin
        data = JSON.parse(json_results)
        results_array = data.is_a?(Hash) ? data['results'] : data

        results_array.each_with_index do |item, idx|
          results[category] << {
            title: "#{CATEGORIES[category]} #{idx + 1}: #{item['title']}",
            content: "#{item['snippet'] || item['description']}\n\nSource: #{item['url']}",
            summary: item['snippet'] || item['description'],
            source_url: item['url'],
            date_effective: parse_date(item['date']),
            is_deprecated: false,
            deprecation_notice: nil
          }
        end
      rescue JSON::ParserError, TypeError
        # If parsing fails, create placeholder
        emit("⚠ Could not parse results for #{CATEGORIES[category]}")
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

    results.each do |category, documents|
      documents.each do |doc|
        emit("📝 Saving: #{doc[:title]}")

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

    Legislation.insert_all(legislations_to_insert) if legislations_to_insert.any?
  end

  def emit(message)
    return unless @sse.present?

    @sse.write({
      type: 'crawl_progress',
      message: message,
      server_time: Time.current.iso8601(3)
    })
  end
end
