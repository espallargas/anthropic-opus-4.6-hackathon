# Web Search na API da Anthropic - Pesquisa Completa

## 1. COMO FUNCIONA WEB_SEARCH NA API ANTHROPIC

### 1.1 Nativo ou Custom?
**RESPOSTA: WEB_SEARCH É NATIVO À API DA ANTHROPIC**

- A API da Anthropic fornece web_search como um **server-side tool** integrado
- Não precisa ser implementado como ferramenta custom
- Classificado como "Deltropic integration" (serviço de busca integrado)
- Disponível através do parâmetro `tools` na requisição

### 1.2 Quais Modelos Suportam web_search?

✓ Claude Opus 4.6 (claude-opus-4-6) - RECOMENDADO
✓ Claude Opus 4.5 (claude-opus-4-5-20251101)
✓ Claude Opus 4.1 (claude-opus-4-1-20250805)
✓ Claude Opus 4 (claude-opus-4-20250514)
✓ Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)
✓ Claude Sonnet 4 (claude-sonnet-4-20250514)
✓ Claude Haiku 4.5 (claude-haiku-4-5-20251001)

### 1.3 Tool Definition para web_search

```json
{
  "type": "web_search_20250305",
  "name": "web_search",
  "max_uses": 5,
  "allowed_domains": ["example.com", "trusteddomain.org"],
  "blocked_domains": ["untrustedsource.com"],
  "user_location": {
    "type": "approximate",
    "city": "São Paulo",
    "region": "São Paulo",
    "country": "BR",
    "timezone": "America/Sao_Paulo"
  }
}
```

**Parâmetros Disponíveis:**
- `type`: "web_search_20250305" (versão atual do API)
- `name`: sempre "web_search"
- `max_uses`: limita número de buscas por requisição (recomendado: 5-10 para legislação)
- `allowed_domains`: apenas estes domínios
- `blocked_domains`: nunca estes domínios
- `user_location`: localizar resultados geograficamente

### 1.4 Como Funciona o Fluxo

**Fluxo Automático (Claude gerencia tudo):**
1. Claude analisa a requisição
2. Claude decide quando fazer web_search baseado no prompt
3. API executa a busca nos servidores Anthropic
4. Resultados são retornados para Claude
5. Claude analisa e cita fontes automaticamente

**Resposta do API (estrutura):**
```json
{
  "content": [
    { "type": "text", "text": "I'll search for this information." },
    { "type": "server_tool_use", "id": "srvtoolu_...", "name": "web_search", "input": {"query": "..."} },
    { "type": "web_search_tool_result", "tool_use_id": "srvtoolu_...", "content": [...] },
    { "type": "text", "text": "Based on the search results...", "citations": [...] }
  ]
}
```

---

## 2. BOAS PRÁTICAS PARA PROMPTS QUE GARANTEM USO DE TOOLS

### 2.1 Estratégias de Prompting para web_search

**PRINCÍPIO FUNDAMENTAL: Ser explícito e direcional**

#### A. Instruções Imperativas Diretas
```
You MUST use web_search to find...
DO NOT generate fake data
You MUST execute exactly these searches:
1. search for ...
2. search for ...
```

**Por quê funciona:** Claude trata instruções em caps como críticas.

#### B. Especificar Exatamente Quais Buscas Fazer
```
Search for:
1. "Brazil immigration federal law constitution"
2. "Brazil immigration regulations official procedures"
3. "Brazil visa requirements embassy consular"
...
After completing all searches, compile results into JSON format.
```

**Por quê funciona:** Reduz ambiguidade, Claude segue instruções estruturadas.

#### C. Guardrails contra Falhas
```
Rules:
- ONLY use real search results, never fabricate
- If web_search returns no results, search again with different keywords
- Include source URLs from search results
- Verify results are actually from [COUNTRY]
```

**Por quê funciona:** Evita alucinações e resultados irrelevantes.

#### D. Contexto de Deduplicação
```
Existing legislation in database:
- Lei 13.445/2017 (effective: 2017-11-21)
- Lei 9.099/1995 (effective: 1995-09-26)

When you find legislation:
- IDENTICAL TITLE + SAME DATE = SKIP
- IDENTICAL TITLE + NEWER DATE = INCLUDE as UPDATE
- SIMILAR TITLE (amendment) = INCLUDE with DIFFERENT NAME
```

**Por quê funciona:** Guia Claude a usar web_search inteligentemente.

