# i18n Setup — Custom React Context (Zero Dependencies)

## Context
The app has ~28 hardcoded Portuguese strings across 6 files. We need i18n for en + pt-BR, with easy extensibility for more languages. Only UI strings are translated — bot responses stay as-is.

## Approach
Custom React Context + typed locale files. No external library needed for 28 strings. TypeScript enforces completeness: each locale file must satisfy a `Translations` interface, so missing keys are compile errors.

## New Files

### `frontend/src/i18n/types.ts`
- `Translations` interface — flat object with all 28 keys (e.g. `'chat.emptyState'`, `'setup.title'`)
- `TranslationKey = keyof Translations`
- `LocaleConfig { code, label }`

### `frontend/src/i18n/locales/en.ts`
- Exports `en: Translations` with all English strings

### `frontend/src/i18n/locales/pt-BR.ts`
- Exports `ptBR: Translations` with all Portuguese strings (current hardcoded values)

### `frontend/src/i18n/context.tsx`
- `I18nProvider` — wraps app, stores locale in state + localStorage (`'app_locale'`)
- `useTranslation()` hook — returns `{ t, locale, setLocale, locales }`
- `t(key, vars?)` — returns translated string, supports `{{var}}` interpolation
- Auto-detects browser language on first visit (pt → pt-BR, else en)
- Fallback chain: current locale → en → raw key

### `frontend/src/i18n/index.ts`
- Re-exports everything

## Modified Files

### `frontend/src/main.tsx`
- Wrap `<App />` with `<I18nProvider>`

### `frontend/src/hooks/useChat.ts`
- Add optional `interruptedLabel` parameter (keeps hook free of i18n)
- Replace hardcoded `'*[resposta interrompida]*'` with the parameter

### `frontend/src/components/Chat.tsx`
- Call `useTranslation()`, pass `t('chat.responseInterrupted')` to `useChat()`
- Replace 4 strings: empty state, placeholder, stop button, send button

### `frontend/src/components/SetupForm.tsx`
- Call `useTranslation()`, replace 12 strings (title, description, all labels/placeholders, submit)

### `frontend/src/components/Sidebar.tsx`
- Call `useTranslation()`, replace 5 strings
- Add language toggle button (cycles through locales on click) using `Languages` icon
- Collapsed: icon only; expanded: icon + current language label

### `frontend/src/components/Globe.tsx`
- Call `useTranslation()`, replace 1 string (loading)

### `frontend/src/components/ToolCallCard.tsx`
- Call `useTranslation()`, map tool names to `TranslationKey`, replace 2 strings

## Adding a New Language Later
1. Create `frontend/src/i18n/locales/es.ts` — TypeScript errors on any missing key
2. Add import + entry to `localeMap` and `LOCALES` in `context.tsx`

Done. Two config lines + one file.

## Verification
- Toggle language in sidebar → all UI strings update immediately
- Refresh page → language persists (localStorage)
- First visit with Portuguese browser → defaults to pt-BR
- Both collapsed/expanded sidebar show language toggle
- Bot responses remain unaffected by language choice
- `yarn format && yarn build` passes with no errors
