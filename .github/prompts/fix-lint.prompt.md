---
description: Fix lint and formatting issues
---

Fix all lint and formatting issues in the codebase.

1. **Auto-format** all files:
   ```bash
   npm run format
   ```

2. **Lint** and auto-fix where possible:
   ```bash
   npx eslint "src/**/*.{ts,tsx}" "e2e/**/*.js" --fix
   ```

3. **Type-check**:
   ```bash
   npx tsc --noEmit
   ```

Key rules to follow when fixing manually:
- Imports must be sorted into 3 groups: React imports → third-party → internal (first-party)
- Use `??` (nullish coalescing) not `||` for null/undefined checks
- Use K&R style braces (opening brace on same line)
- Always use braces for single-statement blocks (`if`, `for`, etc.)
- No `.js`/`.ts` extensions in import paths
- No inline styles — use Bootstrap utilities or CSS classes
