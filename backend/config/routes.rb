require "sidekiq/web"

# Rails API-only apps don't include session middleware by default.
# Official Sidekiq recommendation: use ActionDispatch middlewares scoped to Sidekiq::Web.
Sidekiq::Web.use ActionDispatch::Cookies
Sidekiq::Web.use ActionDispatch::Session::CookieStore, key: "_sidekiq_session"

Sidekiq::Web.use Rack::Auth::Basic do |username, password|
  username == ENV.fetch("SIDEKIQ_USERNAME", "admin") &&
    password == ENV.fetch("SIDEKIQ_PASSWORD", "password")
end

Rails.application.routes.draw do
  mount Sidekiq::Web => "/sidekiq"

  get "up" => "rails/health#show", as: :rails_health_check

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
