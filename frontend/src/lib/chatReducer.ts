import type {
  AgentExecution,
  ContentBlock,
  TextBlock,
  ThinkingBlock,
  ToolCall,
  UsageReport,
} from '@/lib/chatStore';
import type { ChatAction } from '@/lib/sseEventMapper';

export interface StreamState {
  content: string;
  textBlocks: TextBlock[];
  toolCalls: ToolCall[];
  agentExecutions: AgentExecution[];
  usageReport: UsageReport | null;
  thinkingBlocks: ThinkingBlock[];
  thinkingStartedAt: number | null;
  contentOrder: ContentBlock[];
}

export function createStreamState(): StreamState {
  return {
    content: '',
    textBlocks: [],
    toolCalls: [],
    agentExecutions: [],
    usageReport: null,
    thinkingBlocks: [],
    thinkingStartedAt: null,
    contentOrder: [],
  };
}

function activeThinkingIndex(blocks: ThinkingBlock[]): number {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].status === 'thinking') return i;
  }
  return -1;
}

function updateActiveThinking(
  blocks: ThinkingBlock[],
  updater: (block: ThinkingBlock) => ThinkingBlock,
): ThinkingBlock[] {
  const idx = activeThinkingIndex(blocks);
  if (idx === -1) return blocks;
  return blocks.map((b, i) => (i === idx ? updater(b) : b));
}

export function chatStreamReducer(state: StreamState, action: ChatAction): StreamState {
  switch (action.type) {
    case 'THINKING_START': {
      const thinkingId = crypto.randomUUID();
      const newBlock: ThinkingBlock = {
        id: thinkingId,
        content: '',
        status: 'thinking',
        type: action.thinkingType,
        effort: action.thinkingEffort,
      };
      // Add thinking block in chronological order (always at the end)
      const newThinkingBlock = { type: 'thinking' as const, thinkingId };
      return {
        ...state,
        thinkingStartedAt: Date.now(),
        thinkingBlocks: [...state.thinkingBlocks, newBlock],
        contentOrder: [...state.contentOrder, newThinkingBlock],
      };
    }

    case 'THINKING_TOKEN':
      return {
        ...state,
        thinkingBlocks: updateActiveThinking(state.thinkingBlocks, (b) => ({
          ...b,
          content: b.content + action.token,
        })),
      };

    case 'THINKING_END': {
      const durationMs = state.thinkingStartedAt ? Date.now() - state.thinkingStartedAt : undefined;
      return {
        ...state,
        thinkingStartedAt: null,
        thinkingBlocks: updateActiveThinking(state.thinkingBlocks, (b) => ({
          ...b,
          status: 'done' as const,
          durationMs,
        })),
      };
    }

    case 'TEXT_BLOCK_START': {
      const newBlock: TextBlock = {
        id: action.textBlockId,
        content: '',
      };
      return {
        ...state,
        textBlocks: [...state.textBlocks, newBlock],
        contentOrder: [
          ...state.contentOrder,
          { type: 'text' as const, textBlockId: action.textBlockId },
        ],
      };
    }

    case 'APPEND_TOKEN': {
      // For backward compatibility: if no text blocks exist, create one
      if (state.textBlocks.length === 0) {
        const textBlockId = crypto.randomUUID();
        return {
          ...state,
          content: state.content + action.token,
          textBlocks: [{ id: textBlockId, content: action.token }],
          contentOrder: [...state.contentOrder, { type: 'text' as const, textBlockId }],
        };
      }

      // Append to the last (active) text block
      const lastBlockIndex = state.textBlocks.length - 1;
      return {
        ...state,
        content: state.content + action.token,
        textBlocks: state.textBlocks.map((block, i) =>
          i === lastBlockIndex ? { ...block, content: block.content + action.token } : block,
        ),
      };
    }

    case 'TOOL_START':
      return {
        ...state,
        toolCalls: [...state.toolCalls, action.toolCall],
        contentOrder: [
          ...state.contentOrder,
          { type: 'toolCall' as const, toolCallId: action.toolCall.id },
        ],
      };

    case 'TOOL_DONE':
      return {
        ...state,
        toolCalls: state.toolCalls.map((tc) =>
          tc.id === action.toolCallId
            ? { ...tc, status: 'done' as const, result: action.result }
            : tc,
        ),
      };

    case 'AGENT_START': {
      // Only add agent block if not associated with a tool call
      // (tool-associated agents render inside ToolCallCard)
      const newContentOrder = action.toolCallId
        ? state.contentOrder
        : [...state.contentOrder, { type: 'agent' as const, agentName: action.agentName }];

      return {
        ...state,
        agentExecutions: [
          ...state.agentExecutions,
          {
            agentName: action.agentName,
            agentLabel: action.agentLabel,
            task: action.task,
            toolCallId: action.toolCallId,
            status: 'running',
            toolCalls: [],
          },
        ],
        contentOrder: newContentOrder,
      };
    }

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

    case 'AGENT_END': {
      const matchAgent = (ae: AgentExecution) => {
        if (action.toolCallId && ae.toolCallId) return ae.toolCallId === action.toolCallId;
        return ae.agentName === action.agentName && ae.status === 'running';
      };
      const matchToolCall = (tc: ToolCall) => {
        if (action.toolCallId) return tc.id === action.toolCallId && tc.status === 'calling';
        return tc.name === action.agentName && tc.status === 'calling';
      };
      return {
        ...state,
        toolCalls: state.toolCalls.map((tc) =>
          matchToolCall(tc) ? { ...tc, status: 'done' as const } : tc,
        ),
        agentExecutions: state.agentExecutions.map((ae) =>
          matchAgent(ae)
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
    }

    case 'USAGE_REPORT':
      return { ...state, usageReport: action.report };

    case 'MESSAGE_END':
    case 'ERROR': {
      // Safety net: finalize any active thinking blocks
      const hasActive = state.thinkingBlocks.some((b) => b.status === 'thinking');
      if (hasActive) {
        return {
          ...state,
          thinkingBlocks: state.thinkingBlocks.map((b) =>
            b.status === 'thinking' ? { ...b, status: 'done' as const } : b,
          ),
        };
      }
      return state;
    }
  }
}
