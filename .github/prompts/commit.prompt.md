---
description: Prepare and make an atomic git commit following conventions
---

Make an atomic git commit following the project's conventions.

**Pre-commit checklist** (run all before committing):
```bash
npm run test:unit    # All tests must pass
npm run build        # Must compile cleanly
npm run format       # Fix formatting
npx tsc --noEmit     # No type errors
```

**Commit message format** (Conventional Commits):
```
<type>(<scope>): <description>

<optional body>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`

**Scopes**: `identity`, `outcomes`, `structure`, `versions`, `stages`, `electives`, `mimlos`, `assessments`, `reading-lists`, `effort-hours`, `schedule`, `mapping`, `traceability`, `snapshot`, `export`, `validation`, `e2e`, `ui`, `state`, `lint`, `a11y`

**Rules**:
- One logical change per commit
- Every commit must leave the repo in a green state
- Never batch unrelated changes
- Include the Co-authored-by trailer when Copilot helped
