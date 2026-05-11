# DESIGN.md — iLokal Color System & Visual Language

Derived from `app/globals.css` (Tailwind CSS v4, OKLCH color space, shadcn/ui New York style).

---

## Color Tokens

All colors are CSS custom properties consumed via Tailwind's `@theme inline` mapping.
Use the semantic token names (`text-primary`, `bg-muted`, etc.) — never hardcode raw OKLCH values.

### Light Mode

| Token | OKLCH | Role |
|---|---|---|
| `--background` | `oklch(1 0 0)` | Page / panel background (pure white) |
| `--foreground` | `oklch(0.141 0.005 285.823)` | Primary body text (near-black) |
| `--card` | `oklch(1 0 0)` | Card / surface background |
| `--card-foreground` | `oklch(0.141 0.005 285.823)` | Text on cards |
| `--primary` | `oklch(0.648 0.2 131.684)` | **Brand green** — buttons, active states, links |
| `--primary-foreground` | `oklch(0.986 0.031 120.757)` | Text on primary (light sage) |
| `--secondary` | `oklch(0.967 0.001 286.375)` | Light grey surface (tabs, chips) |
| `--secondary-foreground` | `oklch(0.21 0.006 285.885)` | Text on secondary |
| `--muted` | `oklch(0.967 0.001 286.375)` | Disabled / subdued backgrounds |
| `--muted-foreground` | `oklch(0.552 0.016 285.938)` | Placeholder text, captions |
| `--accent` | `oklch(0.967 0.001 286.375)` | Hover highlights, selected rows |
| `--accent-foreground` | `oklch(0.21 0.006 285.885)` | Text on accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Error / delete states (red) |
| `--border` | `oklch(0.92 0.004 286.32)` | Dividers, input outlines |
| `--input` | `oklch(0.92 0.004 286.32)` | Input border |
| `--ring` | `oklch(0.841 0.238 128.85)` | Focus ring (light green) |

### Dark Mode (`.dark`)

| Token | OKLCH | Notes |
|---|---|---|
| `--background` | `oklch(0.141 0.005 285.823)` | Deep charcoal |
| `--foreground` | `oklch(0.985 0 0)` | Near-white text |
| `--card` | `oklch(0.21 0.006 285.885)` | Slightly lifted surface |
| `--primary` | `oklch(0.648 0.2 131.684)` | Same brand green — maintains identity in dark |
| `--muted` | `oklch(0.274 0.006 286.033)` | Darker grey |
| `--destructive` | `oklch(0.704 0.191 22.216)` | Lighter red for dark contrast |
| `--border` | `oklch(1 0 0 / 10%)` | Translucent white border |
| `--input` | `oklch(1 0 0 / 15%)` | Translucent white input |
| `--ring` | `oklch(0.405 0.101 131.063)` | Darker green ring |

### Sidebar Tokens

The sidebar carries its own token set to allow independent theming.

| Token | Light | Dark |
|---|---|---|
| `--sidebar` | `oklch(0.985 0 0)` | `oklch(0.21 0.006 285.885)` |
| `--sidebar-primary` | same as `--primary` | `oklch(0.768 0.233 130.85)` (brighter in dark) |
| `--sidebar-border` | same as `--border` | `oklch(1 0 0 / 10%)` |

### Chart Palette

Five-step green ramp used exclusively for data visualisations (Recharts).
Always use in order — chart-1 is lightest, chart-5 is darkest.

| Token | OKLCH | Approx hex |
|---|---|---|
| `--chart-1` | `oklch(0.871 0.15 154.449)` | `#86efac` (light green) |
| `--chart-2` | `oklch(0.723 0.219 149.579)` | `#4ade80` |
| `--chart-3` | `oklch(0.627 0.194 149.214)` | `#22c55e` |
| `--chart-4` | `oklch(0.527 0.154 150.069)` | `#16a34a` |
| `--chart-5` | `oklch(0.448 0.119 151.328)` | `#15803d` (deep green) |

### Semantic Utility Classes

Defined in `@layer base` — use these instead of raw color classes.

```css
.bg-app-color   /* gradient: red-500 → orange-500, text clip — brand accent */
.text-title     /* bold, responsive size: sm:3xl → xl:6xl */
.text-description /* max-w-1/2, text-xl, text-gray-500 */
```

---

## Typography

| Token | Value |
|---|---|
| `--font-sans` (`--font-giest`) | Geist Sans (Next.js font) |
| `--font-mono` (`--font-giest-mono`) | Geist Mono |

Apply font via `font-giest` class (defined in `@theme inline`).

---

## Border Radius

Base radius `--radius: 0.65rem`. All variants are derived:

| Token | Calc | Use |
|---|---|---|
| `radius-sm` | `radius - 4px` | Badges, chips |
| `radius-md` | `radius - 2px` | Inputs, small cards |
| `radius-lg` | `radius` (0.65rem) | Cards, modals |
| `radius-xl` | `radius + 4px` | Sheets, drawers |
| `radius-2xl` | `radius + 8px` | Hero sections |
| `radius-3xl / 4xl` | `+12px / +16px` | Full-bleed banners |

---

## Business Registration UI Patterns

The registration form (`app/business-registration/`) is the primary design reference.

### Layout Shell
```
h-screen flex flex-col
  └── main: flex flex-row flex-1 min-h-0 overflow-hidden p-3
        ├── step-progress sidebar (fixed width)
        └── step content panel (flex-1, overflow-y-auto)
              └── register-nav (mt-auto, border-t)
```

### Form Fields
- **Label → Input/Select → FieldError** — always use `<Field>` wrapper from `components/ui/field.tsx`
- `data-invalid` attribute on `<Field>` drives red border state
- Spacing between fields: `space-y-6`
- Two-column layout for location + map: `grid grid-cols-2 gap-x-10`

### Status / Feedback Colours
| Scenario | Class pattern |
|---|---|
| Warning / note | `border-amber-200 bg-amber-50 text-amber-900` (dark: amber-900/950/50) |
| Error state | `text-destructive` / `border-destructive` |
| Success / active | `text-primary` / `bg-primary` |
| Pending / loading | `animate-pulse` on icon wrapper |

### Step Progress Indicator
- Active step: `bg-primary text-primary-foreground`
- Completed step: checkmark icon, muted green tint
- Inactive step: `bg-muted text-muted-foreground`

---

## Scrollbar Styling

Custom thin scrollbar applied globally:
- Thumb: `bg-border` with transparent track
- Firefox: `scrollbar-width: thin`, `scrollbar-color: var(--border) transparent`
- Webkit: `h-2.5 w-2.5` dimensions, `rounded-full`

---

## Page Transitions

Global view-transition defined:
```css
::view-transition-new(root) { animation: slide-up 0.5s ease-in-out }
```
