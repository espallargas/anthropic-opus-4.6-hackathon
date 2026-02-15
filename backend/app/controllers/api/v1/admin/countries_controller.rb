module Api
  module V1
    module Admin
      class CountriesController < ApplicationController
        def index
          active = Country
                   .where.not(last_crawled_at: nil)
                   .order(:name)

          pending = Country
                    .where(last_crawled_at: nil)
                    .order(:name)

          render json: {
            active: format_countries(active),
            pending: format_countries(pending)
          }
        end

        def show
          country = Country.find_by!(code: params[:code])

          # Fetch all legislations grouped by category using database
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

          # Format for JSON response - category comes as string from enum
          formatted_legislations = legislations.transform_values do |laws|
            laws.map { |law| format_legislation(law) }
          end

          render json: { legislations: formatted_legislations, extraction_stats: extraction_stats }
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

            all_legs = country.legislations
            extracted_count = all_legs.where(extraction_status: "completed").count
            total_count = all_legs.count

            {
              code: country.code,
              name: country.name,
              flag_emoji: country.flag_emoji,
              status: status,
              last_crawled_at: country.last_crawled_at,
              legislation_count: total_count,
              extraction_completed: extracted_count,
              extraction_processing: all_legs.where(extraction_status: "processing").count
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
