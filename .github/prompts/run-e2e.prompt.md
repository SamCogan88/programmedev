---
description: Run Playwright end-to-end tests
---

Run the Playwright E2E tests for this project. The dev server must be running first.

1. Start the dev server (if not already running):
   ```bash
   npm run dev
   ```

2. Run the E2E tests:
   ```bash
   npm run test:e2e
   ```

3. To run a specific test file:
   ```bash
   npx playwright test e2e/XX-feature.spec.js
   ```

If tests fail, check:
- Whether the dev server is running on port 5173
- Whether selectors use `data-testid` (not labels — the flags panel can cause duplicate label matches)
- Whether actions need a 600ms wait for debounced saves (400ms debounce + buffer)

E2E tests should focus on cross-step workflows, data persistence, and import/export cycles — not individual field validation (which is covered by unit tests).
