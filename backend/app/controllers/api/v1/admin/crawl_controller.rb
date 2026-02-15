module Api
  module V1
    module Admin
      class CrawlController < ApplicationController
        include ActionController::Live

        def create
          response.headers["Content-Type"] = "text/event-stream"
          response.headers["Cache-Control"] = "no-cache"
          response.headers["X-Accel-Buffering"] = "no"

          sse = ActionController::Live::SSE.new(response.stream)
          country = Country.find_by!(code: params[:code])

          Rails.logger.info("Starting crawl for #{country.name}")
          LegislationCrawler::Service.new(country, sse).crawl
          Rails.logger.info("Crawl finished for #{country.name}")
        rescue ActionController::Live::ClientDisconnected
          Rails.logger.info("Crawl stopped: client disconnected for #{country&.name}")
        rescue StandardError => e
          Rails.logger.error("Crawl SSE error: #{e.class} - #{e.message}")
          Rails.logger.error(e.backtrace.first(10).join("\n"))
          begin
            sse&.write(::SSEMessageSchema.format(:error, message: e.message))
          rescue StandardError => write_error
            Rails.logger.error("Failed to write error to SSE: #{write_error.message}")
          end
        ensure
          sse&.close
        end
      end
    end
  end
end