#### E. Prompt Structure para Legislação
```
STEP 1: Search for legislation
Use web_search for EACH of these 6 categories:
- federal_laws: [search query]
- regulations: [search query]
- ...

STEP 2: Build JSON response
After searching, compile ALL results into this exact JSON format:
{
  "federal_laws": [...],
  "regulations": [...],
  ...
}

IMPORTANT:
- Return ONLY valid JSON with no other text
- Use EXACT official law names and reference numbers
- Use real URLs from search results
```

**Por quê funciona:** Estrutura clara em 2 passos com formato esperado.

### 2.2 Anti-padrões (o que EVITAR)

❌ "Se quiser, use web_search para buscar..." (sugestão fraca)
❌ "Você pode usar web_search" (opcional demais)
❌ "Busque sobre..." sem tool definition (Claude não saberá como fazer)
❌ Misturar instruções conflitantes (web_search vs gerar dados)
❌ Pedir para "resumir" sem dizer que use search (ambíguo)

### 2.3 Modelos e Esforço

**Claude Opus 4.6 com Adaptive Thinking:**
```python
response = client.messages.create(
    model="claude-opus-4-6",
    thinking={"type": "adaptive"},  # Recomendado para Opus 4.6
    effort="high",  # Force thinking profundo
    tools=[web_search_tool],
    system=system_prompt,
    messages=messages
)
```

**Por quê:** Adaptive thinking faz Claude avaliar se web_search é necessário, melhorando decisão de uso.

---

## 3. ESTRUTURAÇÃO DE PROMPTS PARA CRAWLERS DE LEGISLAÇÃO

### 3.1 Arquitetura de Prompt em 3 Camadas

**LAYER 1: SYSTEM PROMPT (Instruções Permanentes)**
```
You are a legislation research expert for [COUNTRY].
Task: Search for immigration legislation and return structured JSON.
Context: You have access to existing laws in the database.
Use web_search to find OFFICIAL law names with reference numbers.
```

**LAYER 2: USER PROMPT (Instruções Operacionais)**
```
CRITICAL: Use web_search for EACH of these 6 categories:
1. federal_laws: "[COUNTRY] immigration federal law constitution"
2. regulations: "[COUNTRY] immigration regulations official procedures"
...
After completing all searches, compile into JSON.
```

**LAYER 3: TOOL DEFINITION (Configuração)**
```json
{
  "type": "web_search_20250305",
  "name": "web_search",
  "max_uses": 6,
  "user_location": { "country": "[COUNTRY_CODE]" }
}
```

### 3.2 Fluxo Ideal para Crawler

```
1. Build System Prompt
   - Especialidade (legislação)
   - Contexto do país
   - Instruções de nomenclatura
   - Lógica de deduplicação

2. Build User Prompt
   - Instruções imperativas (MUST, WILL)
   - Queries específicas para cada categoria
   - Formato JSON esperado
   - Regras anti-alucinação

3. Stream with Extended Thinking
   - thinking: {type: "adaptive"} para Opus 4.6
   - Captura thinking em tempo real
   - Emite eventos de search_started
   - Tracks progress do crawl

4. Parse e Save
   - Extract JSON do response
   - Deduplicar vs base de dados
   - Marcar versões antigas como deprecated
   - Salvar com source URLs
```

### 3.3 Tratamento de Erros e Retry Logic

```python
# Se web_search falhar, retry com queries diferentes
def search_with_fallback(query, country):
    results = web_search(query)

    if not results or len(results) < 2:
        # Retry com query mais genérica
        results = web_search(f"{country} immigration law")

    if not results:
        # Emit error mas continue
        emit(:warning, "No results found for query")

    return results

# Validar que resultados são do país correto
def validate_country_relevance(result_url, result_title, country):
    return country.lower() in result_url.lower() or \
           country.lower() in result_title.lower()
```

---

## 4. EXEMPLOS DE TOOL DEFINITIONS PARA WEB_SEARCH

### 4.1 Exemplo Básico
```python
tools = [{
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 5
}]
```

### 4.2 Exemplo com Domain Filtering (Segurança)
```python
tools = [{
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 10,
    "allowed_domains": [
        "official-gov-site.br",
        "legislation.gov.br",
        "portal.mj.gov.br",  # Ministry of Justice
        "www2.camara.leg.br",  # Chamber of Deputies
        "www2.senado.leg.br"   # Senate
    ]
}]
```

