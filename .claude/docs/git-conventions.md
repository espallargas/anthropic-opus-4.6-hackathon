# Git Conventions

## Commits

**Formato:** `tipo(scope): descricao no passado em ingles`

### Tipos

| Tipo | Uso |
|------|-----|
| `feat` | Novas funcionalidades (inclui testes relacionados) |
| `fix` | Correcao de bugs |
| `refactor` | Mudancas sem alterar funcionalidade |
| `test` | Testes isolados |
| `docs` | Documentacao |
| `chore` | Dependencias, configs, scripts |

### Exemplos

```
feat(auth): added login form and validation
fix(button): fixed hover state in dark mode
refactor(api): extracted shared request handler
chore(deps): updated TypeScript to v5.7
```

### Regras

- Um commit = uma mudanca logica
- Commits atomicos e testaveis
- Mensagens descritivas e especificas
- Nao misturar features com refactoring
- NUNCA incluir `Co-Authored-By` nos commits
- NUNCA incluir emoji nos commits

## Branches

**Formato:** `tipo/descricao-clara`

Exemplos: `feat/user-authentication`, `fix/button-hover-state`

## Idiomas

- **Commits:** Ingles
- **Codigo:** Ingles
- **Comunicacao com usuario:** Portugues
