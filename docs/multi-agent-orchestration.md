# Plano: Multi-Agent Orchestration

## Context

O sistema já tem um agentic loop single-agent com tool use e SSE streaming funcionando. O próximo passo é um **sistema multi-agente** onde um orquestrador delega tarefas para agentes especialistas, cada um com system prompt e tools próprios. A UI mostra cada agente rodando com loading individual e tool calls aninhados.

Padrão de referência: **OpenAI Swarm** (agente = instructions + tools, handoff via tool call) e **Anthropic orchestrator-workers** (orquestrador delega via `delegate_to_agent` tool, sub-agente roda loop próprio, resultado volta como tool_result).

## Arquitetura

```
User msg → POST /api/v1/chat → Rails abre SSE

  Orchestrator loop (max 10 turns):
    1. Claude (orchestrator) recebe mensagem + tool `delegate_to_agent`
    2. Tokens do orquestrador → SSE { type: "token" }
    3. Se stop_reason == "tool_use" e tool == "delegate_to_agent":
       - Instancia AgentRunner pro agente especialista
       - AgentRunner roda sub-loop (max 5 turns) com tools do agente:
           SSE { agent_start } → { agent_tool_use_start } → { agent_tool_use_result } → { agent_end }
       - Resultado textual volta pro orquestrador como tool_result
       - Volta pro passo 1
    4. Se stop_reason == "end_turn": break (orquestrador sintetiza resposta final)

  SSE { type: "message_end" }
```

## Steps

### 1. Criar framework de agentes

**Criar:** `backend/app/services/agents/base.rb`

DSL declarativa para definir agentes:

```ruby
module Agents
  class Base
    class << self
      attr_reader :agent_name, :agent_label, :agent_description, :system_prompt, :tool_names

      private

      def name_is(v)       = @agent_name = v
      def label(v)         = @agent_label = v
      def description(v)   = @agent_description = v
      def prompt(v)        = @system_prompt = v
      def uses_tools(*t)   = @tool_names = t
    end
  end
end
```

### 2. Criar agentes especialistas

**Criar:** `backend/app/services/agents/visa_agent.rb`

```ruby
module Agents
  class VisaAgent < Base
    name_is 'visa_agent'
    label 'Especialista em Vistos'
    description 'Researches visa types, requirements, eligibility, and application procedures.'
    prompt <<~P
      You are a visa requirements specialist. Use your tools to give precise answers.
      Respond in Portuguese (Brazil). Be concise — your output goes to an orchestrator.
    P
    uses_tools :search_visa_requirements
  end
end
```

**Criar:** `backend/app/services/agents/document_agent.rb` — Mesmo padrão, foco em documentação/apostila.

**Criar:** `backend/app/services/agents/timeline_agent.rb` — Mesmo padrão, foco em prazos.

### 3. Criar registry de agentes

**Criar:** `backend/app/services/agents/registry.rb`

```ruby
AGENTS = { 'visa_agent' => VisaAgent, 'document_agent' => DocumentAgent, 'timeline_agent' => TimelineAgent }
def self.find(name) → agent class
def self.descriptions_for_tool_schema → string com "name: description" de cada agente
```

### 4. Criar orquestrador

**Criar:** `backend/app/services/agents/orchestrator.rb`

- `system_prompt_for(system_vars)` — prompt com contexto do usuário + lista de agentes disponíveis
- Única tool: `delegate_to_agent(agent_name, task)` com `enum` dos agent names
- Instruções: "delegue para especialistas, sintetize uma resposta unificada em português"

### 5. Refatorar Tools::Definitions para lookup por nome

**Modificar:** `backend/app/services/tools/definitions.rb`

- Mudar de array `TOOLS` para hash `TOOL_SCHEMAS` keyed por symbol
- Adicionar `self.for_agent(tool_names)` que retorna array filtrado
- Manter `TOOLS` como alias para backwards compat

### 6. Criar AgentRunner

**Criar:** `backend/app/services/agent_runner.rb`

Roda o loop agentic de um sub-agente, emitindo SSE com prefixo `agent_*`:

- `initialize(agent_class, task:, system_vars:, sse:, client:)`
- `run` → loop (max 5 turns):
  - Stream Claude com system prompt + tools do agente
  - `:text` → `SSE agent_token`
  - `:content_block_stop` (tool_use) → `SSE agent_tool_use_start` → executa tool → `SSE agent_tool_use_result`
  - `:message_stop` → checa stop_reason, continua ou break
- Emite `agent_start` no início, `agent_end` no final
- Retorna texto final do agente (que vai como tool_result pro orquestrador)
- `parse_tool_input` extraído como método privado (reutiliza lógica existente)

### 7. Reescrever ChatController com orchestrator loop

**Modificar:** `backend/app/controllers/api/v1/chat_controller.rb`

- System prompt vem de `Agents::Orchestrator.system_prompt_for(system_vars)`
- Tools vem de `Agents::Orchestrator.tools`
- No loop, quando `delegate_to_agent` é chamada:
  - `execute_agent_delegation(tb, system_vars, sse, client)` → cria AgentRunner, roda, retorna tool_result
