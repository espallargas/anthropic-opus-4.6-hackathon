module Agents
  class EligibilityAnalyst < Base
    def call
      country = destination_country
      program = tool_input[:program]
      profile = tool_input[:profile]
      legislation = legislation_context(country)

      user_content = build_user_content(country, program, profile, legislation)
      system_prompt = prompt["system_prompt"]

      response = call_claude(system_prompt: system_prompt, user_content: user_content)
      data = extract_json(response[:text])

      {
        success: true,
        data: data || { eligible: nil, notes: response[:text].truncate(500) },
        usage: { input_tokens: response[:input_tokens], output_tokens: response[:output_tokens] }
      }
    rescue StandardError => e
      Rails.logger.error("[ELIGIBILITY_ANALYST] #{e.class} - #{e.message}")
      { success: false, error: e.message }
    end

    private

    def build_user_content(country, program, profile, legislation)
      parts = ["Assess immigration eligibility for #{country}."]
      parts << "Program: #{program}" if program.present?
      parts << "Profile: #{profile.to_json}" if profile.present?
      parts << "\n## Available Legislation Data\n#{legislation}"
      parts << "\nRespond in #{language}."
      parts.join("\n")
    end
  end
end
