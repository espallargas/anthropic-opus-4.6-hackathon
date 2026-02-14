module Api
  module V1
    class CountriesController < ApplicationController
      def index
        # Use database ORDER BY instead of Ruby sort
        countries = Country
                    .select(:code, :name, :flag_emoji)
                    .order(:name)

        render json: countries
      end
    end
  end
end
