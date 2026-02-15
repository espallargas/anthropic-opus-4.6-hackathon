module Agents
  class Base
    MODEL = "claude-opus-4-6".freeze
    MAX_TOKENS = 8_000

    attr_reader :tool_input, :system_vars, :sse

    def initialize(tool_input:, system_vars:, sse:)
      @tool_input = tool_input.is_a?(Hash) ? tool_input.deep_symbolize_keys : {}
      @system_vars = system_vars || {}
      @sse = sse
    end

    def call
      raise NotImplementedError, "#{self.class.name} must implement #call"
    end

    private

    def agent_name
      self.class.name.demodulize.underscore
    end

    def call_claude(system_prompt:, user_content:)
      client = Rails.application.config.x.anthropic
      text = ""
      input_tokens = 0
      output_tokens = 0

      stream = client.messages.stream(
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: system_prompt,
        messages: [{ role: "user", content: user_content }],
        thinking: { type: "adaptive" }
      )

      stream.each do |event|
        case event.type
        when :text
          text += event.text
          emit(:agent_token, agent_name: agent_name, token: event.text)
        when :message_stop
          usage = event.message.usage
          input_tokens = usage.input_tokens if usage.respond_to?(:input_tokens)
          output_tokens = usage.output_tokens if usage.respond_to?(:output_tokens)
        end
      end

      { text: text, input_tokens: input_tokens, output_tokens: output_tokens }
    end

    def legislation_context(country_code)
      return "No legislation data available." if country_code.blank?

      country = Country.find_by(code: country_code.to_s.upcase)
      return "No legislation data available." unless country

      legislations = country.legislations.where(is_deprecated: false).order(:category, :title)
      return "No legislation data available for #{country.name}." if legislations.empty?

      grouped = legislations.group_by(&:category)
      grouped.map do |category, laws|
        header = category.to_s.humanize.titleize
        items = laws.map { |l| "- #{l.title}: #{l.summary || l.content.to_s.truncate(200)}" }.join("\n")
        "## #{header}\n#{items}"
      end.join("\n\n")
    end

    def prompt
      @prompt ||= begin
        prompts = YAML.load_file(Rails.root.join("config/agent_prompts.yml"))
        prompts[agent_name] || {}
      end
    end

    def emit(type, **data)
      return unless sse

      message = { type: type.to_s, server_time: Time.current.iso8601(3), **data }
      sse.write(message)
    rescue ActionController::Live::ClientDisconnected
      raise
    rescue StandardError => e
      Rails.logger.error("[AGENT_EMIT] #{type}: #{e.class} - #{e.message}")
    end

    def extract_json(text)
      return nil if text.blank?

      JSON.parse(text)
    rescue JSON::ParserError
      match = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/m) || text.match(/(\{[\s\S]*\})/m)
      return nil unless match

      begin
        JSON.parse(match[1])
      rescue JSON::ParserError
        nil
      end
    end

    def language
      locale = system_vars[:locale] || system_vars["locale"] || "en"
      locale == "pt-BR" ? "Portuguese" : "English"
    end

    def destination_country
      tool_input[:destination_country] || tool_input[:country] || ""
    end
  end
end
