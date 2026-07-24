# UI Standards — iLokal Web

Defines the approved tool set, usage rules, and responsive strategy for all UI work.
Follow these standards to keep the product visually consistent across features.

---

## Component Library — shadcn/ui (New York style)

**Config:** `components.json` — style `new-york`, base color `slate`, CSS variables on, RSC enabled.

All primitive components live in `components/ui/`. Add new primitives via the shadcn CLI:

```bash
npx shadcn@latest add <component>
```

Never hand-write a primitive that shadcn provides — it will diverge from the design system.

### Available Primitives

| Component             | File                                  | Notes                                                           |
| --------------------- | ------------------------------------- | --------------------------------------------------------------- |
| Button                | `components/ui/button.tsx`            | Variants: default, outline, ghost, destructive, secondary, link |
| Input                 | `components/ui/input.tsx`             | Always wrap in `<Field>` for error state                        |
| Textarea              | `components/ui/textarea.tsx`          | Same Field wrapper rule                                         |
| Select                | `components/ui/select.tsx`            | Use for all dropdown choices; cascading via `disabled` prop     |
| Label                 | `components/ui/label.tsx`             | Pair with `htmlFor` on every input                              |
| Field / FieldError    | `components/ui/field.tsx`             | **Required** wrapper — drives `data-invalid` red border         |
| Dialog                | `components/ui/dialog.tsx`            | For blocking confirmations and multi-step modals                |
| Sheet                 | `components/ui/sheet.tsx`             | For side-panel / drawer patterns (e.g. AI chat)                 |
| Card                  | `components/ui/card.tsx`              | Default surface container                                       |
| Badge                 | `components/ui/badge.tsx`             | Status chips, category labels                                   |
| Tabs                  | `components/ui/tabs.tsx`              | Top-level section switching                                     |
| Table                 | `components/ui/table.tsx`             | Data grids — always pair with `@tanstack/react-table`           |
| Checkbox              | `components/ui/checkbox.tsx`          |                                                                 |
| Radio Group           | `components/ui/radio-group.tsx`       |                                                                 |
| Tooltip               | `components/ui/tooltip.tsx`           | Icon-only buttons must have a tooltip                           |
| Popover               | `components/ui/popover.tsx`           | Non-blocking overlays                                           |
| Dropdown Menu         | `components/ui/dropdown-menu.tsx`     | Context menus, kebab menus                                      |
| Progress              | `components/ui/progress.tsx`          | Step indicators, upload progress                                |
| Skeleton              | `components/ui/skeleton.tsx`          | Loading placeholders — never use spinners alone                 |
| Scroll Area           | `components/ui/scroll-area.tsx`       | Scoped scroll within panels                                     |
| Separator             | `components/ui/separator.tsx`         | Section dividers                                                |
| Avatar                | `components/ui/avatar.tsx`            |                                                                 |
| Alert                 | `components/ui/alert.tsx`             | Inline status banners                                           |
| Collapsible           | `components/ui/collapsible.tsx`       |                                                                 |
| Toggle / Toggle Group | `components/ui/toggle.tsx`            |                                                                 |
| Searchable Select     | `components/ui/searchable-select.tsx` | Use for long lists (locations, categories)                      |

### Custom Composites (`components/custom/`)

| Component         | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| `ActionButton`    | Icon + label button with loading state              |
| `AvatarImage`     | Avatar with fallback initials                       |
| `ChartCard`       | Chart wrapper with title + period selector          |
| `StatCard`        | KPI metric tile (value + delta + sparkline)         |
| `StatusBadge`     | Coloured badge driven by a status string            |
| `ProductCard`     | Listing card with image, price, availability toggle |
| `GlobalSearch`    | Command-palette style search                        |
| `Searchbar`       | Inline search input                                 |
| `Masonry`         | CSS masonry grid layout                             |
| `Header` / `Nav`  | App-level navigation shell                          |
| `FadeInAnimation` | Motion.js wrapper — fade + slide in on mount        |
| `FadeInOnScroll`  | Intersection Observer–triggered fade                |
| `Footer`          | Landing page footer                                 |
| `Navigation`      | Landing page resizable navbar                       |
| `pricing`         | Landing page pricing cards                          |
| `testimonial`     | Landing page testimonial carousel                   |
| `ThemeToggle`     | Light/dark mode switcher                            |