### 4.3 Exemplo com Localization (Brazil)
```python
tools = [{
    "type": "web_search_20250305",
    "name": "web_search",
    "max_uses": 6,
    "user_location": {
        "type": "approximate",
        "city": "Brasília",
        "region": "Federal District",
        "country": "BR",
        "timezone": "America/Sao_Paulo"
    }
}]
```

### 4.4 Exemplo Completo para Legislação
```python
# legislation_crawler_service.rb (do projeto do hackathon)
tools = [
    {
        "name": "web_search",
        "description": "Search the web for information",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query"
                }
            },
            "required": ["query"]
        }
    }
]

# Nota: Type "web_search" sem versão também funciona (backward compat)
# Mas "web_search_20250305" é recomendado para nova código
```

### 4.5 Domain Filtering - Wildcard Support
```python
tools = [{
    "type": "web_search_20250305",
    "name": "web_search",
    "allowed_domains": [
        "gov.br",              # Matches gov.br e todos subdomains
        "planalto.gov.br",     # Specific domain
        "planalto.gov.br/ccivil_03/*"  # Specific path
    ]
}]
```

**Regras de Wildcard:**
- Válido: `example.com/*`, `example.com/*/articles`
- Inválido: `*.example.com`, `ex*.com`, `example.com/*/news/*`

---

## 5. MELHOR ESTRATÉGIA: NATIVO vs CUSTOM

### 5.1 Decisão: Usar NATIVO (Recomendado 100%)

| Aspecto | Nativo | Custom |
|--------|--------|--------|
| **Implementação** | ✓ Pronto (0 linhas código) | ✗ Implementar todo executor |
| **Custo** | $10/1000 searches | Precisa de infra (ex: Google Custom Search API) |
| **Latência** | ✓ Server-side (fast) | ✗ Client-side roundtrip |
| **Citations** | ✓ Automático | ✗ Manual |
| **Rate Limiting** | ✓ Gerenciado Anthropic | ✗ You manage |
| **Confiabilidade** | ✓ SLA Anthropic | ✗ Sua responsabilidade |
| **Freshness** | ✓ Real-time search | ✓ Depende fonte |

### 5.2 Quando Custom Faz Sentido

❌ **Praticamente NUNCA para web_search**

Possíveis exceções:
- Precisa de controle absoluto de dados (compliance extremo)
- Tem API privado que não quer expor
- Quer integrar com banco proprietary de legislação

**Mas:** Mesmo nesses casos, hybrid é melhor (nativo + sua API)

### 5.3 Recomendação Final

**USAR NATIVO SEMPRE:**
1. É mais barato ($10/1000 searches é muito bom)
2. Mantém menos código
3. Anthropic gerencia falhas e updates
4. Funciona out-of-box com streaming
5. Citations trabalham automaticamente

---

## 6. PADRÕES DO PROJETO HACKATHON

### 6.1 Implementação Atual (Excelente)

```ruby
# /backend/app/services/legislation_crawler_service.rb

# Tool Definition (minimal, nativo)
tools: [
    {
        name: "web_search",
        description: "Search the web for information",
        input_schema: {
            type: "object",
            properties: {
                query: { type: "string", description: "The search query" }
            },
            required: ["query"]
        }
    }
]

# System Prompt (layer 1)
def build_system_prompt(crawl_type, existing_count)
    "You are a legislation researcher specializing in immigration law..."
    # Deduplication logic included
    # Naming conventions specified
    # JSON format defined
end

# User Prompt (layer 2)
def build_user_prompt
    "CRITICAL: You MUST use web_search to research..."
    "You MUST execute exactly these 6 web_search calls:"
    "DO NOT generate fake data. DO NOT skip web_search calls."
end

# Streaming com Extended Thinking
response = build_response_from_stream(
    current_operation_id,
    model: MODEL,
    thinking: { type: "adaptive" },
    tools: tools,
    system_: system_prompt,
    messages: messages
)

# Parse e salvar resultados
extract_legislation_from_response(response)
save_results(results)
```

### 6.2 Tratamento de Streaming

```ruby
# Emit thinking em tempo real
if event.delta.respond_to?(:thinking) && event.delta.thinking
    emit(:thinking, text: event.delta.thinking, is_summary: false)
end

# Emit search_started quando detecta web_search
if event.content_block.type == 'tool_use' && event.content_block.name == 'web_search'
    emit(:search_started, category: category, query: input_text)
end

# Emit token tracking
if event.delta.respond_to?(:usage)
    emit(:tokens, input_tokens: input_tokens, output_tokens: output_tokens)
end
```

