# CLAUDE.md

## What

Monorepo hackathon: Rails 8 API backend + React 19 / Vite 7 frontend.

**Stack**: Ruby 3.4.7 + Rails 8.1 (API-only), PostgreSQL 14, Redis | React 19, TypeScript, Tailwind CSS 4, Vite 7

**Structure**:
```
backend/   — Rails API-only (port 3000)
frontend/  — React + Vite (port 5173, proxies /api and /cable to backend)
bin/dev    — Starts both servers via foreman
```

## Why

Validate fast, iterate, ship. Working code > perfect architecture. When stuck: simplify scope, ask before creating abstractions.

## How

**Development**:
```bash
bin/dev                        # Start both servers
cd backend && bin/rails db:migrate
cd frontend && yarn format && yarn lint
```

**Configuration**:
- API routes under `/api/v1/`, controllers in `backend/app/controllers/api/v1/`
- Vite proxies `/api` and `/cable` to Rails automatically
- Environment variables via `direnv` (`.envrc`), secrets in `.env.local` (git-ignored)

## Code Quality

**Backend**: Rubocop + rubocop-rails enabled. See `.rubocop.yml` for pragmatic service exemptions.
**Frontend**: ESLint + Prettier (Airbnb-based, semicolons enforced). Run `yarn lint` and `yarn format` before commits.

**Principles**:
- DRY — eliminate duplication, extract constants
- Clean Code — small functions with clear names (Uncle Bob style)
- Early Returns — no nested conditionals, guard clauses
- Single Responsibility — one method = one job
- No debug logs in production code

## i18n

All user-facing text in the frontend **must** go through the `t()` function from `useI18n()` (`src/lib/i18n.tsx`). Never hardcode visible strings directly in JSX.

**Locales**: pt-BR (Portuguese), en (English), ar (Arabic, RTL)

- Translations live in `src/lib/i18n.tsx` inside the `dictionaries` object
- When adding or changing any visible text, **always** add the key to **all** dictionaries (pt-BR, en, ar)
- All dictionaries must have the exact same set of keys — no key in one without the others
- pt-BR values in Portuguese; en values in English; ar values in Arabic
- Pattern: `const { t } = useI18n();` then `t('section.key')` in JSX
- Country codes follow ISO 3166-1 alpha-2 (e.g. `countries.br`, `countries.us`)
- Language names in the locale picker are the only exception — they stay in their native language
- **Glossary**: `src/lib/i18n-glossary.md` documents every key with its meaning and UI context — consult it when translating and update it when adding new keys

**RTL support**:
- The i18n system exports `direction` (`'ltr'` | `'rtl'`) and sets `dir`/`lang` on `<html>` automatically
- Use `useDirection()` hook when JS needs to know the direction
- **Always use logical CSS properties** instead of physical ones:
  - `ms-*`/`me-*` instead of `ml-*`/`mr-*` (margin)
  - `ps-*`/`pe-*` instead of `pl-*`/`pr-*` (padding)
  - `start-*`/`end-*` instead of `left-*`/`right-*` (positioning)
  - `text-start`/`text-end` instead of `text-left`/`text-right`
  - `border-s-*`/`border-e-*` instead of `border-l-*`/`border-r-*`
- For directional icons (ChevronRight, SendHorizonal), add `rtl:-scale-x-100`
- For CSS `translateX` animations, use `[dir='rtl']` overrides in `index.css`
- Adding a new RTL locale: add to `Locale` type, `LOCALE_DIRECTION` map, `VALID_LOCALES` array, and the locale picker in `Navbar.tsx`

## Rules

- User speaks Portuguese, code and commits in English
- Follow existing patterns; don't over-engineer
- Commits: `type(scope): description` (feat, fix, refactor, test, docs, chore)
- One commit = one logical change; use descriptive messages
- Format before committing — let tools handle style

## Related Docs

- `.claude/docs/git-conventions.md` — Detailed commit/branch rules
- `.claude/docs/clean-code.md` — Naming, TypeScript, comment conventions
- `.claude/docs/design-system.md` — Color tokens, spacing, shared components, theme rules, RTL guidelines
- `frontend/src/lib/i18n-glossary.md` — Translation glossary with meaning/context for every i18n key

## Key Files

**Backend**:
- `app/services/legislation_crawler_service.rb` — Main crawler (streaming, tool use, extraction)
- `app/models/` — Country, Legislation with versioning support
- `app/lib/s_s_e_message_schema.rb` — SSE message validation
- `config/routes.rb`, `config/cable.yml` — Routing, WebSocket

**Frontend**:
- `src/lib/api.ts` — Typed fetch wrapper
- `src/lib/cable.ts` — Action Cable consumer
- `src/hooks/useChat.ts`, `useCable.ts` — Core hooks
- `src/components/CrawlProgressBox.tsx` — Real-time crawl UI
- `vite.config.ts` — Build config, Tailwind plugin
