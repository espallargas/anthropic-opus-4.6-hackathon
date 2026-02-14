module Api
  module V1
    module Admin
      class CountriesController < ApplicationController
        include ActionController::Live

        def index
          # Use raw SQL for better performance - avoids N+1 queries and left joins
          result = ActiveRecord::Base.connection.execute(<<~SQL)
            SELECT
              countries.id,
              countries.code,
              countries.name,
              countries.flag_emoji,
              countries.last_crawled_at,
              COUNT(legislations.id) as legislation_count
            FROM countries
            LEFT JOIN legislations ON countries.id = legislations.country_id
            GROUP BY countries.id, countries.code, countries.name, countries.flag_emoji, countries.last_crawled_at
            ORDER BY countries.name ASC
          SQL

          active_rows = []
          pending_rows = []

          result.each do |row|
            formatted = {
              code: row['code'],
              name: row['name'],
              flag_emoji: row['flag_emoji'],
              last_crawled_at: row['last_crawled_at'],
              legislation_count: row['legislation_count'].to_i,
              status: calculate_status(row['last_crawled_at'])
            }

            row['last_crawled_at'].nil? ? pending_rows << formatted : active_rows << formatted
          end

          render json: {
            active: active_rows,
            pending: pending_rows
          }
        end

        def show
          country = Country.find_by!(code: params[:code])

          # Fetch all legislations grouped by category using database
          legislations = country.legislations
                                .select(:id, :category, :title, :content, :summary, :source_url,
                                        :date_effective, :is_deprecated, :replaced_by_id, :crawled_at)
                                .order(:category, :title)
                                .group_by(&:category)

          # Format for JSON response - category comes as string from enum
          formatted_legislations = legislations.transform_values do |laws|
            laws.map { |law| format_legislation(law) }
          end

          render json: { legislations: formatted_legislations }
        end

        def crawl
          response.headers["Content-Type"] = "text/event-stream"
          response.headers["Cache-Control"] = "no-cache"
          response.headers["X-Accel-Buffering"] = "no"

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

        def calculate_status(last_crawled_at)
          if last_crawled_at.nil?
            "red"
          elsif last_crawled_at < 1.week.ago
            "yellow"
          else
            "green"
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
