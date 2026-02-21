---
description: Inspect or update the Word document template
---

Work with the QQI Programme Descriptor Word template.

## Inspect current template

Show the template's structure, tables, and command tags:
```bash
npm run template:inspect
```

This outputs a markdown summary with:
- Document metadata (pages, words, creator)
- All 80 tables with their first-cell content
- All template commands grouped by type (INS, FOR, END-FOR)
- Unique field names used

## Re-tag the template

If the template has been replaced with a new version from QQI, re-apply the command tags:
```bash
npm run template:tag
```

Use `--dry-run` to preview changes without modifying the file:
```bash
npm run template:tag -- --dry-run
```

## Adding a new template field

1. Add the `{field_name}` tag to the template (in Word or via `scripts/tag-template.py`)
2. Add the field to `DescriptorData` in `src/export/descriptor-data.ts`
3. Map it from `Programme` in `buildDescriptorData()`
4. Write a test in `src/export/descriptor-data.test.ts`
5. Run `npm run template:inspect` to verify the tag appears

## Architecture

- **Template**: `public/assets/programme_descriptor_template.docx` — externally owned, contains `{field}` and `{FOR}...{END-FOR}` tags
- **Data mapper**: `src/export/descriptor-data.ts` — pure function, `Programme → DescriptorData`
- **Export function**: `src/export/word.ts` — loads template, calls `createReport()` from `docx-templates`
- **Tagging script**: `scripts/tag-template.py` — programmatically inserts tags into the .docx XML
- **Inspection script**: `scripts/inspect-docx.py` — reads and summarises template structure
