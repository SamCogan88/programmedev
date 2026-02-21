---
description: Run the full validation checklist (unit tests, build, formatting, type checking)
---

Run the validation checklist for this codebase. Execute these checks in order and report the results:

1. **Unit tests**: `npm run test:unit`
2. **Build**: `npm run build`
3. **Formatting**: `npm run format:check`
4. **TypeScript**: `npx tsc --noEmit`

If any check fails, report the failure details. Do not proceed to the next check until the current one completes.

For pre-PR validation, also run:

5. **E2E tests**: `npm run test:e2e` (requires dev server — start with `npm run dev` first)
6. **Coverage**: `npm run test:coverage` (must meet 90% thresholds)
