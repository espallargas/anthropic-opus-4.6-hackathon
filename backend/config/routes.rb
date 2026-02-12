Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      get "health", to: "health#show"
      post "chat", to: "chat#create"
    end
  end

  root "fallback#index"
  get "*path", to: "fallback#index", constraints: ->(req) {
    !req.path.start_with?("/api", "/cable", "/up")
  }
end
