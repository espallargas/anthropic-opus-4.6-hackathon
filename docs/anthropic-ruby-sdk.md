# Anthropic Ruby SDK — Guia Prático

> gem `anthropic` v1.19.0 — [github.com/anthropics/anthropic-sdk-ruby](https://github.com/anthropics/anthropic-sdk-ruby)

---

## 1. Setup

```ruby
gem "anthropic", "~> 1.19.0"
```

```ruby
client = Anthropic::Client.new(
  api_key:  ENV["ANTHROPIC_API_KEY"],  # obrigatório (lê do ENV por padrão)
  timeout:  600.0,                     # segundos (padrão: 10 min)
  max_retries: 2                       # tentativas em caso de falha
)
```

---

## 2. Mensagem simples

```ruby
message = client.messages.create(
  model:      "claude-opus-4-6",
  max_tokens: 1024,
  messages:   [{ role: :user, content: "Olá, Claude!" }]
)

puts message.content.first.text   # => "Olá! Como posso ajudar?"
puts message.usage.input_tokens   # => 12
puts message.usage.output_tokens  # => 8
puts message.stop_reason          # => :end_turn
```

---

## 3. System prompt + temperatura

```ruby
message = client.messages.create(
  model:       "claude-opus-4-6",
  max_tokens:  1024,
  system:      "Responda sempre em português, de forma concisa.",
  temperature: 0.7,
  messages:    [{ role: :user, content: "What is Ruby?" }]
)
```

---

## 4. Conversa multi-turn

Basta alternar `user` e `assistant` no array de mensagens:

```ruby
messages = [
  { role: :user,      content: "Meu nome é Pedro." },
  { role: :assistant, content: "Prazer, Pedro! Como posso ajudar?" },
  { role: :user,      content: "Qual é o meu nome?" }
]

message = client.messages.create(
  model: "claude-opus-4-6", max_tokens: 256, messages: messages
)
# => "Seu nome é Pedro."
```

---

## 5. Streaming

```ruby
stream = client.messages.stream(
  model:      "claude-opus-4-6",
  max_tokens: 1024,
  messages:   [{ role: :user, content: "Conte uma piada" }]
)

# Opção A: iterar por eventos tipados
stream.each do |event|
  case event.type
  when :text         then print event.text       # cada chunk de texto
  when :message_stop then puts "\n[FIM]"         # stream terminou
  end
end

# Opção B: só o texto (mais simples)
stream.text.each { |chunk| print chunk }

# Opção C: pegar resultado final após consumir
stream.each {}                          # consome todo o stream
puts stream.accumulated_text            # texto completo concatenado
msg = stream.accumulated_message        # objeto Message completo
```

**Eventos disponíveis no `.each`:**

| Tipo | Campos | Quando |
|------|--------|--------|
| `:text` | `event.text`, `event.snapshot` | Cada chunk de texto |
| `:thinking` | `event.thinking`, `event.snapshot` | Chunks de raciocínio |
| `:input_json` | `event.partial_json` | Input de tool use |
| `:message_stop` | `event.message` | Stream terminou |
| `:content_block_stop` | `event.index`, `event.content_block` | Bloco de conteúdo terminou |

---

## 6. Tool use (function calling)

### Definir a tool

```ruby
tools = [{
  name: "buscar_clima",
  description: "Retorna o clima atual de uma cidade",
  input_schema: {
    type: :object,
    properties: {
      cidade: { type: :string, description: "Nome da cidade" }
    },
    required: [:cidade]
  }
}]
```

### Enviar e processar

```ruby
# 1) Primeira chamada — Claude decide usar a tool
response = client.messages.create(
  model: "claude-opus-4-6", max_tokens: 1024,
  messages: [{ role: :user, content: "Como está o clima em SP?" }],
  tools: tools
)

# 2) Se stop_reason == :tool_use, processar
if response.stop_reason == :tool_use
  tool_block = response.content.find { |b| b.type == :tool_use }

  # Executar sua lógica
  resultado = "Ensolarado, 28°C"  # simulação

  # 3) Enviar resultado de volta
  final = client.messages.create(
    model: "claude-opus-4-6", max_tokens: 1024,
    messages: [
      { role: :user,      content: "Como está o clima em SP?" },
      { role: :assistant, content: response.content },
      { role: :user,      content: [{
        type: :tool_result,
        tool_use_id: tool_block.id,
        content: resultado
      }]}
    ],
    tools: tools
  )

  puts final.content.first.text
end
```

### tool_choice

```ruby
{ type: :auto }                    # Claude decide (padrão)
{ type: :any }                     # obriga usar alguma tool
{ type: :tool, name: "buscar_clima" }  # obriga usar essa tool específica
{ type: :none }                    # proíbe usar tools
```

---

## 7. Extended thinking

```ruby
response = client.messages.create(
  model:      "claude-opus-4-6",
  max_tokens: 8000,
  thinking:   { type: :enabled, budget_tokens: 4000 },
  messages:   [{ role: :user, content: "Resolva: integral de x²·sin(x) dx" }]
)

response.content.each do |block|
  case block.type
  when :thinking then puts "[Raciocínio] #{block.thinking}"
  when :text     then puts "[Resposta]   #{block.text}"
  end
end
```

`thinking: { type: :adaptive }` deixa o Claude decidir quando pensar.

---

## 8. Conteúdo multimodal (imagens)

```ruby
require "base64"

image_data = Base64.strict_encode64(File.read("foto.jpg"))

message = client.messages.create(
  model: "claude-opus-4-6", max_tokens: 1024,
  messages: [{
    role: :user,
    content: [
      { type: :image, source: { type: :base64, media_type: "image/jpeg", data: image_data } },
      { type: :text, text: "O que tem nessa imagem?" }
    ]
  }]
)
```

---

## 9. Error handling

```ruby
begin
  client.messages.create(...)
rescue Anthropic::Errors::AuthenticationError    # 401 — API key inválida
  puts "Chave inválida"
rescue Anthropic::Errors::RateLimitError         # 429 — limite de requisições
  puts "Rate limited, aguarde"
rescue Anthropic::Errors::BadRequestError        # 400 — request malformada
  puts "Parâmetros inválidos"
rescue Anthropic::Errors::APIStatusError => e    # qualquer erro HTTP
  puts "HTTP #{e.status}: #{e.message}"
rescue Anthropic::Errors::APITimeoutError        # timeout
  puts "Timeout"
rescue Anthropic::Errors::APIConnectionError     # rede
  puts "Sem conexão"
end
```

---

## 10. Modelos disponíveis

| Model ID | Perfil |
|----------|--------|
| `claude-opus-4-6` | Mais inteligente, agentes e coding |
| `claude-sonnet-4-5` | Equilíbrio performance/custo |
| `claude-haiku-4-5` | Rápido e barato |

---

## 11. Contar tokens (sem fazer request)

```ruby
count = client.messages.count_tokens(
  model: "claude-opus-4-6",
  messages: [{ role: :user, content: "Texto grande aqui..." }]
)

puts count.input_tokens  # => 42
```

---

## Referência rápida

```ruby
# Simples
client.messages.create(model:, messages:, max_tokens:)

# Streaming
client.messages.stream(model:, messages:, max_tokens:).each { |e| ... }

# Com system prompt
client.messages.create(..., system: "...")

# Com tools
client.messages.create(..., tools: [...], tool_choice: { type: :auto })

# Com thinking
client.messages.create(..., thinking: { type: :enabled, budget_tokens: 4000 })

# Contar tokens
client.messages.count_tokens(model:, messages:)
```