---

## Icons

**Library:** `lucide-react` `^0.577.0` (primary) + `@tabler/icons-react` `^3.36.1` (supplementary).

Rules:

- Default to Lucide. Use Tabler only for icons Lucide does not cover.
- Size icons with `h-4 w-4` (16 px) in buttons; `h-5 w-5` in list items; `h-6 w-6` standalone.
- All icon-only interactive elements (buttons, links) must have an `<title>` or `aria-label` and a `<Tooltip>`.
- `country-flag-icons` `^1.6.15` — use exclusively for country/region flag display.

---

## Animation

**Library:** `motion` `^12.29.2` — import as `motion/react`.

```tsx
import { motion } from 'motion/react';
```

**When to use Motion:**

- Page / section entrance animations (mount, route transition)
- Staggered list reveals
- Interactive feedback on cards/buttons (scale, opacity)
- The `FadeInAnimation` and `FadeInOnScroll` wrappers already cover most cases — prefer them.

**CSS animations (`tw-animate-css` `^1.4.0`):**

- Available as Tailwind utilities: `animate-fade-in`, `animate-slide-up`, etc.
- Use for simple one-shot transitions (toasts, skeletons, loading states).
- `animate-pulse` — loading placeholders and pending state icons.

**Global view transition:**

- `slide-up 0.5s ease-in-out` on `::view-transition-new(root)` — fires on Next.js navigation.
- Do not add competing page-level animations on top of this.

**Rules:**

- Duration: `150ms`–`300ms` for micro-interactions; `400ms`–`600ms` for section entrances.
- Easing: prefer `ease-in-out`; avoid linear for anything user-triggered.
- Never animate layout-affecting properties (`width`, `height`, `padding`) — animate `opacity` and `transform` only.
- Respect `prefers-reduced-motion` — wrap Motion components appropriately or guard with the `useReducedMotion()` hook.

---

## Data Tables

**Library:** `@tanstack/react-table` `^8.21.3` + `@tanstack/match-sorter-utils` `^8.19.4`.

- Always use the composites in `components/custom/data-table/` (`DataTable`, `DataTablePagination`).
- Sorting, pagination, and column visibility are built in.
- Fuzzy search via `match-sorter-utils` — wire to `globalFilter` state.
- Data source: Zustand store or React Query result, never local component state for large sets.

---

## Charts

**Library:** `recharts` `2.15.4` (pinned — do not upgrade without testing).

- Wrap every chart in `<ChartCard>` from `components/custom/ChartCard.tsx`.
- Use the five `--chart-*` tokens from `globals.css` for all series colors — never hardcode.
- Available chart types in use: `AreaChart`, `BarChart`, `LineChart`, `PieChart` (see `components/ui/chart.tsx` for the config wrapper).
- Always set `ResponsiveContainer width="100%" height={300}` as the outer container.
- Include a `<Tooltip>` and `<Legend>` on all multi-series charts.

---

## Forms

**Libraries:** `react-hook-form` `^7.71.2` + `@hookform/resolvers` `^5.2.2` + `zod` `^4.3.6`.

Pattern:

```tsx
const form = useForm<Schema>({ resolver: zodResolver(schema) });
// ...
<Controller
  name="field"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <Label htmlFor="field">Label</Label>
      <Input id="field" {...field} />
      {fieldState.error && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>;
```

- All schemas live in `lib/validation/` as Zod schemas.
- Multi-step forms use `registration-form-provider.tsx` pattern (context + step state).
- Disabled/locked fields: pass `disabled` to the input and set the value via `form.setValue` in `useEffect` on mount.

---

## Notifications / Toasts

**Library:** `sonner` `^2.0.7`.

```tsx
import { toast } from 'sonner';
toast.success('Saved');
toast.error('Something went wrong');
```

- Provider is in `providers/SonnerProvider.tsx` — already in the root layout.
- Do not use `alert()` or custom toast implementations.

---

## State Management

**Library:** `zustand` `^4.4.7`.

- Global UI state (sidebar open, filters, selected branch) → Zustand store.
- Server data → Supabase query + local component state or SWR pattern.
- Form state → react-hook-form only (do not mix with Zustand).
- Keep stores small and co-located with the feature they serve.

