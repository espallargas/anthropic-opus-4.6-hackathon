# Unified SSE message schema for crawler and chat services
# All SSE messages follow this contract - frontend registry handlers match types

module SSEMessageSchema
  # Define all message types with their fields
  TYPES = {
    # Progress lifecycle
    phase: { fields: [:message], required_fields: [:message] },

    # Web search execution (hierarchical with operation_id)
    search_started: { fields: [:operation_id, :category, :query, :index, :total], required_fields: [:operation_id, :query] },
    search_result: { fields: [:operation_id, :category, :result_count], required_fields: [:result_count] },
    search: { fields: [:count, :total, :category, :query], required_fields: [:count, :total, :query] },

    # Claude thinking (structured for UI rendering, linked via operation_id)
    thinking: { fields: [:text, :is_summary, :operation_id], required_fields: [:text] },

    # Claude response text
    claude_text: { fields: [:text], required_fields: [:text] },

    # Metadata and diagnostics
    timing: { fields: [:message, :elapsed_ms], required_fields: [:message] },
    tokens: { fields: [:input_tokens, :output_tokens, :total_budget], required_fields: [:input_tokens, :output_tokens] },
    debug: { fields: [:block_type], required_fields: [] },

    # Status updates
    warning: { fields: [:message], required_fields: [:message] },

    # Real-time document count updates
    batch_saved: { fields: [:total_saved], required_fields: [:total_saved] },

    # Error handling
    error: { fields: [:message, :code], required_fields: [:message] },

    # Completion
    complete: { fields: [:message, :document_count], required_fields: [:message] }
  }.freeze

  # Validate message against schema
  def self.validate(type, data)
    schema = TYPES[type.to_sym]
    raise ArgumentError, "Unknown message type: #{type}" unless schema

    # Check required fields
    schema[:required_fields].each do |field|
      raise ArgumentError, "Missing required field '#{field}' for message type '#{type}'" unless data.key?(field)
    end

    # Warn about unknown fields (but don't error)
    data.each_key do |field|
      unless schema[:fields].include?(field)
        Rails.logger.warn("Unknown field '#{field}' for message type '#{type}'")
      end
    end

    true
  end

  # Format message for SSE transport
  def self.format(type, data)
    validate(type, data)
    {
      type: type.to_s,
      timestamp: Time.current.iso8601(3),
      **data
    }
  end
end
