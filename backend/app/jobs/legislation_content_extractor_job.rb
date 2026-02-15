class LegislationContentExtractorJob
  include Sidekiq::Job

  sidekiq_options queue: "extraction", retry: 3

  USER_AGENT = "Mozilla/5.0 (compatible; LegislationBot/1.0)".freeze
  MAX_REDIRECTS = 3
  TIMEOUT_SECONDS = 30

  def perform(legislation_id)
    legislation = Legislation.find_by(id: legislation_id)
    return if legislation.nil?

    legislation.update!(extraction_status: "processing")
    broadcast_update(legislation, "processing")

    content = fetch_and_extract(legislation.source_url)

    legislation.update!(
      content: content,
      extraction_status: "completed",
      last_extracted_at: Time.current
    )
    broadcast_update(legislation, "completed")

    LegislationTokenCountJob.perform_async(legislation.id)
  rescue StandardError => e
    Rails.logger.error("Extraction failed for legislation #{legislation_id}: #{e.class} - #{e.message}")
    legislation&.update(extraction_status: "failed")
    broadcast_update(legislation, "failed") if legislation
  end

  private

  def broadcast_update(legislation, status, token_count = nil)
    ActionCable.server.broadcast("extraction_progress", {
                                   type: "extraction_update",
                                   legislation_id: legislation.id,
                                   country_code: legislation.country.code,
                                   extraction_status: status,
                                   token_count: token_count
                                 })
  end

  def fetch_and_extract(url)
    response = fetch_with_redirects(url)
    content_type = response["content-type"].to_s

    if content_type.include?("application/pdf")
      extract_from_pdf(response.body)
    else
      extract_from_html(response.body)
    end
  end

  def fetch_with_redirects(url, limit = MAX_REDIRECTS, verify_ssl: true)
    raise "Too many redirects" if limit.zero?

    uri = URI.parse(url)
    http = Net::HTTP.new(uri.host, uri.port)
    http.use_ssl = (uri.scheme == "https")
    http.open_timeout = TIMEOUT_SECONDS
    http.read_timeout = TIMEOUT_SECONDS

    # Government sites often have broken CRL/certificate chains — fallback to no verification
    http.verify_mode = OpenSSL::SSL::VERIFY_NONE unless verify_ssl

    request = Net::HTTP::Get.new(uri)
    request["User-Agent"] = USER_AGENT

    response = http.request(request)

    if response.is_a?(Net::HTTPRedirection)
      fetch_with_redirects(response["location"], limit - 1, verify_ssl: verify_ssl)
    else
      response
    end
  rescue OpenSSL::SSL::SSLError => e
    raise e unless verify_ssl # already retried without SSL, give up

    Rails.logger.warn("SSL error for #{url}, retrying without verification: #{e.message}")
    fetch_with_redirects(url, limit, verify_ssl: false)
  end

  def extract_from_html(body)
    doc = Readability::Document.new(body)
    Nokogiri::HTML(doc.content).text.squeeze("\n").strip
  end

  def extract_from_pdf(body)
    io = StringIO.new(body)
    reader = PDF::Reader.new(io)
    reader.pages.map(&:text).join("\n").squeeze("\n").strip
  end
end
