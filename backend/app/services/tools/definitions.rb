module Tools
  class Definitions
    TOOLS = [
      {
        name: 'web_search',
        description: 'Search the web for immigration legislation and requirements. Returns search results with titles, snippets, and URLs.',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query for finding legislation or immigration information'
            }
          },
          required: ['query']
        }
      }
    ].freeze
  end
end
