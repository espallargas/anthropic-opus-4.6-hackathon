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
  agentUsage: Record<string, TokenUsage>;
}

export interface ThinkingBlock {
  content: string;
  status: 'thinking' | 'done';
  type?: string;
  budgetTokens?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  agentExecutions?: AgentExecution[];
  usageReport?: UsageReport;
  thinking?: ThinkingBlock;
}

export interface SystemVars {
  origin_country: string;
  nationality: string;
  destination_country: string;
  objective: string;
  additional_info: string;
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

export function createChat(systemVars: SystemVars): Chat {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    systemVars,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function deleteChat(chats: Chat[], id: string): Chat[] {
  return chats.filter((c) => c.id !== id);
}

export function updateChatMessages(chats: Chat[], id: string, messages: ChatMessage[]): Chat[] {
  return chats.map((c) => (c.id === id ? { ...c, messages, updatedAt: Date.now() } : c));
}
