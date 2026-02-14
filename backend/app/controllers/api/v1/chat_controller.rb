module Api
  module V1
    class ChatController < ApplicationController
      include ActionController::Live

      MODEL = "claude-opus-4-6".freeze
      MAX_TOKENS = 16_000
      THINKING_BUDGET = 10_000
      MAX_TURNS = 10

      LOCALE_TO_LANGUAGE = { 'pt-BR' => 'Portuguese', 'en' => 'English' }.freeze

      SYSTEM_PROMPT_TEMPLATE = <<~PROMPT.freeze
        You are a specialist assistant in immigration processes.

        User data:
        - Origin country: %<origin_country>s
        - Nationality: %<nationality>s
        - Destination country: %<destination_country>s
        - Objective: %<objective>s
        - Additional information: %<additional_info>s

        LANGUAGE: Always respond in %<language>s, unless the user writes in a different language or explicitly asks you to use another language.

        Respond clearly and practically. Cite legal requirements when relevant.
        Always ask if you need more details to provide an accurate answer.

        You have access to tools to search for visa requirements and processing timelines.
        Use them when the user asks about documents, requirements, or timelines.
      PROMPT

      DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant. Be concise and direct.".freeze

      def create
        response.headers["Content-Type"] = "text/event-stream"
        response.headers["Cache-Control"] = "no-cache"
        response.headers["X-Accel-Buffering"] = "no"

        sse = ActionController::Live::SSE.new(response.stream)
        messages = params.require(:messages).map { |m| { role: m[:role], content: m[:content] } }
        system_prompt = build_system_prompt
        client = Rails.application.config.x.anthropic

        sse.write({ type: 'message_start', server_time: Time.current.iso8601(3) })

        total_input_tokens = 0
        total_output_tokens = 0

        MAX_TURNS.times do
          text_content = ""
          tool_use_blocks = []
          thinking_blocks = []
          stop_reason = nil

          stream = client.messages.stream(
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: system_prompt,
            messages: messages,
            tools: Tools::Definitions::TOOLS,
            thinking: { type: 'enabled', budget_tokens: THINKING_BUDGET }
          )

          thinking_active = false

          stream.each do |event|
            case event.type
            when :thinking
              unless thinking_active
                thinking_active = true
                sse.write({ type: 'thinking_start', server_time: Time.current.iso8601(3) })
              end
              sse.write({ type: 'thinking_token', token: event.thinking, server_time: Time.current.iso8601(3) })
            when :text
              if thinking_active
                thinking_active = false
                sse.write({ type: 'thinking_end', server_time: Time.current.iso8601(3) })
              end
              sse.write({ type: 'token', token: event.text, server_time: Time.current.iso8601(3) })
              text_content += event.text
            when :content_block_stop
              if event.content_block.type == :thinking
                if thinking_active
                  thinking_active = false
                  sse.write({ type: 'thinking_end', server_time: Time.current.iso8601(3) })
                end
                block = event.content_block
                thinking_blocks << { type: 'thinking', thinking: block.thinking, signature: block.signature }
                next
              end
              next unless event.content_block.type == :tool_use

              block = event.content_block
              input = parse_tool_input(block.input)
              tool_use_blocks << { id: block.id, name: block.name, input: input }
              sse.write({ type: "tool_use_start", tool_call_id: block.id, tool_name: block.name, tool_input: input,
                          server_time: Time.current.iso8601(3) })
            when :message_stop
              stop_reason = event.message.stop_reason.to_s
              usage = event.message.usage
              total_input_tokens += usage.input_tokens if usage.respond_to?(:input_tokens)
              total_output_tokens += usage.output_tokens if usage.respond_to?(:output_tokens)
            end
          end

          break unless stop_reason == "tool_use" && tool_use_blocks.any?

          assistant_content = []
          thinking_blocks.each { |tb| assistant_content << tb }
          assistant_content << { type: 'text', text: text_content } if text_content.present?
          tool_use_blocks.each do |tb|
            assistant_content << { type: "tool_use", id: tb[:id], name: tb[:name], input: tb[:input] }
          end
          messages << { role: "assistant", content: assistant_content }

          # Tool results are handled natively by Claude API
          # No custom tool execution needed - web_search and other tools work natively
        end

        sse.write({ type: 'usage_report', total_input_tokens: total_input_tokens, total_output_tokens: total_output_tokens, server_time: Time.current.iso8601(3) })
        sse.write({ type: 'message_end', server_time: Time.current.iso8601(3) })
      rescue StandardError => e
        Rails.logger.error("Chat SSE error: #{e.class} - #{e.message}")
        begin
          sse&.write({ type: "error", error: e.message, server_time: Time.current.iso8601(3) })
        rescue StandardError
          nil
        end
      ensure
        sse&.close
      end

      private

      def parse_tool_input(input)
        case input
        when Hash then input
        when String
          return {} if input.blank?

          JSON.parse(input)
        else
          input.respond_to?(:to_h) ? input.to_h : {}
        end
      rescue JSON::ParserError
        {}
      end

      def build_system_prompt
        vars = params[:system_vars]
        return DEFAULT_SYSTEM_PROMPT if vars.blank?

        language = LOCALE_TO_LANGUAGE[vars[:locale].to_s] || 'English'

        format(SYSTEM_PROMPT_TEMPLATE, origin_country: vars[:origin_country].to_s,
                                       nationality: vars[:nationality].to_s,
                                       destination_country: vars[:destination_country].to_s,
                                       objective: vars[:objective].to_s,
                                       additional_info: vars[:additional_info].to_s.presence || "None",
                                       language: language)
      end
    end
  end
end
