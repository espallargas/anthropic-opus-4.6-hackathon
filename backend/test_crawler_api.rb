#!/usr/bin/env ruby
require 'dotenv'
Dotenv.load

require 'anthropic'

api_key = ENV['ANTHROPIC_API_KEY']
client = Anthropic::Client.new

# Simulate crawler parameters
model = 'claude-opus-4-6'
max_tokens = 16000

system_prompt = <<~PROMPT
  You are a legislation researcher for Brazil.
  Search for immigration legislation and return structured JSON.
PROMPT

user_prompt = <<~PROMPT
  Your task: Use the web_search tool to find specific immigration legislation for Brazil.
  
  You MUST call the web_search tool at least 6 times:
  1. Brazil main immigration law
  2. Brazil immigration regulations
  3. Brazil visa requirements
  
  Then return JSON with the results.
PROMPT

messages = [
  {
    role: 'user',
    content: user_prompt
  }
]

puts "Testing crawler API call with thinking..."
puts "System prompt length: #{system_prompt.length} chars"
puts "User prompt length: #{user_prompt.length} chars"
puts "Max tokens: #{max_tokens}"

start_time = Time.now

begin
  Timeout.timeout(30) do
    response = client.messages.create(
      model: model,
      max_tokens: max_tokens,
      thinking: {
        type: 'adaptive'
      },
      system_: system_prompt,
      messages: messages
    )
    
    elapsed = Time.now - start_time
    puts "✓ API call succeeded in #{elapsed.round(2)}s"
    puts "Stop reason: #{response.stop_reason}"
    puts "Content blocks: #{response.content.length}"
    response.content.each_with_index do |block, i|
      puts "  Block #{i}: #{block.type}"
    end
  end
rescue Timeout::Error => e
  elapsed = Time.now - start_time
  puts "✗ API call timeout after #{elapsed.round(2)}s"
rescue => e
  elapsed = Time.now - start_time
  puts "✗ API call failed after #{elapsed.round(2)}s"
  puts "Error: #{e.class} - #{e.message}"
  if e.respond_to?(:status)
    puts "Status: #{e.status}"
  end
end
