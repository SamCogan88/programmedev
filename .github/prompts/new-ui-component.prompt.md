---
description: Create a new reusable UI component with tests
---

Create a new reusable UI component in the shared component library.

1. **Create the component** at `src/components/ui/{ComponentName}.tsx`:
   - Use a React functional component with explicit prop types
   - Use react-bootstrap primitives where possible
   - Ensure full ARIA compliance and keyboard accessibility
   - Use Bootstrap 5 utility classes for styling (no inline styles)
   - Use Phosphor icon classes with `aria-hidden="true"` for decorative icons

2. **Create the test file** at `src/components/ui/{ComponentName}.test.tsx`:
   - Use Vitest + React Testing Library
   - Test rendering, props, interactions, accessibility, and edge cases
   - Target >90% coverage

3. **Export from barrel** — add to `src/components/ui/index.ts`

4. **Commit**:
   ```
   feat(ui): add {ComponentName} component
   ```

### Existing UI components (avoid duplication):
- `SectionCard` — Card wrapper for step sections
- `Alert` — Warning/info alert with icon
- `Accordion` / `AccordionItem` / `AccordionControls` — Custom accordion wrapping react-bootstrap
- `Icon` — Phosphor icon wrapper
- `FormField` / `FormInput` / `FormSelect` — Form components with labels
- `BloomsGuidance` — Bloom's Taxonomy verb guidance panel
