module Api
  module V1
    module Admin
      class CountriesController < ApplicationController
        include ActionController::Live

        def index
          # Query using SQL to calculate status directly in database
          active = Country
            .select("countries.*, COUNT(legislations.id) as legislation_count")
            .left_joins(:legislations)
            .where("last_crawled_at IS NOT NULL")
            .order(:name)
            .group("countries.id")

          pending = Country
            .select("countries.*, COUNT(legislations.id) as legislation_count")
            .left_joins(:legislations)
            .where("last_crawled_at IS NULL")
            .order(:name)
            .group("countries.id")

          render json: {
            active: format_countries(active),
            pending: format_countries(pending)
          }
        end

        def show
          country = Country.find_by!(code: params[:code])

          # Fetch all legislations grouped by category using database
          legislations = country.legislations
            .select(:id, :category, :title, :content, :summary, :source_url, :date_effective, :is_deprecated, :replaced_by_id, :crawled_at)
            .order(:category, :title)
            .group_by(&:category)

          # Format for JSON response - category comes as string from enum
          formatted_legislations = legislations.transform_values do |laws|
            laws.map { |law| format_legislation(law) }
          end

          render json: { legislations: formatted_legislations }
        end

        def crawl
          response.headers['Content-Type'] = 'text/event-stream'
          response.headers['Cache-Control'] = 'no-cache'
          response.headers['X-Accel-Buffering'] = 'no'

          sse = ActionController::Live::SSE.new(response.stream)
          country = Country.find_by!(code: params[:code])

          Rails.logger.info("Starting crawl for #{country.name}")
          LegislationCrawlerService.new(country, sse).crawl
          Rails.logger.info("Crawl finished for #{country.name}")
        rescue ActionController::Live::ClientDisconnected
          # Client disconnected - expected when user stops crawl
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

        private

        def format_countries(countries)
          countries.map do |country|
            status = if country.last_crawled_at.nil?
              "red"
            elsif country.last_crawled_at < 1.week.ago
              "yellow"
            else
              "green"
            end

            {
              code: country.code,
              name: country.name,
              flag_emoji: country.flag_emoji,
              status: status,
              last_crawled_at: country.last_crawled_at,
              legislation_count: country.legislation_count.to_i
            }
          end
        end

        def format_legislation(legislation)
          {
            id: legislation.id,
            title: legislation.title,
            category: legislation.category,
            content: legislation.content,
            summary: legislation.summary,
            source_url: legislation.source_url,
            date_effective: legislation.date_effective,
            is_deprecated: legislation.is_deprecated,
            replaced_by_id: legislation.replaced_by_id,
            crawled_at: legislation.crawled_at
          }
        end
      end
    end
  end
end
