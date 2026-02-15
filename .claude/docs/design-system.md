# Design System

## Theme Architecture

Themes are CSS variable overrides on `<html>`. Provider: `src/lib/theme.tsx`. CSS: `src/index.css`.

Pattern: `const { theme, setTheme } = useTheme();`

Active theme applies class `theme-{id}` to `<html>` alongside `dark`.

## Color Rules

**Never hardcode colors.** Always use semantic Tailwind tokens:

| Need | Use | Never |
|------|-----|-------|
| Page background | `bg-background` | `bg-black`, `bg-gray-900` |
| Primary text | `text-foreground` | `text-white` |
| Secondary text | `text-muted-foreground` | `text-white/50`, `text-gray-400` |
| Dimmed text | `text-muted-foreground/70` | `text-white/30` |
| Borders | `border-border` | `border-white/10` |
| Interactive border | `border-input` | `border-white/20` |
| Subtle bg | `bg-muted/30` | `bg-white/5` |
| Hover bg | `hover:bg-accent` | `hover:bg-white/10` |
| CTA/accent | `bg-primary text-primary-foreground` | `bg-blue-500` |
| Cards/surfaces | `bg-card text-card-foreground` | `bg-gray-800` |
| Dividers | `divide-border` | `divide-white/10` |

**Exceptions** — status colors stay explicit (they are semantic, not themed):
- Running/Active: `blue-400`
- Success/Done: `green-400` / `emerald-400`
- Error: `red-400`
- Thinking/Processing: `purple-400`

## Spacing

Use Tailwind's default scale. Preferred values:

- Component gaps: `gap-2` (8px) or `gap-3` (12px)
- Card padding: `p-4` (16px) or `px-4 py-3`
- Section spacing: `space-y-6` (24px) or `space-y-8` (32px)
- Inline element gaps: `gap-1.5` (6px)

## Border Radius

Use the theme's `--radius` variable via Tailwind tokens:
- Buttons, inputs: `rounded-md`
- Cards, panels: `rounded-lg`
- Badges, pills: `rounded-full`
- Modals, overlays: `rounded-xl`

Never hardcode pixel values for border-radius.

## Shared UI Components

Before creating new UI elements, check `src/components/ui/` for existing primitives:

- **Button** (`button.tsx`) — Use variants: `default`, `ghost`, `outline`, `destructive`. Use sizes: `xs`, `sm`, `default`, `icon`.
- **Card** (`card.tsx`) — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- **StatusDot** (`StatusDot.tsx`) — Colored dot for status. Props: `status`, `size`
- **StatusBadge** (`StatusBadge.tsx`) — Pill badge. Props: `status`, `count`
- **ExpandableSection** (`ExpandableSection.tsx`) — Collapsible with chevron. Props: `title`, `defaultOpen`, `icon`, `badge`
- **SectionHeader** (`SectionHeader.tsx`) — Uppercase section title
- **IconButton** (`IconButton.tsx`) — Icon-only button. Props: `icon`, `size`, `variant`
- **GlassPanel** (`GlassPanel.tsx`) — Container with glassmorphism when theme supports it
- **Input** (`input.tsx`), **Textarea** (`textarea.tsx`), **Select** (`select.tsx`), **Label** (`label.tsx`)

## Glass Panels

Some themes support glassmorphism. Use `GlassPanel` for elevated containers (modals, floating panels). It reads `--glass-blur` and `--glass-bg` from the theme — falls back to solid bg when glass is disabled.

## Animations

- Hover/focus transitions: `transition-colors` (200ms default)
- State changes: `transition-all duration-300`
- Easing: Tailwind default or `cubic-bezier(0.16, 1, 0.3, 1)` for entrances
- Status indicators: use existing `animate-agent-active`, `animate-agent-complete`, `animate-thinking-pulse`
- Respect `prefers-reduced-motion` — no forced animations

## RTL / Bidirectional Layout

The app supports RTL languages (Arabic). **Always use logical CSS properties**:

| Physical (never use) | Logical (always use) |
|---------------------|---------------------|
| `ml-*`, `mr-*` | `ms-*`, `me-*` |
| `pl-*`, `pr-*` | `ps-*`, `pe-*` |
| `left-*`, `right-*` | `start-*`, `end-*` |
| `text-left`, `text-right` | `text-start`, `text-end` |
| `border-l-*`, `border-r-*` | `border-s-*`, `border-e-*` |

For directional icons (arrows, chevrons pointing left/right), add `rtl:-scale-x-100` to flip them.

Physical properties like `top-*`, `bottom-*`, `gap-*`, `px-*`, `py-*` are fine — they're not directional.

## New Component Checklist

When creating a new component:
1. Check if a shared primitive in `src/components/ui/` already covers the need
2. Use only semantic color tokens — never raw color values
3. Follow the spacing scale above
4. Add i18n keys for any user-facing text (all dictionaries: pt-BR, en, ar)
5. Update `src/lib/i18n-glossary.md` with context for new keys
6. Use `cn()` from `src/lib/utils.ts` for conditional class merging
7. Use logical CSS properties for horizontal spacing/positioning (RTL support)
