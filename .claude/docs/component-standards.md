# Component Standards — iLokal Web

## File Structure

One component per file. Filename matches the component name in PascalCase.

```tsx
// components/custom/StatCard.tsx

type StatCardProps = {
  label: string;
  value: string | number;
  delta?: number;
};

export function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <p className="text-muted-foreground text-sm">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {delta !== undefined && (
          <p className={delta >= 0 ? 'text-primary' : 'text-destructive'}>
            {delta >= 0 ? '+' : ''}
            {delta}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

## Rules

- **Named exports** for all components. Default exports only for Next.js page files (`page.tsx`, `layout.tsx`) — Expo Router requirement is not relevant here.
- Props type named `[ComponentName]Props`, defined immediately above the component.
- No business logic inside components — extract to a custom hook in `hooks/`.
- No direct Supabase calls inside Client Components — use Server Actions, API routes, or service wrappers.
- Accessibility: interactive elements must have `aria-label` or visible label text. Icon-only buttons require a `<Tooltip>`.

## Server vs Client Components

Default to Server Components. Add `'use client'` only when the component needs:

- `useState` / `useReducer`
- `useEffect`
- Browser APIs (`window`, `document`, event listeners)
- React context that is client-side

```tsx
// Server Component (default — no directive needed)
export async function BusinessCard({ id }: { id: string }) {
  const business = await getBusiness(id);  // direct Supabase call OK here
  return <Card>...</Card>
}

// Client Component
'use client';
export function FilterPanel({ onFilter }: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  ...
}
```

## Page Components (`app/**/page.tsx`)

```tsx
// app/business/product-catalogues/page.tsx

export default async function ProductCataloguesPage() {
  const products = await getProducts(); // fetch in page, pass down as props

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Product Catalogues" />
      <ProductTable data={products} />
    </div>
  );
}
```

- Thin pages — fetch data, pass to composites, no inline logic.
- Use `export default` (Next.js requirement).
- Route segments that read cookies or session must declare `export const dynamic = 'force-dynamic'`.

## Custom Hooks

```tsx
// hooks/useDashboardTour.ts

export function useDashboardTour() {
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => s + 1);
  return { step, next, isComplete: step >= STEPS.length };
}
```

- Prefixed with `use`.
- Returns a plain object (not an array, unless mimicking `useState`).
- One concern per hook — encapsulates the state + derived values a component needs.
- Hooks that fetch data should use Supabase in a Server Action/API route, not directly in `useEffect`.

## Form Components

Follow the `react-hook-form` + `<Field>` wrapper pattern throughout:

```tsx
'use client';
import { Controller } from 'react-hook-form';
import { Field, FieldError } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Inside a form component:
<Controller
  name="shop_name"
  control={form.control}
  render={({ field, fieldState }) => (
    <Field data-invalid={fieldState.invalid}>
      <div className="space-y-2">
        <Label htmlFor="shopName">Shop Name</Label>
        <Input id="shopName" {...field} aria-invalid={fieldState.invalid} />
      </div>
      {fieldState.error && <FieldError errors={[fieldState.error]} />}
    </Field>
  )}
/>;
```

Never render a raw `<input>` — always use the shadcn `<Input>` primitive wrapped in `<Field>`.

## Dialogs / Modals

The base `Dialog` primitive (`components/ui/dialog.tsx`) caps every modal to the
viewport: `DialogContent` is a scrollable flex column with
`max-h-[calc(100dvh-2rem)]`, `max-w-[calc(100%-2rem)]`, responsive padding
(`p-4 sm:p-6`), and scroll-padding so the mobile keyboard can't hide a focused
field. Rules for any new modal:

- **Never set a fixed height** (`h-200`, `h-[80vh]`, …) on `DialogContent`. Use
  the base `max-h` and let content drive the height. A grep test
  (`components/ui/__tests__/dialog.contract.test.ts`) fails the build if you do.
- **Never set `min-w-*`** on `DialogContent` — `min-width` beats the base
  `max-width` and clips narrow screens. Use `sm:max-w-*` to widen instead.
- **Long forms** → pinned header + scrolling body + pinned footer. Put the
  scroll region in `<DialogBody>` and add `overflow-hidden` to `DialogContent`
  so only the body scrolls (header/footer stay put):

  ```tsx
  <DialogContent className="overflow-hidden sm:max-w-lg">
    <form className="flex min-h-0 flex-1 flex-col gap-4" onSubmit={…}>
      <DialogHeader>…</DialogHeader>
      <DialogBody className="space-y-4">{/* fields */}</DialogBody>
      <DialogFooter>{/* actions */}</DialogFooter>
    </form>
  </DialogContent>
  ```

- **Short dialogs** (confirms, a few fields) need none of this — the base
  primitive already scrolls the whole dialog if it ever grows.
- **Multi-column layouts** collapse to one column below `sm`
  (`flex-col sm:flex-row`) so they don't squeeze on phones.

Plan + full audit: `.claude/MODAL_RESPONSIVE.md`.

## Multi-Step Forms

Follow the `registration-form-provider.tsx` pattern:

- Context holds the form instance, current step, and navigation handlers.
- Each step is a separate component file under `steps/`.
- Locked/pre-filled fields: set value via `form.setValue` in a `useEffect` on mount, pass `disabled` to the input.

## Loading States

Use `<Skeleton>` components — never a raw spinner alone.

```tsx
if (isLoading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
```

## Empty States

Always render a meaningful empty state when a list has no items:

```tsx
{
  items.length === 0 ? (
    <div className="text-muted-foreground flex flex-col items-center py-16 text-sm">
      <PackageIcon className="mb-2 h-8 w-8 opacity-40" />
      <p>No products yet.</p>
    </div>
  ) : (
    <ProductTable data={items} />
  );
}
```
