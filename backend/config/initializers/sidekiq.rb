redis_url = ENV.fetch("REDIS_URL", "redis://localhost:6379/1")

Sidekiq.configure_server do |config|
  config.redis = { url: redis_url }

  config.capsule("long_io") do |cap|
    cap.concurrency = 1
    cap.queues = %w[long_io]
  end
end

Sidekiq.configure_client do |config|
  config.redis = { url: redis_url }
end
