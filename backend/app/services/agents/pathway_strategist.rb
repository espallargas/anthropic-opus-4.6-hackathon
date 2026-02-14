module Agents
  class PathwayStrategist < Base
    def call
      country = destination_country
      objective = tool_input[:objective] || "general immigration"
      profile = tool_input[:profile]
      legislation = legislation_context(country)

      user_content = build_user_content(country, objective, profile, legislation)
      system_prompt = prompt["system_prompt"]

      response = call_claude(system_prompt: system_prompt, user_content: user_content)
      data = extract_json(response[:text])

      {
        success: true,
        data: data || { pathways: [], note: response[:text].truncate(500) },
        usage: { input_tokens: response[:input_tokens], output_tokens: response[:output_tokens] }
      }
    rescue StandardError => e
      Rails.logger.error("[PATHWAY_STRATEGIST] #{e.class} - #{e.message}")
      { success: false, error: e.message }
    end

    private

    def build_user_content(country, objective, profile, legislation)
      parts = ["Analyze immigration pathways for #{country}."]
      parts << "Objective: #{objective}"
      parts << "Profile: #{profile.to_json}" if profile.present?
      parts << "\n## Available Legislation Data\n#{legislation}"
      parts << "\nRespond in #{language}."
      parts.join("\n")
    end
  end
end
