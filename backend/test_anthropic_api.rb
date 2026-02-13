#!/usr/bin/env ruby
require 'dotenv'
Dotenv.load

require 'anthropic'

api_key = ENV['ANTHROPIC_API_KEY']
puts "API Key present: #{!api_key.nil?}"
puts "API Key length: #{api_key.length}"

client = Anthropic::Client.new

puts "Testing Claude API connection..."
start_time = Time.now

begin
  response = client.messages.create(
    model: 'claude-opus-4-6',
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: 'Say "hello" in one word only.'
      }
    ]
  )
  
  elapsed = Time.now - start_time
  puts "✓ API call succeeded in #{elapsed.round(2)}s"
  puts "Response: #{response.content.first.text}"
rescue => e
  elapsed = Time.now - start_time
  puts "✗ API call failed after #{elapsed.round(2)}s"
  puts "Error: #{e.class} - #{e.message}"
  puts e.backtrace.first(5)
end
