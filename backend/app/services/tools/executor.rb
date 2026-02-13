require 'net/http'
require 'json'

module Tools
  class Executor
    def self.call(tool_name, input)
      case tool_name
      when 'web_search'
        query = if input.is_a?(Hash)
          input['query']
        elsif input.respond_to?(:query)
          input.query
        elsif input.respond_to?(:[])
          input[:query] || input['query']
        end

        web_search(query.to_s)
      else
        { error: "Unknown tool: #{tool_name}" }.to_json
      end
    end

    private

    def self.web_search(query)
      # Mock web search - in production would use SerpAPI, Google Search API, etc.
      results = mock_search_results(query)
      {
        query: query,
        results: results,
        status: "success"
      }.to_json
    end

    def self.mock_search_results(query)
      # Return mock search results that simulate real web search
      # In production, this would use real web search API (SerpAPI, Google Search, Bing, etc.)

      query_lower = query.downcase

      # Generic mock results - Claude will filter by country from its own knowledge
      # We return results that look like search engine output
      generic_results = [
        {
          title: "Immigration Law and Regulations",
          snippet: "Learn about immigration laws, visa requirements, and citizenship procedures.",
          url: "https://example.com/immigration-laws",
          type: "legislation",
          date: "2024-01-15"
        },
        {
          title: "Official Government Immigration Portal",
          snippet: "Official government resources for immigration processes and documentation requirements.",
          url: "https://example.com/gov-immigration",
          type: "legislation",
          date: "2024-02-01"
        },
        {
          title: "Immigration Regulations and Procedures",
          snippet: "Current regulations, procedures, and official guidelines for immigration and visa applications.",
          url: "https://example.com/immigration-regulations",
          type: "legislation",
          date: "2024-01-20"
        }
      ]

      # Return generic results - Claude will interpret these based on the query context
      generic_results.take(3).map do |result|
        {
          title: result[:title],
          snippet: result[:snippet],
          url: result[:url],
          type: result[:type],
          date: result[:date]
        }
      end
    end
  end
end
