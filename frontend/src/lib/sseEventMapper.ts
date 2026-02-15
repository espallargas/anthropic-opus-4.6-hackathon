import type { AgentToolCall, ToolCall, TokenUsage, UsageReport } from '@/lib/chatStore';

export interface RawSSEEvent {
  type: string;
  token?: string;
  error?: string;
  thinking_type?: string;
  thinking_effort?: string;
  tool_call_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  result?: Record<string, unknown>;
  agent_name?: string;
  agent_label?: string;
  task?: string;
  result_summary?: string;
  usage?: { input_tokens: number; output_tokens: number };
  duration_ms?: number;
  total_input_tokens?: number;
  total_output_tokens?: number;
  cache_creation_tokens?: number;
  cache_read_tokens?: number;
  agent_usage?: Record<string, TokenUsage>;
}

export type ChatAction =
  | { type: 'APPEND_TOKEN'; token: string }
  | { type: 'TOOL_START'; toolCall: ToolCall }
  | { type: 'TOOL_DONE'; toolCallId: string; result: Record<string, unknown> }
  | { type: 'THINKING_START'; thinkingType?: string; thinkingEffort?: string }
  | { type: 'THINKING_TOKEN'; token: string }
  | { type: 'THINKING_END' }
  | { type: 'AGENT_START'; agentName: string; agentLabel: string; task: string }
  | { type: 'AGENT_TOKEN'; agentName: string; token: string }
  | { type: 'AGENT_TOOL_START'; agentName: string; toolCall: AgentToolCall }
  | {
      type: 'AGENT_TOOL_DONE';
      agentName: string;
      toolCallId: string;
      result: Record<string, unknown>;
    }
  | {
      type: 'AGENT_END';
      agentName: string;
      resultSummary: string;
      usage?: TokenUsage;
      durationMs?: number;
    }
  | { type: 'USAGE_REPORT'; report: UsageReport }
  | { type: 'MESSAGE_END' }
  | { type: 'ERROR'; error: string };

export function mapSSEEvent(raw: RawSSEEvent): ChatAction | null {
  switch (raw.type) {
    case 'token':
      return raw.token ? { type: 'APPEND_TOKEN', token: raw.token } : null;

    case 'thinking_start':
      return {
        type: 'THINKING_START',
        thinkingType: raw.thinking_type,
        thinkingEffort: raw.thinking_effort,
      };

    case 'thinking_token':
      return raw.token ? { type: 'THINKING_TOKEN', token: raw.token } : null;

    case 'thinking_end':
      return { type: 'THINKING_END' };

    case 'tool_use_start':
      return raw.tool_call_id
        ? {
            type: 'TOOL_START',
            toolCall: {
              id: raw.tool_call_id,
              name: raw.tool_name ?? 'unknown',
              input: raw.tool_input ?? {},
              status: 'calling',
            },
          }
        : null;

    case 'tool_use_result':
      return raw.tool_call_id
        ? {
            type: 'TOOL_DONE',
            toolCallId: raw.tool_call_id,
            result: raw.result ?? {},
          }
        : null;

    case 'agent_start':
      return raw.agent_name
        ? {
            type: 'AGENT_START',
            agentName: raw.agent_name,
            agentLabel: raw.agent_label ?? raw.agent_name,
            task: raw.task ?? '',
          }
        : null;

    case 'agent_token':
      return raw.agent_name && raw.token
        ? { type: 'AGENT_TOKEN', agentName: raw.agent_name, token: raw.token }
        : null;

    case 'agent_tool_use_start':
      return raw.agent_name && raw.tool_call_id
        ? {
            type: 'AGENT_TOOL_START',
            agentName: raw.agent_name,
            toolCall: {
              id: raw.tool_call_id,
              name: raw.tool_name ?? 'unknown',
              input: raw.tool_input ?? {},
              status: 'calling',
            },
          }
        : null;

    case 'agent_tool_use_result':
      return raw.agent_name && raw.tool_call_id
        ? {
            type: 'AGENT_TOOL_DONE',
            agentName: raw.agent_name,
            toolCallId: raw.tool_call_id,
            result: raw.result ?? {},
          }
        : null;

    case 'agent_end':
      return raw.agent_name
        ? {
            type: 'AGENT_END',
            agentName: raw.agent_name,
            resultSummary: raw.result_summary ?? '',
            usage: raw.usage,
            durationMs: raw.duration_ms,
          }
        : null;

    case 'usage_report':
      return {
        type: 'USAGE_REPORT',
        report: {
          totalInputTokens: raw.total_input_tokens ?? 0,
          totalOutputTokens: raw.total_output_tokens ?? 0,
          cacheCreationTokens: raw.cache_creation_tokens ?? 0,
          cacheReadTokens: raw.cache_read_tokens ?? 0,
          agentUsage: raw.agent_usage ?? {},
        },
      };

    case 'message_end':
      return { type: 'MESSAGE_END' };

    case 'error':
      return { type: 'ERROR', error: raw.error ?? 'Unknown error' };

    default:
      return null;
  }
}