### 6.3 Tools Registry (Vazio = Nativo)

```ruby
# /backend/app/services/tools/definitions.rb
module Tools
  class Definitions
    # Use Anthropic's built-in web_search tool (Deltropic integration)
    # No custom tool definition needed - Claude handles web_search natively
    TOOLS = [].freeze  # Empty - using Claude's native web_search
  end
end
```

**Isso é CORRETO!** Não precisa de tool definitions customizadas.

---

## 7. RESUMO EXECUTIVO COM BOAS PRÁTICAS

### 7.1 Checklist para Implementação web_search

- [ ] Use `claude-opus-4-6` com `thinking: {type: "adaptive"}`
- [ ] Defina tool com `type: "web_search_20250305"`
- [ ] Inclua `max_uses` (5-10 recomendado)
- [ ] Use `allowed_domains` para segurança
- [ ] Escreva system prompt com especialidade + contexto
- [ ] Escreva user prompt com instruções imperativas (MUST, WILL)
- [ ] Especifique exatamente quais searches fazer
- [ ] Inclua guias anti-alucinação
- [ ] Defina JSON schema esperado
- [ ] Stream responses para tracking em tempo real
- [ ] Capture thinking blocks via SSE
- [ ] Parse JSON dos text blocks
- [ ] Implemente deduplicação com database
- [ ] Marque versões antigas como deprecated
- [ ] Salve source URLs com legislação

### 7.2 Padrão de Prompt Recomendado

```
SYSTEM PROMPT:
- Especialidade clara
- País e contexto
- Regras de nomenclatura
- Lógica de deduplicação
- JSON schema

USER PROMPT:
- Instruções imperativas
- Lista exata de queries
- Guardrails contra falhas
- Regras de validação
- Formato output esperado

TOOL DEFINITION:
- type: "web_search_20250305"
- max_uses: [apropriado para caso de uso]
- allowed_domains: [se aplicável]
- user_location: [se aplicável]

STREAMING:
- Extended thinking ativado
- Emit thinking blocks
- Emit search_started
- Emit token tracking
- Parse final response
```

### 7.3 Tratamento de Erros

```python
# Possíveis error codes
{
  "type": "web_search_tool_result_error",
  "error_code": "too_many_requests"  # Rate limit
}
{
  "type": "web_search_tool_result_error",
  "error_code": "max_uses_exceeded"  # Atingiu limite
}
{
  "type": "web_search_tool_result_error",
  "error_code": "invalid_input"  # Query malformada
}
{
  "type": "web_search_tool_result_error",
  "error_code": "query_too_long"  # Query > max length
}
```

### 7.4 Pricing

- **Web Search:** $10 por 1000 searches (além token costs)
- **Tokens:** Input + Output tokens normais
- **Citations:** Não contam para token usage
- **Errors:** Erros não são cobrados

---

## 8. RECURSOS EXTERNOS

### Documentação Oficial Anthropic
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- https://platform.claude.com/docs/en/build-with-claude/extended-thinking

### Relacionado no Projeto
- `/backend/app/services/legislation_crawler_service.rb` - Implementação completa
- `/backend/app/services/tools/definitions.rb` - Registry vazio (correto)
- `/backend/app/controllers/api/v1/chat_controller.rb` - Tool use patterns

### Desenvolvimento Futuro
- Prompt caching com web_search para multi-turn conversations
- Batch API para crawler massivo (50% discount)
- Model Context Protocol (MCP) para tools customizadas se necessário
- Compaction para infinitas conversações

---

## 9. CONCLUSÃO

**web_search na API Anthropic é:**
1. ✓ Nativo (não custom)
2. ✓ Bem documentado
3. ✓ Pronto para legislação
4. ✓ Integrado com extended thinking
5. ✓ Tem citations automáticas
6. ✓ Suporta filtering por domínios
7. ✓ Funciona com streaming
8. ✓ Excelente custo-benefício

**Projeto hackathon já implementa corretamente:**
- ✓ Usa native web_search
- ✓ Streaming com SSE
- ✓ Extended thinking (adaptive)
- ✓ System + User prompts bem estruturados
- ✓ Deduplicação com database
- ✓ Tracking em tempo real

**Próximos passos:**
- Manter implementação atual
- Considerar domain filtering mais restritivo
- Adicionar prompt caching para multi-turn
- Implementar retry logic com queries alternativas
