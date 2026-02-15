module Api
  module V1
    class ChatController < ApplicationController
      include ActionController::Live

      MODEL = "claude-opus-4-6".freeze
      MAX_TOKENS = 128_000
      MAX_TURNS = 10
      THINKING_EFFORT = "medium".freeze
      BETAS = %w[advanced-tool-use-2025-11-20 code-execution-2025-08-25 context-1m-2025-08-07].freeze

      SERVER_TOOLS = %w[get_legislation].freeze
      LOCALE_TO_LANGUAGE = { "pt-BR" => "Portuguese", "en" => "English" }.freeze
      DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant. Be concise and direct.".freeze

      def create # rubocop:disable Metrics/AbcSize,Metrics/CyclomaticComplexity,Metrics/MethodLength,Metrics/PerceivedComplexity
        response.headers["Content-Type"] = "text/event-stream"
        response.headers["Cache-Control"] = "no-cache"
        response.headers["X-Accel-Buffering"] = "no"

        sse = ActionController::Live::SSE.new(response.stream)
        messages = params.require(:messages).map { |m| { role: m[:role], content: m[:content] } }
        system_vars = extract_system_vars
        system_prompt = build_system_prompt
        client = Rails.application.config.x.anthropic

        sse.write({ type: "message_start", server_time: Time.current.iso8601(3) })

        total_input_tokens = 0
        total_output_tokens = 0
        total_cache_creation_tokens = 0
        total_cache_read_tokens = 0
        container_id = nil
        agent_usage = {}

        MAX_TURNS.times do
          text_content = ""
          tool_use_blocks = []
          thinking_blocks = []
          server_tool_use_blocks = []
          result_blocks = []
          stop_reason = nil
          thinking_active = false

          stream_params = {
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system_: system_prompt,
            messages: messages,
            tools: Tools::Definitions::TOOLS,
            thinking: { type: "adaptive" },
            output_config: { effort: THINKING_EFFORT },
            betas: BETAS
          }
          stream_params[:container] = container_id if container_id

          stream = client.beta.messages.stream(stream_params)

          stream.each do |event|
            case event.type
            when :thinking
              unless thinking_active
                thinking_active = true
                sse.write({ type: "thinking_start", thinking_type: "adaptive",
                            thinking_effort: THINKING_EFFORT, server_time: Time.current.iso8601(3) })
              end
              sse.write({ type: "thinking_token", token: event.thinking, server_time: Time.current.iso8601(3) })

            when :text
              if thinking_active
                thinking_active = false
                sse.write({ type: "thinking_end", server_time: Time.current.iso8601(3) })
              end
              sse.write({ type: "token", token: event.text, server_time: Time.current.iso8601(3) })
              text_content += event.text

            when :content_block_stop
              block = event.content_block
              block_type = block.type.to_s

              # Close thinking if still active when non-thinking block finishes
              if thinking_active && block_type != "thinking"
                thinking_active = false
                sse.write({ type: "thinking_end", server_time: Time.current.iso8601(3) })
              end

              case block_type
              when "thinking"
                if thinking_active
                  thinking_active = false
                  sse.write({ type: "thinking_end", server_time: Time.current.iso8601(3) })
                end
                thinking_blocks << {
                  type: "thinking",
                  thinking: block.thinking,
                  signature: block.signature
                }

              when "tool_use"
                input = parse_tool_input(block.input)
                caller_info = extract_caller(block)
                tool_block = { id: block.id, name: block.name, input: input }
                tool_block[:caller] = caller_info if caller_info
                tool_use_blocks << tool_block

                sse.write({
                            type: "tool_use_start",
                            tool_call_id: block.id,
                            tool_name: block.name,
                            tool_input: input,
                            server_time: Time.current.iso8601(3)
                          })

              when "server_tool_use"
                input = parse_tool_input(block.respond_to?(:input) ? block.input : {})
                server_tool_use_blocks << { id: block.id, name: block.name, input: input }

              when "bash_code_execution_tool_result", "code_execution_tool_result"
                result_blocks << serialize_result_block(block)
              end

            when :message_stop
              stop_reason = event.message.stop_reason.to_s
              usage = event.message.usage
              total_input_tokens += usage.input_tokens if usage.respond_to?(:input_tokens)
              total_output_tokens += usage.output_tokens if usage.respond_to?(:output_tokens)

              total_cache_creation_tokens += (usage.cache_creation_input_tokens || 0)
              total_cache_read_tokens += (usage.cache_read_input_tokens || 0)

              Rails.logger.info("[CACHE] creation=#{total_cache_creation_tokens} read=#{total_cache_read_tokens}")

              # Track container ID for code execution reuse
              if event.message.respond_to?(:container) && event.message.container
                ctr = event.message.container
                container_id = ctr.respond_to?(:id) ? ctr.id : ctr.to_s
              end
            end
          end

          break unless stop_reason == "tool_use" && tool_use_blocks.any?

          # Build assistant content preserving all block types
          assistant_content = build_assistant_content(
            thinking_blocks, text_content, server_tool_use_blocks, tool_use_blocks, result_blocks
          )
          messages << { role: "assistant", content: assistant_content }

          # Execute tool calls (server tools + programmatic agent calls)
          tool_results = execute_tool_calls(tool_use_blocks, system_vars, sse, agent_usage)
          messages << { role: "user", content: tool_results }
        end

        sse.write({
                    type: "usage_report",
                    total_input_tokens: total_input_tokens,
                    total_output_tokens: total_output_tokens,
                    cache_creation_tokens: total_cache_creation_tokens,
                    cache_read_tokens: total_cache_read_tokens,
                    agent_usage: agent_usage,
                    server_time: Time.current.iso8601(3)
                  })
        sse.write({ type: "message_end", server_time: Time.current.iso8601(3) })
      rescue StandardError => e
        Rails.logger.error("Chat SSE error: #{e.class} - #{e.message}")
        Rails.logger.error(e.backtrace&.first(5)&.join("\n"))
        begin
          sse&.write({ type: "error", error: e.message, server_time: Time.current.iso8601(3) })
        rescue StandardError
          nil
        end
      ensure
        sse&.close
      end

      private

      def extract_system_vars
        vars = params[:system_vars]
        return {} unless vars

        vars.to_unsafe_h.symbolize_keys
      end

      def extract_caller(block)
        # Try direct accessor
        if block.respond_to?(:caller) && block.caller
          caller_obj = block.caller
          caller_type = caller_obj.respond_to?(:type) ? caller_obj.type.to_s : nil
          if caller_type == "code_execution_20250825"
            return { type: caller_type,
                     tool_id: caller_obj.respond_to?(:tool_id) ? caller_obj.tool_id : nil }
          end
        end

        # Try hash conversion
        if block.respond_to?(:to_h)
          block_hash = block.to_h
          caller_info = block_hash[:caller] || block_hash["caller"]
          if caller_info
            ct = (caller_info[:type] || caller_info["type"]).to_s
            if ct == "code_execution_20250825"
              return { type: ct,
                       tool_id: caller_info[:tool_id] || caller_info["tool_id"] }
            end
          end
        end

        nil
      rescue StandardError
        nil
      end

      def build_assistant_content(thinking_blocks, text_content, server_tool_use_blocks, tool_use_blocks, result_blocks)
        content = thinking_blocks.dup
        content << { type: "text", text: text_content } if text_content.present?
        server_tool_use_blocks.each do |stb|
          content << { type: "server_tool_use", id: stb[:id], name: stb[:name], input: stb[:input] }
        end
        tool_use_blocks.each do |tb|
          block = { type: "tool_use", id: tb[:id], name: tb[:name], input: tb[:input] }
          block[:caller] = tb[:caller] if tb[:caller]
          content << block
        end
        result_blocks.each { |rb| content << rb }
        content
      end

      def execute_tool_calls(tool_use_blocks, system_vars, sse, agent_usage)
        executor = Agents::Executor.new(system_vars: system_vars, sse: sse)
        threads = []
        results = Array.new(tool_use_blocks.length)
        results_mutex = Mutex.new

        # Start all tool executions in parallel (without writing to SSE yet)
        tool_use_blocks.each_with_index do |tb, index|
          thread = Thread.new do
            tool_result = if SERVER_TOOLS.include?(tb[:name])
                            handle_server_tool(tb)
                          elsif programmatic_call?(tb)
                            result = executor.execute(tb[:name], tb[:input], tool_call_id: tb[:id])

                            # Track per-agent token usage
                            if result[:usage]
                              results_mutex.synchronize do
                                agent_usage[tb[:name]] = {
                                  input_tokens: result.dig(:usage, :input_tokens) || 0,
                                  output_tokens: result.dig(:usage, :output_tokens) || 0
                                }
                              end
                            end

                            content = result[:success] ? result[:data].to_json : { error: result[:error] }.to_json
                            { type: "tool_result", tool_use_id: tb[:id], content: content }
                          else
                            { type: "tool_result", tool_use_id: tb[:id],
                              content: { error: "Tool not implemented: #{tb[:name]}" }.to_json }
                          end

            results_mutex.synchronize { results[index] = tool_result }
          end

          threads << thread
        end

        # Wait for all threads to complete before writing results to SSE
        threads.each(&:join)

        # Now write all results to SSE together
        tool_use_blocks.each_with_index do |tb, index|
          sse.write({
                      type: "tool_use_result",
                      tool_call_id: tb[:id],
                      tool_name: tb[:name],
                      result: {},
                      server_time: Time.current.iso8601(3)
                    })
        end

        results
      end

      def handle_server_tool(tool_block)
        case tool_block[:name]
        when "get_legislation"
          handle_get_legislation(tool_block)
        else
          { type: "tool_result", tool_use_id: tool_block[:id],
            content: { error: "Unknown server tool: #{tool_block[:name]}" }.to_json }
        end
      end

      def handle_get_legislation(tool_block)
        country_code = tool_block.dig(:input, "country_code") || tool_block.dig(:input, :country_code)
        content = build_legislation_context(country_code)
        { type: "tool_result", tool_use_id: tool_block[:id], content: content }
      end

      def programmatic_call?(tool_block)
        # A tool call is programmatic if it has a caller from code_execution OR if it's one of our agent tools
        return true if tool_block[:caller]

        Agents::Executor::AGENTS.key?(tool_block[:name])
      end

      def serialize_result_block(block)
        block_type = block.type.to_s
        tool_use_id = block.respond_to?(:tool_use_id) ? block.tool_use_id : nil

        content = if block.respond_to?(:content) && block.content
                    result = block.content
                    {
                      type: result.respond_to?(:type) ? result.type.to_s : block_type.sub("_tool_result", "_result"),
                      stdout: result.respond_to?(:stdout) ? result.stdout : "",
                      stderr: result.respond_to?(:stderr) ? result.stderr : "",
                      return_code: result.respond_to?(:return_code) ? result.return_code : 0,
                      content: result.respond_to?(:content) ? (result.content || []) : []
                    }
                  else
                    { type: "code_execution_result", stdout: "", stderr: "", return_code: 0, content: [] }
                  end

        { type: block_type, tool_use_id: tool_use_id, content: content }
      end

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

        prompts = load_agent_prompts
        orchestrator_prompt = prompts.dig("orchestrator", "system_prompt")
        return [{ type: "text", text: DEFAULT_SYSTEM_PROMPT }] if vars.blank? || orchestrator_prompt.blank?

        language = LOCALE_TO_LANGUAGE[vars[:locale].to_s] || "English"

        replacements = {
          "origin_country" => vars[:origin_country].to_s,
          "nationality" => vars[:nationality].to_s,
          "destination_country" => vars[:destination_country].to_s,
          "objective" => vars[:objective].to_s,
          "additional_info" => vars[:additional_info].to_s.presence || "None",
          "language" => language
        }

        instructions = replacements.reduce(orchestrator_prompt) { |prompt, (key, val)| prompt.gsub("{{#{key}}}", val) }
        legislation_text = build_legislation_context(vars[:destination_country])
        has_legislation = legislation_text != "No legislation data available yet."

        Rails.logger.info("[SYSTEM_PROMPT] destination=#{vars[:destination_country]} " \
                          "has_legislation=#{has_legislation} legislation_chars=#{legislation_text.length}")

        if has_legislation
          [
            { type: "text", text: instructions },
            { type: "text", text: legislation_text, cache_control: { type: "ephemeral" } }
          ]
        else
          [
            { type: "text", text: instructions, cache_control: { type: "ephemeral" } }
          ]
        end
      end

      def build_legislation_context(country_code)
        return "No legislation data available yet." if country_code.blank?

        country = Country.find_by(code: country_code.to_s.downcase)
        return "No legislation data available yet." if country.nil? || !country.legislations.exists?

        legislations = country.legislations.where(is_deprecated: false)
        extracted = legislations.where(extraction_status: "completed")
        pending = legislations.where.not(extraction_status: "completed")

        sections = extracted.group_by(&:category).map do |cat, laws|
          items = laws.map do |l|
            <<~ITEM
              #### #{l.title}
              **Source**: #{l.source_url}
              **Effective**: #{l.date_effective || 'Unknown'}
              **Summary**: #{l.summary}

              #{l.content}
            ITEM
          end.join("\n---\n")
          "### #{cat.to_s.humanize.titleize}\n#{items}"
        end.join("\n\n")

        sections += "\n\n_Note: #{pending.count} legislation(s) still being processed._" if pending.any?

        sections
      end

      def load_agent_prompts
        @load_agent_prompts ||= YAML.load_file(Rails.root.join("config/agent_prompts.yml"))
      rescue StandardError => e
        Rails.logger.error("Failed to load agent prompts: #{e.message}")
        {}
      end
    end
  end
end
