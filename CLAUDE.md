# CLAUDE.md

## What

Monorepo hackathon: Rails 8 API backend + React 19 / Vite 7 frontend.
Stack: Ruby 3.4.7, Rails 8.1 (API-only), PostgreSQL 14, Redis, React 19, TypeScript, Tailwind CSS 4.

```
backend/   — Rails API-only (port 3000)
frontend/  — React + Vite (port 5173, proxies /api and /cable to backend)
bin/dev    — Starts both servers via foreman
```

## Why

Rapid prototyping for hackathon. Validate fast, iterate, ship. Working code > perfect architecture.
When stuck: simplify scope, don't add complexity. Ask before creating abstractions or adding dependencies.

## How

```bash
bin/dev                                  # Start both servers
cd backend && bin/rails db:migrate       # Run migrations
cd frontend && yarn build                # Production build
cd frontend && yarn format               # Format before committing
cd frontend && yarn lint                 # Lint check
```

API routes under `/api/v1/`. Controllers in `backend/app/controllers/api/v1/`.
Vite proxies `/api` and `/cable` to Rails automatically.

`direnv` manages env vars via `.envrc`. Credentials in `.env.local` (git-ignored).

## Rules

- User speaks Portuguese, code and commits in English
- Follow existing codebase patterns
- Don't polish what doesn't work yet
- Don't add explanatory comments on obvious code
- Run `yarn format` before committing frontend changes — let the linter handle style

## Commits

`type(scope): description` — feat, fix, refactor, test, docs, chore.
English. One commit = one logical change. NEVER Co-Authored-By. NEVER emoji.

## Docs

Task-specific instructions live in `.claude/docs/`. Read the relevant ones before starting work.

- `.claude/docs/git-conventions.md` — Commit format, branch naming, atomicity rules
- `.claude/docs/clean-code.md` — Naming, functions, TypeScript, and comment conventions

## Key files

- `backend/config/routes.rb` — API routes
- `backend/config/initializers/cors.rb` — CORS (allows localhost:5173)
- `backend/config/cable.yml` — Action Cable with Redis
- `backend/app/channels/ping_channel.rb` — WebSocket ping/pong channel
- `frontend/vite.config.ts` — Vite proxy + Tailwind plugin
- `frontend/src/lib/api.ts` — Typed fetch wrapper
- `frontend/src/lib/cable.ts` — Action Cable consumer singleton
- `frontend/src/hooks/useCable.ts` — WebSocket connection hook
- `Procfile.dev` — Foreman process definitions
