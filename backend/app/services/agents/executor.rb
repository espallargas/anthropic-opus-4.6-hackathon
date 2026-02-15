module Agents
  class Executor
    AGENTS = {
      "analyze_pathways" => Agents::PathwayStrategist,
      "check_eligibility" => Agents::EligibilityAnalyst,
      "list_required_documents" => Agents::DocumentationSpecialist,
      "get_processing_statistics" => Agents::ApplicationManager
    }.freeze

    AGENT_LABELS = {
      "analyze_pathways" => "Pathway Strategist",
      "check_eligibility" => "Eligibility Analyst",
      "list_required_documents" => "Documentation Specialist",
      "get_processing_statistics" => "Application Manager"
    }.freeze

    TASK_DETAIL_KEYS = {
      "analyze_pathways" => "objective",
      "check_eligibility" => "program",
      "list_required_documents" => "pathway",
      "get_processing_statistics" => "pathway"
    }.freeze

    TASK_TEMPLATES = {
      "analyze_pathways" => "Analyzing %<detail>s pathways for %<country>s",
      "check_eligibility" => "Checking eligibility for %<country>s",
      "list_required_documents" => "Listing documents for %<detail>s in %<country>s",
      "get_processing_statistics" => "Getting %<detail>s statistics for %<country>s"
    }.freeze

    attr_reader :system_vars, :sse

    def initialize(system_vars:, sse:)
      @system_vars = system_vars
      @sse = sse
    end

    def execute(tool_name, tool_input, tool_call_id: nil)
      validate_tool_name!(tool_name)

      agent_class = AGENTS.fetch(tool_name)
      agent_label = AGENT_LABELS.fetch(tool_name)
      task_description = describe_task(tool_name, tool_input)

      start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
      emit(:agent_start, agent_name: tool_name, agent_label: agent_label, task: task_description,
                         tool_call_id: tool_call_id)

      result = agent_class.new(tool_input: tool_input, system_vars: system_vars, sse: sse).call

      duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round
      summary = result[:data]&.to_json&.truncate(200) || ""

      emit(:agent_end,
           agent_name: tool_name,
           tool_call_id: tool_call_id,
           result_summary: summary,
           usage: result[:usage] || {},
           duration_ms: duration_ms)

      result
    rescue StandardError => e
      Rails.logger.error("[AGENT_EXECUTOR] #{tool_name} failed: #{e.class} - #{e.message}")
      Rails.logger.error(e.backtrace&.first(5)&.join("\n"))

      duration_ms = if start_time
                      ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start_time) * 1000).round
                    else
                      0
                    end
      emit(:agent_end, agent_name: tool_name, tool_call_id: tool_call_id,
                       result_summary: "Error: #{e.message}", duration_ms: duration_ms)

      { success: false, error: e.message }
    end

    private

    def validate_tool_name!(tool_name)
      return if AGENTS.key?(tool_name)

      raise ArgumentError, "Unknown agent tool: #{tool_name}. Available: #{AGENTS.keys.join(', ')}"
    end

    def describe_task(tool_name, tool_input)
      country = extract_input(tool_input, "destination_country", "unknown")
      detail = extract_input(tool_input, TASK_DETAIL_KEYS[tool_name] || "pathway", "")

      format(TASK_TEMPLATES.fetch(tool_name, "Processing %<tool>s"), detail: detail, country: country, tool: tool_name)
    end

    def extract_input(input, key, default)
      input[key] || input[key.to_sym] || default
    end

    def emit(type, **data)
      return unless sse

      message = { type: type.to_s, server_time: Time.current.iso8601(3), **data }
      sse.write(message)
    rescue ActionController::Live::ClientDisconnected
      raise
    rescue StandardError => e
      Rails.logger.error("[EXECUTOR_EMIT] #{type}: #{e.class} - #{e.message}")
    end
  end
end
