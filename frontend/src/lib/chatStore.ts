export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'calling' | 'done' | 'error';
}

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface AgentToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: Record<string, unknown>;
  status: 'calling' | 'done' | 'error';
}

export interface AgentExecution {
  agentName: string;
  agentLabel: string;
  task: string;
  toolCallId?: string;
  status: 'running' | 'done' | 'error';
  toolCalls: AgentToolCall[];
  tokens?: string;
  resultSummary?: string;
  usage?: TokenUsage;
  durationMs?: number;
}

export interface UsageReport {
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  agentUsage: Record<string, TokenUsage>;
}

export interface ThinkingBlock {
  id?: string;
  content: string;
  status: 'thinking' | 'done';
  type?: string;
  effort?: string;
  durationMs?: number;
  budgetTokens?: number;
  operationId?: string;
}

export interface TextBlock {
  id: string;
  content: string;
}

export type ContentBlock =
  | { type: 'thinking'; thinkingId: string }
  | { type: 'text'; textBlockId: string }
  | { type: 'toolCall'; toolCallId: string }
  | { type: 'agent'; agentName: string };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** @deprecated Use textBlocks instead. Kept for backward compat with localStorage. */
  content: string;
  textBlocks?: TextBlock[];
  toolCalls?: ToolCall[];
  agentExecutions?: AgentExecution[];
  usageReport?: UsageReport;
  /** @deprecated Use thinkingBlocks instead. Kept for backward compat with localStorage. */
  thinking?: ThinkingBlock;
  thinkingBlocks?: ThinkingBlock[];
  contentOrder?: ContentBlock[];
}

export interface SystemVars {
  origin_country: string;
  nationality: string;
  destination_country: string;
  objective: string;
  additional_info: string;
  locale: string;
}

export interface Chat {
  id: string;
  systemVars: SystemVars;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const CHATS_KEY = 'chats';

export function loadChats(): Chat[] {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Chat[];
  } catch {
    return [];
  }
}

export function saveChats(chats: Chat[]): void {
  try {
    localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
  } catch {
    // quota exceeded or unavailable
  }
}

export function createChat(systemVars: SystemVars, initialMessages: ChatMessage[] = []): Chat {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    systemVars,
    messages: initialMessages,
    createdAt: now,
    updatedAt: now,
  };
}

export function deleteChat(chats: Chat[], id: string): Chat[] {
  return chats.filter((c) => c.id !== id);
}

export function updateChatMessages(chats: Chat[], id: string, messages: ChatMessage[]): Chat[] {
  return chats.map((c) => {
    if (c.id !== id) return c;
    const hasNewMessages = messages.length > c.messages.length;
    return { ...c, messages, updatedAt: hasNewMessages ? Date.now() : c.updatedAt };
  });
}
