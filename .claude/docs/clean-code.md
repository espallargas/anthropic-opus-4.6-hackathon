# Clean Code

## Naming

**Autodescritivos** - sem nomes genericos (`data`, `info`, `temp`, `handler`).

| Tipo | Padrao | Exemplos |
|------|--------|----------|
| Booleanos | `is*`, `has*`, `can*`, `should*` | `isLoading`, `hasError`, `canEdit` |
| Collections | plural | `users`, `items`, `orderIds` |
| Funcoes | verbo + substantivo | `createUser`, `validateEmail` |
| Handlers | `on*` (nunca `handle*`) | `onClick`, `onSubmit` |

Sem mapeamento mental: `users.forEach(user => sendEmail(user.email))` nao `u => sendEmail(u.e)`.

## Funcoes

- Uma funcao = uma responsabilidade
- Max 2 parametros (use objeto para mais)
- Early returns / guard clauses para reduzir nesting

## TypeScript

- Nunca `any` - usar `unknown` quando necessario
- Preferir union literals a `string`/`number` genericos
- Discriminated unions para estados com dados associados
- Exportar types do arquivo que os define

## Comentarios

**Codigo autodocumentado > comentarios.** Refatore ao inves de comentar.

- Nunca comentar "o que" o codigo faz
- Nunca deixar dead code comentado
- So comentar "por que" em decisoes nao-obvias
- TODOs com contexto: `// TODO(scope): descricao`
