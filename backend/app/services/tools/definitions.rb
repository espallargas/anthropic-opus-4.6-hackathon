module Tools
  class Definitions
    # Use Anthropic's built-in web_search tool (Deltropic integration)
    # No custom tool definition needed - Claude handles web_search natively
    TOOLS = [].freeze  # Empty - using Claude's native web_search
  end
end
