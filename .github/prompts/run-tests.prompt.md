---
description: Run unit tests with Vitest
---

Run the Vitest unit tests for this project:

```bash
npm run test:unit
```

If tests fail, analyse the failures and suggest fixes. Group failures by category (type errors, assertion failures, missing mocks, etc.).

To run a specific test file, use:
```bash
npx vitest run path/to/file.test.ts
```

To run tests in watch mode during development:
```bash
npm run test:unit:watch
```

To check code coverage against the 90% threshold:
```bash
npm run test:coverage
```
