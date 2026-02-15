import type { AgentExecution, ThinkingBlock, ToolCall, UsageReport } from '@/lib/chatStore';
import type { ChatAction } from '@/lib/sseEventMapper';

export interface StreamState {
  content: string;
  toolCalls: ToolCall[];
  agentExecutions: AgentExecution[];
  usageReport: UsageReport | null;
  thinking: ThinkingBlock | null;
  thinkingStartedAt: number | null;
}

export function createStreamState(): StreamState {
  return {
    content: '',
    toolCalls: [],
    agentExecutions: [],
    usageReport: null,
    thinking: null,
    thinkingStartedAt: null,
  };
}

export function chatStreamReducer(state: StreamState, action: ChatAction): StreamState {
  switch (action.type) {
    case 'THINKING_START':
      return {
        ...state,
        thinkingStartedAt: Date.now(),
        thinking: {
          content: '',
          status: 'thinking',
          type: action.thinkingType,
          effort: action.thinkingEffort,
        },
      };

    case 'THINKING_TOKEN':
      return {
        ...state,
        thinking: {
          ...state.thinking,
          content: (state.thinking?.content ?? '') + action.token,
          status: 'thinking',
        },
      };

    case 'THINKING_END': {
      const durationMs = state.thinkingStartedAt ? Date.now() - state.thinkingStartedAt : undefined;
      return {
        ...state,
        thinkingStartedAt: null,
        thinking: state.thinking ? { ...state.thinking, status: 'done', durationMs } : null,
      };
    }

    case 'APPEND_TOKEN':
      return { ...state, content: state.content + action.token };

    case 'TOOL_START':
      return { ...state, toolCalls: [...state.toolCalls, action.toolCall] };

    case 'TOOL_DONE':
      return {
        ...state,
        toolCalls: state.toolCalls.map((tc) =>
          tc.id === action.toolCallId
            ? { ...tc, status: 'done' as const, result: action.result }
            : tc,
        ),
      };

    case 'AGENT_START':
      return {
        ...state,
        agentExecutions: [
          ...state.agentExecutions,
          {
            agentName: action.agentName,
            agentLabel: action.agentLabel,
            task: action.task,
            status: 'running',
            toolCalls: [],
          },
        ],
      };

    case 'AGENT_TOKEN':
      return {
        ...state,
        agentExecutions: state.agentExecutions.map((ae) =>
          ae.agentName === action.agentName && ae.status === 'running'
            ? { ...ae, tokens: (ae.tokens ?? '') + action.token }
            : ae,
        ),
      };

    case 'AGENT_TOOL_START':
      return {
        ...state,
        agentExecutions: state.agentExecutions.map((ae) =>
          ae.agentName === action.agentName && ae.status === 'running'
            ? { ...ae, toolCalls: [...ae.toolCalls, action.toolCall] }
            : ae,
        ),
      };

    case 'AGENT_TOOL_DONE':
      return {
        ...state,
        agentExecutions: state.agentExecutions.map((ae) =>
          ae.agentName === action.agentName && ae.status === 'running'
            ? {
                ...ae,
                toolCalls: ae.toolCalls.map((tc) =>
                  tc.id === action.toolCallId
                    ? { ...tc, status: 'done' as const, result: action.result }
                    : tc,
                ),
              }
            : ae,
        ),
      };

    case 'AGENT_END':
      return {
        ...state,
        // Mark the corresponding tool call as done (agent_name matches tool name)
        toolCalls: state.toolCalls.map((tc) =>
          tc.name === action.agentName && tc.status === 'calling'
            ? { ...tc, status: 'done' as const }
            : tc,
        ),
        agentExecutions: state.agentExecutions.map((ae) =>
          ae.agentName === action.agentName && ae.status === 'running'
            ? {
                ...ae,
                status: 'done' as const,
                resultSummary: action.resultSummary,
                usage: action.usage,
                durationMs: action.durationMs,
              }
            : ae,
        ),
      };

    case 'USAGE_REPORT':
      return { ...state, usageReport: action.report };

    case 'MESSAGE_END':
    case 'ERROR':
      // Safety net: finalize thinking if still active
      if (state.thinking?.status === 'thinking') {
        return { ...state, thinking: { ...state.thinking, status: 'done' } };
      }
      return state;
  }
}