- Fallback `execute_direct_tool(tb, sse)` para tools diretas (safety)
- Helper `build_system_vars` extrai e sanitiza params
- Remove `SYSTEM_PROMPT_TEMPLATE` e `DEFAULT_SYSTEM_PROMPT` (moveram pro Orchestrator)

### 8. Estender tipos no useChat

**Modificar:** `frontend/src/hooks/useChat.ts`

Novos tipos:

```typescript
interface AgentToolCall {
  id: string; name: string; input: Record<string, unknown>
  result?: Record<string, unknown>; status: 'calling' | 'done' | 'error'
}

interface AgentExecution {
  agentName: string; agentLabel: string; task: string
  status: 'running' | 'done' | 'error'
  toolCalls: AgentToolCall[]
  resultSummary?: string
}
```

- Adicionar `agentExecutions?: AgentExecution[]` em `ChatMessage`
- Parsear novos SSE events:
  - `agent_start` → push novo `AgentExecution` com `status: 'running'`
  - `agent_tool_use_start` → push `AgentToolCall` no agente correto
  - `agent_tool_use_result` → atualiza tool call pra `done`
  - `agent_end` → marca agente como `done`, salva `resultSummary`
- Manter handlers existentes de `token`, `tool_use_start`, `tool_use_result` (backwards compat)

### 9. Criar componente AgentCard

**Criar:** `frontend/src/components/AgentCard.tsx`

- Card com borda sólida, fundo sutil
- Header clicável (toggle expand/collapse):
  - `Loader2` spinning (azul) quando `running`, `CheckCircle2` (verde) quando `done`
  - Label do agente (português)
  - Chevron expand/collapse
- Body (quando expandido):
  - Task description em itálico
  - `ToolCallCard` para cada tool call do agente (reutiliza componente existente)
- Default: expandido enquanto running

### 10. Atualizar Chat.tsx

**Modificar:** `frontend/src/components/Chat.tsx`

- Importar `AgentCard`
- No render de assistant messages, entre toolCalls e content:
  ```tsx
  {msg.agentExecutions?.map((ae, i) => (
    <AgentCard key={`${ae.agentName}-${i}`} agent={ae} />
  ))}
  ```
- Não mostrar "..." se tem agentExecutions ativas e content vazio

### 11. Atualizar labels no ToolCallCard

**Modificar:** `frontend/src/components/ToolCallCard.tsx`

- Aceitar `AgentToolCall` além de `ToolCall` (mesma shape, sem mudança real no tipo)

## Protocolo SSE completo

| Evento | Campos | Fonte |
|--------|--------|-------|
| `message_start` | — | Controller |
| `token` | `token` | Controller (texto do orquestrador) |
| `agent_start` | `agent_name`, `agent_label`, `task` | AgentRunner |
| `agent_token` | `agent_name`, `token` | AgentRunner |
| `agent_tool_use_start` | `agent_name`, `tool_call_id`, `tool_name`, `tool_input` | AgentRunner |
| `agent_tool_use_result` | `agent_name`, `tool_call_id`, `result` | AgentRunner |
| `agent_end` | `agent_name`, `result_summary` | AgentRunner |
| `tool_use_start` | `tool_call_id`, `tool_name`, `tool_input` | Controller (fallback) |
| `tool_use_result` | `tool_call_id`, `result` | Controller (fallback) |
| `message_end` | — | Controller |
| `error` | `error` | Controller |

## Arquivos

| Acao | Arquivo |
|------|---------|
| Create | `backend/app/services/agents/base.rb` |
| Create | `backend/app/services/agents/registry.rb` |
| Create | `backend/app/services/agents/orchestrator.rb` |
| Create | `backend/app/services/agents/visa_agent.rb` |
| Create | `backend/app/services/agents/document_agent.rb` |
| Create | `backend/app/services/agents/timeline_agent.rb` |
| Create | `backend/app/services/agent_runner.rb` |
| Modify | `backend/app/services/tools/definitions.rb` |
| Modify | `backend/app/controllers/api/v1/chat_controller.rb` |
| Modify | `frontend/src/hooks/useChat.ts` |
| Create | `frontend/src/components/AgentCard.tsx` |
| Modify | `frontend/src/components/Chat.tsx` |

## Simplificações intencionais (hackathon)

- Sub-agentes rodam sequencialmente (sem paralelismo)
- Sem persistência de agent executions (só SSE + localStorage)
- Agentes não delegam entre si (só orquestrador delega)
- Sem streaming de tokens do sub-agente pro usuário (agent_token emitido mas UI pode ignorar)
- Mock data nas tools (sem APIs reais)

## Verificação

1. Enviar "Quais documentos preciso para visto de trabalho em Portugal?" → Orquestrador delega para `visa_agent` → AgentCard aparece com spinner → tool call aninhado → agente completa → orquestrador sintetiza resposta
2. Enviar pergunta sobre prazo → Orquestrador delega para `timeline_agent` → mesmo fluxo
3. Enviar pergunta que envolve dois agentes → Orquestrador delega para ambos sequencialmente → dois AgentCards
4. Enviar "oi" → Orquestrador responde direto sem delegar (só tokens)
5. Recarregar página → AgentCards persistem no localStorage
6. `cd frontend && yarn format && yarn build` — sem erros
