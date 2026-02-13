#!/usr/bin/env ruby
require 'dotenv'
Dotenv.load

require 'anthropic'

api_key = ENV['ANTHROPIC_API_KEY']
client = Anthropic::Client.new

puts "Testing API with streaming enabled..."

start_time = Time.now

begin
  Timeout.timeout(60) do
    response = client.messages.create(
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      thinking: {
        type: 'adaptive'
      },
      stream: true,
      messages: [
        {
          role: 'user',
          content: 'What is 2+2?'
        }
      ]
    )
    
    # If stream is true, we get an enumerator
    puts "Got response stream, iterating..."
    count = 0
    response.each do |event|
      count += 1
      if count <= 5
        puts "Event #{count}: #{event.type}"
      end
    end
    
    elapsed = Time.now - start_time
    puts "✓ Streaming completed after #{elapsed.round(2)}s (#{count} events)"
  end
rescue Timeout::Error => e
  elapsed = Time.now - start_time
  puts "✗ Timeout after #{elapsed.round(2)}s"
rescue => e
  elapsed = Time.now - start_time
  puts "✗ Error after #{elapsed.round(2)}s: #{e.class} - #{e.message}"
end
