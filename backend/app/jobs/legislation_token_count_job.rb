class LegislationTokenCountJob
  include Sidekiq::Job

  sidekiq_options queue: "long_io", retry: 3

  def perform(legislation_id)
    legislation = Legislation.find_by(id: legislation_id)
    return if legislation.nil? || legislation.content.blank?

    client = Rails.application.config.x.anthropic
    result = client.messages.count_tokens(
      model: "claude-sonnet-4-5-20250929",
      messages: [{ role: "user", content: legislation.content }]
    )

    legislation.update!(token_count: result.input_tokens)
    broadcast_update(legislation, result.input_tokens)
  rescue StandardError => e
    Rails.logger.warn("Token count failed for legislation #{legislation_id}: #{e.message}")
  end

  private

  def broadcast_update(legislation, token_count)
    ActionCable.server.broadcast("extraction_progress", {
                                   type: "extraction_update",
                                   legislation_id: legislation.id,
                                   country_code: legislation.country.code,
                                   extraction_status: "completed",
                                   token_count: token_count
                                 })
  end
end
