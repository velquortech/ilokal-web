# Service Usage Analytics & Monitoring

Real-time tracking of how services are used across the codebase, with automated alerting for boundary violations and deprecation warnings.

## Running Analytics

### Quick Analysis

```bash
yarn analyze:usage
```

Outputs instant report to console showing:

- Which services are actually used
- Which are unused (safe to remove)
- Any boundary violations (server-only code in client)
- Deprecation warnings
- Top 10 most-used services

### Generate Report File

```bash
yarn analyze:usage > WORKFLOW/service-usage-latest.txt
```

Saves readable report and JSON file at `WORKFLOW/tools/service-usage-report.json` for CI/CD integration.

### Run in CI Pipeline

```bash
npm run ci:checks  # Includes analyze:usage
```

---

## Understanding the Report

### Summary Section

```
  Total services: 20              ← All available services
  Active services: 7              ← Currently used
  Unused services: 13             ← Safe for removal
  Total imports: 145              ← Import statements found
  Boundary violations: 0          ← Build-blocking issues
  Generated: 2024-03-31T...       ← Generation timestamp
```

### Service Usage Table

```
  ✅ userService                  25 imports  ← Client-safe (green)
  ✅ http                         18 imports
  ⛔ paymentService               12 imports  ← Server-only (red)
  ⛔ authService                   8 imports
```

**✅ Green** = Safe to import from `@/lib/services` in client code
**⛔ Red** = Server-only; import directly from module only in server contexts

### Violations Section

#### Error: Client imports server-only service

```
  ❌ [ERROR] components/Payment.tsx:45
     Client file imports server-only service "paymentService"
```

**Action**: Move logic to Server Action or API route

#### Warning: Legacy import path

```
  ⚠️ [WARNING] hooks/useOldData.ts:10
     Legacy import path "@/services" - should use "@/lib/services"
```

**Action**: Update import to `@/lib/services`

---

## Monitoring Patterns

### Real-Time Monitoring

Add this to your CI/CD to track metrics:

```yaml
# .github/workflows/service-analytics.yml
name: Service Analytics

on:
  pull_request:
    paths:
      - 'lib/services/**'
      - 'components/**'
      - 'hooks/**'

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run analyze:usage
      - name: Comment on PR
        run: echo "Service usage report complete"
```

### What Gets Tracked

1. **Import Frequency**
   - How often each service is imported
   - Identify most critical services
   - Spot missing services

2. **Boundary Violations**
   - Client files importing server services
   - Will fail build (Turbopack catches at compile)
   - Early detection via linting

3. **Legacy Paths**
   - Old `@/services` imports
   - Target for migration
   - Plan removal timeline

4. **Unused Services**
   - Services with zero imports
   - Safe to deprecate/remove
   - Plan cleanup PRs

---

## Key Metrics Explained

### Active Services

Number of services actually imported somewhere in code.

**Ideal**: Cover ~70% of all services

- Too low (< 50%) → May have unused/duplicate services
- Too high (> 90%) → Every service is critical, increases maintenance

### Boundary Violations

Client files importing server-only services.

**Ideal**: 0 always

- Non-zero → Build will fail at Turbopack stage
- Monitor to catch before CI

### Unused Services

Services with zero imports anywhere.

**Ideal**: Low, cleaned up regularly

- 0-2 unused → Clean
- 3-5 unused → Plan removal PR
- 5+ unused → Architectural cleanup needed

---

## Interpreting Usage Patterns

### Pattern: High concentration on few services

```
  ✅ http                    67 imports
  ✅ userService             34 imports
  ✅ ratingService           12 imports
  ⛔ paymentService           8 imports
  (others)                    24 imports
```

**Interpretation**: Healthy - core services heavily used, specialized services used appropriately

### Pattern: Even distribution

```
  Every service: 7-8 imports
```

**Interpretation**: May indicate missing specialization - consider consolidating or refactoring