---

## HTTP Client

**Library:** `axios` `^1.7.7`.

- Used in `lib/services/utils/apiClient.ts` for the isomorphic service layer.
- Web Server Components use the Supabase client directly (no Axios).
- Mobile API consumers use `axios` via the service wrappers in `lib/services/`.

---

## Responsive Layout Strategy

### Breakpoints (Tailwind v4 defaults)

| Prefix   | Min-width | Target                       |
| -------- | --------- | ---------------------------- |
| _(none)_ | 0px       | Mobile-first base            |
| `sm:`    | 640px     | Large phones / small tablets |
| `md:`    | 768px     | Tablets                      |
| `lg:`    | 1024px    | Laptops                      |
| `xl:`    | 1280px    | Desktops                     |
| `2xl:`   | 1536px    | Wide screens                 |

### Layout Patterns

**App shell (authenticated pages):**

```
flex h-screen overflow-hidden
  ├── <Sidebar> — hidden on mobile (sheet/drawer), fixed on lg+
  └── <main> flex-1 overflow-y-auto
        └── page content
```

**Business registration:**

- Full-screen: `h-screen flex flex-col overflow-hidden`
- Step content: side-by-side on `lg+` (`grid grid-cols-2`), stacked on smaller screens
- Map panel: hidden on `md` and below, visible on `lg+`

**Dashboard (business home):**

- Stats row: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
- Charts section: `grid grid-cols-1 lg:grid-cols-2 gap-6`
- Full-width on mobile, multi-column on desktop

**Data tables:**

- Horizontal scroll container on mobile: `overflow-x-auto`
- Column visibility: hide secondary columns below `md` via TanStack column visibility

**Cards / product grids:**

- `Masonry` component handles responsive column count automatically
- Fallback grid: `grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`

**Dialogs / modals:**

- The base `DialogContent` caps every modal to `max-h-[calc(100dvh-2rem)]` /
  `max-w-[calc(100%-2rem)]` and scrolls — a modal never exceeds the viewport.
- Long forms: pinned header + `<DialogBody>` scroll region + pinned footer; add
  `overflow-hidden` to `DialogContent`. Short dialogs need nothing extra.
- **Never** put a fixed height (`h-*`) or `min-w-*` on `DialogContent` (enforced
  by a grep test). Widen with `sm:max-w-*`.
- Full detail: `component-standards.md` → "Dialogs / Modals";
  `.claude/MODAL_RESPONSIVE.md`.

### Rules

- **Mobile-first** — write base styles for mobile, add breakpoint overrides up.
- Minimum tap target: `44×44px` (`min-h-11 min-w-11`). Never render interactive elements smaller.
- Sidebar collapses to a `<Sheet>` (slide-in drawer) on `md` and below — use `use-mobile.ts` hook (`useIsMobile()`).
- Text scaling: use `.text-title` utility for headings (scales `3xl` → `6xl` across breakpoints).
- Avoid fixed pixel widths — use `max-w-*` + `w-full` patterns.
- Touch: disable hover-only interactions on touch screens (`@media (hover: none)`).

---

## Dark Mode

- Strategy: class-based (`next-themes`, class `dark` on `<html>`).
- Toggle: `components/custom/ThemeTogge.tsx` — already wired in the layout header.
- All color usage must be via the semantic token system — never hardcode colors that won't adapt.
- Test every new UI in both modes before marking a task done.
- `@custom-variant dark (&:where(.dark, .dark *))` is defined — Tailwind `dark:` prefix works everywhere.

---

## Theming Rules Summary

1. Use `text-primary` / `bg-primary` for brand actions — never hardcode the green.
2. Use `text-muted-foreground` for labels, captions, and placeholders.
3. Use `text-destructive` / `border-destructive` for all error states.
4. Use `bg-muted` for disabled fields and neutral surfaces.
5. Chart colors: always `var(--chart-1)` through `var(--chart-5)` in order.
6. Border radius: use `rounded-lg` (`radius-lg`) as the default; step down to `rounded-md` for inputs.
7. Focus rings: automatic via `outline-ring/50` in `@layer base` — do not suppress `outline: none` globally.
