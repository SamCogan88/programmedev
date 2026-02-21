---
description: Create a new step component with tests
---

Create a new wizard step component for the Programme Design Studio.

Follow these steps:

1. **Create the component** at `src/components/steps/react/{StepName}Step.tsx`:
   - Use a React functional component with explicit types
   - Use `useProgramme()` hook for state access
   - Use react-bootstrap components (`Form`, `Button`, `Badge`, etc.)
   - Use shared UI components from `src/components/ui/` (`SectionCard`, `Accordion`, `Alert`, `Icon`, `FormField`)
   - Add `data-testid` attributes on all interactive elements
   - Ensure full ARIA compliance and keyboard accessibility

2. **Create the test file** at `src/components/steps/react/{StepName}Step.test.tsx`:
   - Use Vitest + React Testing Library
   - Mock the store: `vi.mock("../../../state/store")`
   - Test rendering, user interactions, state updates, edge cases, and empty states
   - Target >90% coverage

3. **Register the step**:
   - Add to `STEP_COMPONENTS` in `src/App.tsx`
   - Add step definition to `steps` array in `src/state/store.ts`

4. **Commit atomically**:
   ```
   feat({scope}): add {StepName} step component
   ```