### Pattern: One dominant service

```
  ✅ http                   120 imports
  (all others)             < 5 imports each
```

**Interpretation**: Possible: (a) Missing typed wrappers, (b) Generic service too catchall, (c) Need domain-specific services

---

## Using Reports for Planning

### Quarterly Cleanup

1. Run: `yarn analyze:usage`
2. Export unused services: Those with 0 imports
3. Create removal PR for unused services
4. Update documentation to reflect changes

### New Feature Planning

1. Review service usage to find similar patterns
2. Reuse existing services instead of creating new ones
3. Add new service only if fundamentally different use case
4. Track usage after launch

### Performance Debugging

If API calls are slow:

1. Identify most-used services: `http > userService > ratingService`
2. Profile those first
3. Consider caching for high-volume services

### Security Audit

1. Ensure zero boundary violations (run `yarn analyze:usage`)
2. Review which server services are accessed most
3. Prioritize security review for top services
4. Add additional validation for high-risk services

---

## JSON Report Schema

Generated at `WORKFLOW/tools/service-usage-report.json`:

```json
{
  "timestamp": "2024-03-31T10:30:00.000Z",
  "summary": {
    "totalServices": 20,
    "activeServices": 7,
    "totalImports": 145,
    "usedServices": ["userService", "http", ...],
    "unusedServices": ["someService", ...],
    "violations": 0
  },
  "serviceUsage": [
    {
      "service": "userService",
      "count": 25,
      "imports": [
        {
          "file": "hooks/useProfiles.ts",
          "line": 5,
          "context": "import { userService } from '@/lib/services';"
        }
      ]
    }
  ],
  "violations": [
    {
      "file": "components/Payment.tsx",
      "line": 45,
      "issue": "Client file imports server-only service \"paymentService\"",
      "severity": "error"
    }
  ]
}
```

Use for:

- Dashboard visualization
- Trend analysis over time
- Automated alerting in monitoring tools
- Integration with project management systems

---

## Recommendations by Scenario

### You: Added a new service

1. Run `yarn analyze:usage`
2. Verify it appears in `usedServices` after first import
3. Update [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) table
4. Update [COMPONENT_EXAMPLES.md](./COMPONENT_EXAMPLES.md) with usage example

### You: Exploring codebase

1. Run `yarn analyze:usage`
2. Find "TOP USED SERVICES" - these are core patterns
3. Study top 3 services to learn conventions
4. Look at `COMPONENT_EXAMPLES.md` for how they're used

### You: Want to optimize performance

1. Run `yarn analyze:usage`
2. Find services with highest import counts
3. Profile those services first
4. Consider caching or batching for high-impact services

### You: Reviewing a PR affecting services

1. Run `yarn analyze:usage` before and after PR
2. Check if violations were introduced
3. Review if new imports fix or create problems
4. Ensure boundary rules still hold

---

## Troubleshooting

### Script errors

```bash
# Ensure Node.js version
node --version  # Should be 16+

# Clear cache and retry
rm -rf WORKFLOW/tools/service-usage-report.json
yarn analyze:usage
```

### Missing imports in report

- The script skips test files (_.test.ts, _.spec.ts)
- The script skips .next/_,node_modules/_
- Check file actually exists in workspace

### Reports not updating

```bash
# Clear and regenerate
rm WORKFLOW/tools/service-usage-report.json
npm run analyze:usage
```

### Want to ignore specific files

Edit `WORKFLOW/tools/analyzeServiceUsage.js`, update `PATTERNS` or add to file skip list

---

## Next Steps

1. **Run baseline**: `yarn analyze:usage`
2. **Review**: Check for unused (low priority) and violations (high priority)
3. **Schedule**: Add to CI/CD for continuous monitoring
4. **Monitor**: Track metrics over time
5. **Act**: Remove unused services, fix violations

---

**Questions?** See [lib/services/README.md](./README.md) for architecture context.
