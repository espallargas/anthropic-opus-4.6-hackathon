module Api
  module V1
    class ChatController < ApplicationController
      include ActionController::Live

      MODEL = 'claude-opus-4-6'
      MAX_TOKENS = 4096
      MAX_TURNS = 10

      SYSTEM_PROMPT_TEMPLATE = <<~PROMPT
        Você é um assistente especializado em processos de imigração.

        Dados do usuário:
        - País de origem: %<origin_country>s
        - Nacionalidade: %<nationality>s
        - País de destino: %<destination_country>s
        - Objetivo: %<objective>s
        - Informações adicionais: %<additional_info>s

        Responda de forma clara e prática. Cite requisitos legais quando relevante.
        Sempre pergunte se precisa de mais detalhes para dar uma resposta precisa.

        Você tem acesso a ferramentas para buscar requisitos de visto e prazos de processamento.
        Use-as quando o usuário perguntar sobre documentos, requisitos ou prazos.
      PROMPT

      DEFAULT_SYSTEM_PROMPT = 'You are a helpful assistant. Be concise and direct.'

      def create
        response.headers['Content-Type'] = 'text/event-stream'
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['X-Accel-Buffering'] = 'no'

        sse = ActionController::Live::SSE.new(response.stream)
        messages = params.require(:messages).map { |m| { role: m[:role], content: m[:content] } }
        system_prompt = build_system_prompt
        client = Rails.application.config.x.anthropic

        sse.write({ type: 'message_start' })

        MAX_TURNS.times do
          text_content = ''
          tool_use_blocks = []
          stop_reason = nil

          stream = client.messages.stream(
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: system_prompt,
            messages: messages,
            tools: Tools::Definitions::TOOLS
          )

          stream.each do |event|
            case event.type
            when :text
              sse.write({ type: 'token', token: event.text })
              text_content += event.text
            when :content_block_stop
              next unless event.content_block.type == :tool_use

              block = event.content_block
              input = parse_tool_input(block.input)
              tool_use_blocks << { id: block.id, name: block.name, input: input }
              sse.write({ type: 'tool_use_start', tool_call_id: block.id, tool_name: block.name, tool_input: input })
            when :message_stop
              stop_reason = event.message.stop_reason.to_s
            end
          end

          break unless stop_reason == 'tool_use' && tool_use_blocks.any?

          assistant_content = []
          assistant_content << { type: 'text', text: text_content } if text_content.present?
          tool_use_blocks.each do |tb|
            assistant_content << { type: 'tool_use', id: tb[:id], name: tb[:name], input: tb[:input] }
          end
          messages << { role: 'assistant', content: assistant_content }

          tool_results = tool_use_blocks.map do |tb|
            result = begin
              Tools::Executor.call(tb[:name], tb[:input])
            rescue StandardError => e
              sse.write({ type: 'tool_use_result', tool_call_id: tb[:id], result: { error: e.message } })
              next { type: 'tool_result', tool_use_id: tb[:id], content: e.message, is_error: true }
            end

            sse.write({ type: 'tool_use_result', tool_call_id: tb[:id], result: JSON.parse(result) })
            { type: 'tool_result', tool_use_id: tb[:id], content: result }
          end

          messages << { role: 'user', content: tool_results }
        end

        sse.write({ type: 'message_end' })
      rescue StandardError => e
        Rails.logger.error("Chat SSE error: #{e.class} - #{e.message}")
        begin
          sse&.write({ type: 'error', error: e.message })
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
        return DEFAULT_SYSTEM_PROMPT unless vars.present?

        format(SYSTEM_PROMPT_TEMPLATE, origin_country: vars[:origin_country].to_s,
                                       nationality: vars[:nationality].to_s,
                                       destination_country: vars[:destination_country].to_s,
                                       objective: vars[:objective].to_s,
                                       additional_info: vars[:additional_info].to_s.presence || 'Nenhuma')
      end
    end
  end
end
