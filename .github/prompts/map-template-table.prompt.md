---
description: Map a new table in the QQI Word template to programme data
---

Map a new table from the QQI Programme Descriptor template to programme data so it is populated during Word export.

## Prerequisites

- Python 3 with `lxml` installed (`pip install lxml`)
- Familiarity with the `.docx` XML format (Office Open XML)

## Overview

The export pipeline has three layers:

1. **Template** (`public/assets/programme_descriptor_template.docx`) — the QQI-owned Word document with `{field}` and `{FOR}...{END-FOR}` command tags
2. **Data mapper** (`src/export/descriptor-data.ts`) — pure function `Programme → DescriptorData` that produces a flat object matching the template tags
3. **Export engine** (`src/export/word.ts`) — loads the template, injects the data via `docx-templates`, and generates the output

Tags are inserted into the template XML by `scripts/tag-template.py`. The template is inspected with `scripts/inspect-docx.py`.

## Step-by-step process

### 1. Identify the target table

Run the inspector to find the table index:

```bash
python scripts/inspect-docx.py tables public/assets/programme_descriptor_template.docx
```

This lists all 80 tables with their index, dimensions, and first-row text. Find the table you want to map (e.g., `[55]` for the PLO assessment strategy table).

Drill into a specific table to see its row/cell layout:

```bash
python scripts/inspect-docx.py table public/assets/programme_descriptor_template.docx 55
```

### 2. Decide: simple field vs FOR loop

| Pattern | When to use | Example |
|---|---|---|
| `{field_name}` | Single value in a fixed cell | `{programme_title}`, `{nfq_level}` |
| `{$module.field}` | Field inside an existing FOR loop | `{$module.code}`, `{$module.credits}` |
| `{FOR x IN items}...{END-FOR x}` | Repeating rows in a table | Module list, MIMLO list |

### 3. Understand the FOR loop row structure (CRITICAL)

**docx-templates requires FOR and END-FOR commands in their own dedicated table rows.** The data row between them is the one that gets duplicated. If you place FOR/END-FOR in the same row as data fields, cells expand *horizontally* instead of rows duplicating *vertically* — this corrupts the table.

Correct 3-row structure:

```
Row A: {FOR item IN items}  | (empty)       | (empty)        ← command row
Row B: {$item.field1}       | {$item.field2} | {$item.field3} ← data row (duplicated)
Row C: {END-FOR item}       | (empty)        | (empty)        ← command row
```

The command rows (A and C) must have the **same number of cells and column widths** as the data row. Use `clone_row_as_command()` in `tag-template.py` to deep-copy the data row, clear all cell text, and set the command in cell 0. This preserves `<w:tcPr>` (cell properties including widths and gridSpan).

**Block-level FOR loops** (wrapping entire tables, not rows within a table) use standalone `<w:p>` paragraphs outside the table:

```
{FOR module IN modules}     ← paragraph before table
  <table>...</table>         ← table content (duplicated per module)
{END-FOR module}            ← paragraph after table
```

Use `make_paragraph()` in `tag-template.py` to create these.

### 4. Nested FOR loops

FOR loops can be nested. The inner loop variable uses `$` prefix to reference the outer loop's current item:

```
{FOR module IN modules}           ← outer loop (block-level paragraph)
  ...
  {FOR mimlo IN $module.mimlos}   ← inner loop (table row)
  {$mimlo.index}. {$mimlo.text}   ← inner loop data
  {END-FOR mimlo}
  ...
{END-FOR module}
```

### 5. Preserving document formatting

**This is the most important rule.** The template is externally owned by QQI. The tagger must preserve all existing formatting.

Key principles in `tag-template.py`:

- **Only mutate `<w:t>` text content** — never reconstruct elements, never remove `<w:rPr>` (run properties) or `<w:tcPr>` (cell properties)
- `set_cell_text()` sets text on the first run's `<w:t>` element and removes extra runs/paragraphs, but preserves the run's formatting properties (`rPr`)
- `clone_row_as_command()` deep-copies the entire row element including all `<w:tcPr>` (cell widths, gridSpan, borders, shading) so command rows have identical column structure to data rows
- `make_paragraph()` optionally copies `<w:rPr>` from a nearby reference run for consistent font/size
- **Never modify table grid** (`<w:tblGrid>`) — column widths are defined there and must not change
- **Never modify `<w:tblPr>`** (table properties) — borders, alignment, width type
- **Footnote references** inside FOR loops get duplicated N times and corrupt the document. Strip `<w:footnoteReference>` runs from any table inside a FOR loop

### 6. Add the tag to `tag-template.py`

Open `scripts/tag-template.py` and add your tagging logic to the appropriate phase:

- **Phase 1** (`tag_simple_fields`) — for top-level fields outside FOR loops
- **Phase 2** (`tag_module_descriptors`) — for Section 7 module tables (T60–T70)
- **Phase 3** (`tag_assessment_strategy`) — for Section 6.8 (T55)
- **Phase 4** (`tag_appendix_mapping`) — for Appendix 1 (T79)

For a new table, add a new phase function or extend an existing one. Pattern:

