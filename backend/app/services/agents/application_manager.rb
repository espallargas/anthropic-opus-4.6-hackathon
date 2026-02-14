module Agents
  class ApplicationManager < Base
    def call
      country = destination_country
      pathway = tool_input[:pathway] || "general"
      legislation = legislation_context(country)

      user_content = build_user_content(country, pathway, legislation)
      system_prompt = prompt["system_prompt"]

      response = call_claude(system_prompt: system_prompt, user_content: user_content)
      data = extract_json(response[:text])

      {
        success: true,
        data: data || { notes: response[:text].truncate(500) },
        usage: { input_tokens: response[:input_tokens], output_tokens: response[:output_tokens] }
      }
    rescue StandardError => e
      Rails.logger.error("[APPLICATION_MANAGER] #{e.class} - #{e.message}")
      { success: false, error: e.message }
    end

    private

    def build_user_content(country, pathway, legislation)
      parts = ["Provide processing statistics for #{pathway} immigration to #{country}."]
      parts << "\n## Available Legislation Data\n#{legislation}"
      parts << "\nRespond in #{language}."
      parts.join("\n")
    end
  end
end
