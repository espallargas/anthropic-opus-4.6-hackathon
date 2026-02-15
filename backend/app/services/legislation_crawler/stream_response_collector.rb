module LegislationCrawler
  # Builds a response object from streaming events.
  # Collects content blocks (text, thinking, tool_use, web_search) into a unified structure.
  class StreamResponseCollector
    attr_reader :content, :stop_reason, :model, :usage
    attr_accessor :web_search_results

    def initialize
      @content = []
      @stop_reason = nil
      @model = nil
      @usage = nil
      @current_block = nil
      @thinking_text = ""
      @text_buffer = ""
      @web_search_results = nil
    end

    def add_event(event)
      case event.type.to_s.to_sym
      when :content_block_start
        start_block(event)
      when :content_block_delta
        append_delta(event)
      when :content_block_stop
        finalize_block
      when :message_stop
        @stop_reason = event.message.stop_reason if event.message.respond_to?(:stop_reason)
      when :message_start
        @model = event.message.model if event.message.respond_to?(:model)
      end
    end

    private

    def start_block(event)
      block_id = event.content_block.respond_to?(:id) ? event.content_block.id : nil
      @current_block = {
        type: event.content_block.type,
        id: block_id,
        index: event.index,
        text: "",
        thinking: "",
        content: nil,
        name: event.content_block.respond_to?(:name) ? event.content_block.name : nil,
        input: event.content_block.respond_to?(:input) ? event.content_block.input : nil,
        tool_use_id: block_id
      }

      return unless event.content_block.type == "web_search_tool_result" && event.content_block.respond_to?(:content)

      @current_block[:content] = event.content_block.content
      @web_search_results = event.content_block.content
    end

    def append_delta(event)
      return unless @current_block

      if event.delta.respond_to?(:text) && event.delta.text
        @current_block[:text] ||= ""
        @current_block[:text] += event.delta.text
      elsif event.delta.respond_to?(:thinking) && event.delta.thinking
        @current_block[:thinking] ||= ""
        @current_block[:thinking] += event.delta.thinking
      elsif event.delta.respond_to?(:input) && event.delta.input
        @current_block[:input] ||= ""
        @current_block[:input] += event.delta.input
      end
    end

    def finalize_block
      return unless @current_block

      block = convert_block(@current_block)
      if block
        @content << block
        Rails.logger.debug do
          "[COLLECTOR] Added content block: type=#{@current_block[:type]}, text_len=#{begin
            @current_block[:text].length
          rescue StandardError
            0
          end}"
        end
      end
      @current_block = nil
    end

    def convert_block(block_data)
      case block_data[:type].to_s
      when "text"
        Struct.new(:type, :text).new(:text, block_data[:text])
      when "thinking"
        Struct.new(:type, :thinking).new(:thinking, block_data[:thinking])
      when "tool_use"
        build_tool_use_block(block_data)
      when "server_tool_use"
        Struct.new(:type, :id, :name, :input).new(
          :server_tool_use, block_data[:id], block_data[:name], block_data[:input]
        )
      when "web_search_tool_result"
        Struct.new(:type, :content).new(:web_search_tool_result, block_data[:content])
      else
        Rails.logger.warn("[COLLECTOR] Unknown block type: #{block_data[:type].inspect} (#{block_data[:type].class})")
        nil
      end
    end

    def build_tool_use_block(block_data)
      tool_block = Struct.new(:type, :id, :name, :input).new(
        :tool_use, block_data[:id], block_data[:name], block_data[:input]
      )
      def tool_block.respond_to_method?(method_name)
        [:type, :id, :name, :input].include?(method_name.to_sym)
      end
      tool_block
    end
  end
end
