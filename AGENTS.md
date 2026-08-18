# AGENTS.md — iLokal Web (session learnings)

Facts recovered from live debugging and probes that reading the code will not
reveal. CLAUDE.md holds the repo's main conventions; this file adds the
hard-won, non-obvious ones.

## React Hook Form

- `reset(values)` REWRITES the form's `_defaultValues` unless
  `keepDefaultValues: true` is passed. Restoring a draft with `reset({...})`
  therefore poisons defaults: a later no-arg `reset()` restores the DRAFT, not
  an empty form. Restore with `keepDefaultValues: true`; reset to an explicit
  empty object on submit.
- A debounced autosave can fire ~400ms after a successful save's reset and
  write the old (pre-reset) values back — the timer read the form before the
  reset landed. The fix is what you reset, not the timer.
- `register`/watch notify the form subject, so watch callbacks can fire
  mid-submit; don't debug the timer, debug the reset.

## Commands & environment

- Preview dev server: http://localhost:3002 (`yarn dev` in the Freebuff
  worktree). `curl /` returns 308 — a Next.js redirect, not an error.
- `next.config.ts` / `.env.local` / `.env.cloud` changes are read at startup
  ONLY — the running dev server keeps its old CSP/headers until restarted (a
  stale CSP silently blocked the nominatim place-search fetch with zero
  on-page error). Restart + smoke-test recipe: `docs/runbooks/dev-restart-next-config.md`.
- After a branch's commit→push→PR→merge cycle, remove its worktree with
  `./scripts/cleanup-worktree.sh <path|branch> [--delete-remote]` — it refuses
  main, dirty trees, open PRs, unmerged branches, locked worktrees, and live
  servers. Recipe: `docs/runbooks/worktree-cleanup.md`.
- Local DB: `docker exec supabase_db_ilokal-web psql -U postgres -d postgres`.
  Delete throwaway signups with `DELETE FROM auth.users WHERE email LIKE ...`
  (cascades to businesses).
- Test owner: `mobilecheck@ilokal.dev` / `MobileCheck123`, business
  `a0f4ecae-a200-48e3-b860-017075930936`. Sign-in URL is `/sign-in` (NOT
  `/signin`); fields `#email` / `#password` + `button[type=submit]`.
- `npx tsc --noEmit 2>&1 | tail -5; echo $?` reports TAIL's exit — use
  `echo ${PIPESTATUS[0]}` or type errors hide behind a false green.

## Puppeteer probes (/tmp/mobile-check)

- Mobile viewport: 390×844 with isMobile + hasTouch. Require puppeteer from
  the WORKTREE's node_modules (absolute path), never a global install.
- `page.mouse.click` at y > viewport height hits nothing: scrollIntoView the
  target, wait, re-measure `getBoundingClientRect`, then click.
- Synthetic DOM events (dispatchEvent) don't reach react-leaflet's click
  handler — use real `page.mouse.click`.
- Functions inside `page.evaluate` must be passed as the evaluate
  function/args; closure over module-scope helpers fails with "X is not
  defined", and `document`/`location` in Node context crash the probe.
- Hidden `input[type=file]`: `elementHandle.uploadFile(path)` works and fires
  real change events. Files <2MB pass compressImage untouched
  ("already-small"), so tiny valid PNGs satisfy upload UIs.
- Leaflet's ClickHandler ignores clicks landing on the marker icon — a tap on
  the pin is a grab, never a re-pin.

## Source-scan contract tests (__test__/features/business/*.contract.test.ts)

- UI rules with no runtime seam (spacing, image props, reset shapes) are
  pinned by scanning source with readFileSync; comments are stripped first.
- Components with multiple `return (` roots (e.g. Deal: empty state + form)
  break "first match" assertions — scan every return root inside the exported
  function's brace-balanced body. Same for `reset({...})` first-match: anchor
  on a signature unique to the target call.
- Spacing contract: wizard step roots `space-y-6`/`gap-6` (24px); DialogBody
  bodies `space-y-4` (16px). Legacy dialogs (no DialogBody): the largest gap
  on a container still holding ≥2 fields after it — header/footer gaps must
  not count as body rhythm.
- The gap regex misses `gap-y-N`/`gap-x-N` — a step using `gap-y-6` fails
  loudly as "no spacing" (conservative), which is acceptable.

## Layout measurement pitfalls

- When a heading row also holds action buttons (e.g. "Add More"), the
  heading's nextElementSibling is the button, not the content box — measure
  the section wrapper's children instead.
- A 2-col grid at `sm+` makes vertical-gap probes read negative "overlaps" —
  the side-by-side layout is intended, not a defect.
