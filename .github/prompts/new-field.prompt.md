---
description: Add a new field to the Programme data model
---

Add a new field to the Programme data model. This requires coordinated changes across multiple files.

Follow these steps in order, committing atomically after each logical group:

1. **Add the type** to the appropriate file in `src/types/`:
   - `programme.ts` for programme-level fields
   - `module.ts` for module-level fields (Module, MIMLO, ModuleAssessment, ReadingListItem)
   - `version.ts` for version/stage fields
   - `plo.ts` for PLO fields
   - Make the field optional if not always present: `newField?: string`

2. **Initialize the default** in `defaultProgramme()` in `src/state/store.ts` (if needed)

3. **Handle schema migration** in `src/utils/migrate-programme.ts` if loading old data that lacks this field

4. **Add UI** in the appropriate step component (`src/components/steps/react/`)

5. **Add validation rules** in `src/utils/validation.ts` (if applicable)

6. **Update the Word export** (if the field should appear in the Programme Descriptor):
   - Add tag to the template (via `scripts/tag-template.py` or manually)
   - Add to `DescriptorData` interface in `src/export/descriptor-data.ts`
   - Map from Programme in `buildDescriptorData()`

7. **Write tests** for each change — maintain 90% coverage

Use `??` (nullish coalescing) when accessing the new field: `obj.newField ?? defaultValue`
