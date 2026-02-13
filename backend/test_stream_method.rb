#!/usr/bin/env ruby
require 'dotenv'
Dotenv.load

require 'anthropic'

api_key = ENV['ANTHROPIC_API_KEY']
client = Anthropic::Client.new

puts "Testing API with .stream method..."

start_time = Time.now

begin
  Timeout.timeout(60) do
    client.messages.stream(
      model: 'claude-opus-4-6',
      max_tokens: 16000,
      thinking: {
        type: 'adaptive'
      },
      messages: [
        {
          role: 'user',
          content: 'What is 2+2?'
        }
      ]
    ) do |event|
      if event.type == 'content_block_start'
        puts "Content block start: #{event.content_block.type}"
      elsif event.type == 'content_block_delta'
        puts "Delta: #{event.delta.type if event.delta.respond_to?(:type)}"
      elsif event.type == 'content_block_stop'
        puts "Content block stop"
      end
    end
    
    elapsed = Time.now - start_time
    puts "✓ Streaming completed after #{elapsed.round(2)}s"
  end
rescue Timeout::Error => e
  elapsed = Time.now - start_time
  puts "✗ Timeout after #{elapsed.round(2)}s"
rescue => e
  elapsed = Time.now - start_time
  puts "✗ Error after #{elapsed.round(2)}s: #{e.class} - #{e.message}"
  puts e.backtrace.first(3)
end
