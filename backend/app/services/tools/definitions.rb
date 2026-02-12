module Tools
  module Definitions
    TOOLS = [
      {
        name: 'search_visa_requirements',
        description: 'Search for visa requirements between two countries. Returns required documents, eligibility criteria, and application steps.',
        input_schema: {
          type: 'object',
          properties: {
            origin: { type: 'string', description: 'Country of origin or nationality' },
            destination: { type: 'string', description: 'Destination country' },
            visa_type: { type: 'string', description: 'Type of visa (e.g. work, student, tourist, residence)' }
          },
          required: %w[origin destination visa_type]
        }
      },
      {
        name: 'check_processing_times',
        description: 'Check current visa processing times for a specific destination and visa type. Returns estimated timelines and expedite options.',
        input_schema: {
          type: 'object',
          properties: {
            destination: { type: 'string', description: 'Destination country' },
            visa_type: { type: 'string', description: 'Type of visa (e.g. work, student, tourist, residence)' }
          },
          required: %w[destination visa_type]
        }
      }
    ].freeze
  end
end
