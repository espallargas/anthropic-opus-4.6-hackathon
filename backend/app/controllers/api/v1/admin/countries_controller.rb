module Api
  module V1
    module Admin
      class CountriesController < ApplicationController
        def index
          stats = legislation_stats_by_country

          active = Country.where.not(last_crawled_at: nil).order(:name)
          pending = Country.where(last_crawled_at: nil).order(:name)

          render json: {
            active: format_countries(active, stats),
            pending: format_countries(pending, stats)
          }
        end

        def show
          country = Country.find_by!(code: params[:code])

          legislations = country.legislations
                                .select(:id, :category, :title, :content, :summary, :source_url,
                                        :date_effective, :is_deprecated, :replaced_by_id, :crawled_at,
                                        :extraction_status)
                                .order(:category, :title)
                                .group_by(&:category)

          all_legislations = legislations.values.flatten
          extraction_stats = {
            total: all_legislations.size,
            completed: all_legislations.count { |l| l.extraction_status == "completed" },
            pending: all_legislations.count { |l| l.extraction_status == "pending" },
            processing: all_legislations.count { |l| l.extraction_status == "processing" },
            failed: all_legislations.count { |l| l.extraction_status == "failed" }
          }

          formatted_legislations = legislations.transform_values do |laws|
            laws.map { |law| format_legislation(law) }
          end

          render json: { legislations: formatted_legislations, extraction_stats: extraction_stats }
        end

        private

        def legislation_stats_by_country
          rows = Legislation.group(:country_id).select(
            :country_id,
            "COUNT(*) AS total_count",
            "COUNT(*) FILTER (WHERE extraction_status = 'completed') AS completed_count",
            "COUNT(*) FILTER (WHERE extraction_status = 'processing') AS processing_count",
            "SUM(CASE WHEN extraction_status = 'completed' THEN LENGTH(COALESCE(content, '')) ELSE 0 END) AS content_size",
            "COALESCE(SUM(token_count), 0) AS total_tokens"
          )

          rows.each_with_object({}) do |row, hash|
            hash[row.country_id] = {
              total: row[:total_count].to_i,
              completed: row[:completed_count].to_i,
              processing: row[:processing_count].to_i,
              content_size: row[:content_size].to_i,
              tokens: row[:total_tokens].to_i
            }
          end
        end

        def format_countries(countries, stats)
          countries.map do |country|
            s = stats[country.id] || { total: 0, completed: 0, processing: 0, content_size: 0, tokens: 0 }

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
              legislation_count: s[:total],
              extraction_completed: s[:completed],
              extraction_processing: s[:processing],
              content_size: s[:content_size],
              token_count: s[:tokens]
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
            crawled_at: legislation.crawled_at,
            extraction_status: legislation.extraction_status
          }
        end
      end
    end
  end
end
