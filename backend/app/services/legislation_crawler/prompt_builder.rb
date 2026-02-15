module LegislationCrawler
  class PromptBuilder
    CATEGORIES = {
      "federal_laws" => "Federal Laws",
      "regulations" => "Regulations",
      "consular" => "Consular Rules",
      "jurisdictional" => "Jurisdictional",
      "complementary" => "Health & Complementary",
      "auxiliary" => "Auxiliary"
    }.freeze

    def self.category_ids    = CATEGORIES.keys
    def self.category_labels = CATEGORIES.values

    attr_reader :country

    def initialize(country)
      @country = country
    end

    def system_prompt(_crawl_type, existing_count)
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

    def user_prompt
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

    def legislation_schema
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

      category_properties = CATEGORIES.keys.each_with_object({}) do |key, hash|
        hash[key.to_sym] = { type: "array", items: legislation_item }
      end

      {
        type: "object",
        properties: category_properties,
        required: CATEGORIES.keys,
        additionalProperties: false
      }
    end
  end
end
