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

## Useful commands

Run a specific unit test file:
```bash
npx vitest run path/to/file.test.ts
```

Run a specific E2E test file:
```bash
npx playwright test e2e/XX-feature.spec.js
```

Auto-format and lint-fix:
```bash
npm run format
npx eslint "src/**/*.{ts,tsx}" "e2e/**/*.js" --fix
```

## Troubleshooting

- **E2E failures**: Ensure the dev server is running on port 5173. Use `data-testid` selectors (not labels — the flags panel causes duplicates). Wait 600ms after actions for debounced saves.
- **Lint rules**: Use `??` not `||` for null/undefined checks. Use K&R braces. Always use braces for single-statement blocks. No `.js`/`.ts` extensions in imports. No inline styles.
