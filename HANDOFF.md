# Handoff

## 2026-09-16 — server-side open-now for business detail + skills
**Branch:** `feat/date-planner` (2 ahead of origin after this handoff) · **Commits:** this handoff (2)
**Done:**
- `computeOpenState()` in `app/api/mobile/businesses/[businessId]/route.ts`:
  server-side is-open/closes-at from `operating_hours`, Manila (UTC+8) wall time,
  mirroring the client `stopAvailability` heuristic (null hours → unknown,
  overnight windows handled). Revalidate stays 120s.
- Prettier auto-fixes applied (the 6 errors noted in the 2026-09-14 thread entry
  — `patch-profile.test.ts`, `me/route.ts`, business route — all resolved).
- Registered `handoff` + `handoff-quick` skills under `.claude/skills/`.
**Next:** the integration-suite tsc errors from the 2026-09-14 thread note
(plans.integration.test.ts mock typing) still need their owner — re-run
`yarn build` after that lands; then commit the date-planner backend PR.
**Verify:** `npm run lint && npm run build` (both green at handoff)
**Open:** integration test mock typing (pre-existing, not touched here)
