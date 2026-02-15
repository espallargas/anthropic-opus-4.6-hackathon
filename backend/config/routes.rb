require "sidekiq/web"

# Sidekiq::Web needs sessions for CSRF — API-only apps don't include session middleware
Sidekiq::Web.use ActionDispatch::Cookies
Sidekiq::Web.use ActionDispatch::Session::CookieStore, key: "_sidekiq_session"

Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  mount Sidekiq::Web => "/sidekiq"

  namespace :api do
    namespace :v1 do
      get "health", to: "health#show"
      post "chat", to: "chat#create"
      resources :countries, only: [:index]

      namespace :admin do
        get "countries", to: "countries#index"
        get "countries/:code", to: "countries#show"
        post "crawl/:code", to: "crawl#create"
      end
    end
  end

  root "fallback#index"
  get "*path", to: "fallback#index", constraints: lambda { |req|
    !req.path.start_with?("/api", "/cable", "/up", "/sidekiq")
  }
end