```python
def tag_my_new_table(body: etree._Element):
    """Tag table N with field/loop commands."""
    tables = get_tables(body)
    t = tables[N]  # target table index
    rows = get_rows(t)

    # Simple field in a known cell
    if len(rows) > R:
        cells = get_cells(rows[R])
        if len(cells) > C and "{" not in get_cell_text(cells[C]):
            set_cell_text(cells[C], "{field_name}")
            log("TN RxCy: set {field_name}")

    # FOR loop (3-row structure)
    if len(rows) > DATA_ROW_IDX:
        data_row = rows[DATA_ROW_IDX]
        for_row = clone_row_as_command(
            data_row, "{FOR item IN items}"
        )
        endfor_row = clone_row_as_command(
            data_row, "{END-FOR item}"
        )

        cells = get_cells(data_row)
        set_cell_text(cells[0], "{$item.field1}")
        set_cell_text(cells[1], "{$item.field2}")

        # Insert FOR before data row, END-FOR after
        t.insert(list(t).index(data_row), for_row)
        t.insert(list(t).index(data_row) + 1, endfor_row)
        log("TN: set FOR loop (3-row structure)")

        # Remove extra empty rows
        keep = {rows[0], rows[1], for_row, data_row, endfor_row}
        for row in get_rows(t):
            if row not in keep:
                t.remove(row)
                log("TN: removed extra empty row")
```

### 7. Add the data fields to `descriptor-data.ts`

1. Add new fields to the appropriate interface (`DescriptorData`, `DescriptorModule`, or create a new interface for a new FOR loop array)
2. Map the field from `Programme` in `buildDescriptorData()`
3. Use `fmtNum()` for numbers (returns `""` for 0), `fmtPct()` for percentages

### 8. Write tests

Add tests in `src/export/descriptor-data.test.ts`:

```typescript
it("maps the new field correctly", () => {
  const data = buildDescriptorData(
    makeProgramme({ /* minimal data to test */ }),
  );
  expect(data.newField).toBe("expected");
});
```

### 9. Re-tag the template

**Always start from the clean original template** (commit `4804660`), then run the tagger:

```bash
# Restore clean original
git checkout 4804660 -- public/assets/programme_descriptor_template.docx

# Run the tagger
python scripts/tag-template.py

# Verify
python scripts/inspect-docx.py commands public/assets/programme_descriptor_template.docx
```

**Never tag an already-tagged template** — running the tagger twice would corrupt field references.

### 10. Verify with comparison

Export a document with test data, then compare against the template:

```bash
python scripts/inspect-docx.py compare public/assets/programme_descriptor_template.docx path/to/output.docx
```

This checks:
- Table grid column widths match
- Cell widths and gridSpan per row match
- No residual `{FOR}` or `{$field}` commands in output
- No duplicated footnote references
- No row cell span anomalies

### 11. Validation checklist

Before committing:

1. `npx vitest run src/export/descriptor-data.test.ts` — tests pass
2. `npx tsc --noEmit` — no type errors
3. `npm run build` — builds successfully
4. Export a document with both sample datasets and open in Word — no repair dialog
5. `python scripts/inspect-docx.py compare <template> <output>` — zero issues

## Reference: docx-templates behaviour

- **Browser import**: `import createReport from "docx-templates/lib/browser.js"` (not the default entry)
- **Sandbox**: Must use `noSandbox: true` — the default JS sandbox doesn't work in browser
- **Variable prefix**: Inside a FOR loop, access the loop variable with `$` prefix: `{$module.code}`, `{$mimlo.text}`
- **Row duplication**: FOR/END-FOR in table rows duplicate the row between them for each array element
- **Block duplication**: FOR/END-FOR as standalone paragraphs duplicate everything between them (paragraphs and tables)
- **Nested loops**: Supported — inner loop references outer variable with `$`: `{FOR mimlo IN $module.mimlos}`

## Reference: inspect-docx.py commands

| Command | Description |
|---|---|
| `overview <file>` | High-level summary (tables, commands, paragraphs, split runs) |
| `tables <file>` | List all tables with index, dimensions, header text |
| `table <file> <idx>` | Show all rows/cells for a specific table |
| `commands <file>` | List all template commands with location |
| `loops <file>` | Show FOR loops with nested fields |
| `paras <file> [start] [end]` | Show paragraphs in range |
| `splits <file>` | Find split runs (commands broken across XML runs) |
| `search <file> <pattern>` | Regex search across paragraphs |
| `compare <template> <output>` | Deep structural comparison (7 checks) |

## Reference: tag-template.py helpers

| Helper | Purpose |
|---|---|
| `get_cell_text(cell)` | Read concatenated text from a cell |
| `set_cell_text(cell, text)` | Set cell text, preserving formatting |
| `clone_row_as_command(row, cmd)` | Deep-copy row for FOR/END-FOR command |
| `make_paragraph(text, rpr)` | Create standalone `<w:p>` for block-level commands |
| `merge_split_runs(body)` | Fix commands split across multiple XML runs |

## Common mistakes

- ❌ Placing `{FOR}` and data fields in the **same row** → cells expand horizontally
- ❌ Running the tagger on an already-tagged template → double tags
- ❌ Forgetting to strip footnote references from FOR loop sections → repair errors
- ❌ Modifying `<w:tblGrid>` or `<w:tblPr>` → column widths/borders change
- ❌ Using `type` instead of `title` for assessment technique names → shows category not title
- ❌ Hardcoding effort hour fields to 0 instead of reading from data → missing values
