#!/usr/bin/env python3
"""
DOM-based Template Tagger for QQI Programme Descriptor.

Uses lxml for proper XML DOM manipulation — only mutates <w:t> text content,
never reconstructs elements. Preserves all formatting (rPr, pPr, tcPr).

Usage:
    python scripts/tag-template.py                # tag in-place
    python scripts/tag-template.py --dry-run      # preview changes only
    python scripts/tag-template.py --input X.docx # use a different source file
    python scripts/tag-template.py --output Y.docx # write to different file

Requires: pip install lxml
"""

import sys
import zipfile
import copy
import io
from pathlib import Path
from lxml import etree

TEMPLATE_PATH = Path("public/assets/programme_descriptor_template.docx")
W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NSMAP = {"w": W_NS}

DRY_RUN = "--dry-run" in sys.argv
changes: list[str] = []


def log(msg: str):
    changes.append(msg)
    print(f"  ✓ {msg}")


# ============================================================================
# DOM Helpers
# ============================================================================

def wtag(local: str) -> str:
    """Return fully qualified w: tag name."""
    return f"{{{W_NS}}}{local}"


def get_tables(body: etree._Element) -> list[etree._Element]:
    """Get all <w:tbl> elements in document order."""
    return list(body.iter(wtag("tbl")))


def get_rows(tbl: etree._Element) -> list[etree._Element]:
    """Get direct <w:tr> children of a table."""
    return tbl.findall("w:tr", NSMAP)


def get_cells(row: etree._Element) -> list[etree._Element]:
    """Get direct <w:tc> children of a row."""
    return row.findall("w:tc", NSMAP)


def get_cell_text(cell: etree._Element) -> str:
    """Get concatenated text of all runs in a cell."""
    texts = []
    for t in cell.iter(wtag("t")):
        if t.text:
            texts.append(t.text)
    return "".join(texts)


def get_para_text(para: etree._Element) -> str:
    """Get concatenated text of all runs in a paragraph."""
    texts = []
    for t in para.iter(wtag("t")):
        if t.text:
            texts.append(t.text)
    return "".join(texts)


def set_cell_text(cell: etree._Element, new_text: str):
    """
    Replace text content in a table cell WITHOUT rebuilding the cell.

    Strategy:
    1. Find first <w:p> in cell (has the original pPr)
    2. Find first <w:r> in that paragraph (has the original rPr)
    3. Set its <w:t> text to new_text with xml:space="preserve"
    4. Remove any additional <w:r> elements (extra runs from split text)
    5. Remove any additional <w:p> elements (multi-paragraph cells → single)
    6. Leave <w:tcPr>, <w:pPr>, <w:rPr> completely untouched
    """
    paragraphs = cell.findall("w:p", NSMAP)
    if not paragraphs:
        return

    first_para = paragraphs[0]

    # Ensure there's at least one run
    runs = first_para.findall("w:r", NSMAP)
    if not runs:
        # Create a run inheriting paragraph-level rPr if available
        ppr = first_para.find("w:pPr", NSMAP)
        rpr_source = ppr.find("w:rPr", NSMAP) if ppr is not None else None

        run = etree.SubElement(first_para, wtag("r"))
        if rpr_source is not None:
            run.append(copy.deepcopy(rpr_source))
        t_el = etree.SubElement(run, wtag("t"))
        t_el.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        t_el.text = new_text
        runs = [run]
    else:
        # Set text on first run's <w:t>
        first_run = runs[0]
        t_el = first_run.find("w:t", NSMAP)
        if t_el is None:
            t_el = etree.SubElement(first_run, wtag("t"))
        t_el.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        t_el.text = new_text

        # Remove extra runs from first paragraph
        for run in runs[1:]:
            first_para.remove(run)

    # Remove extra paragraphs (keep first only)
    for para in paragraphs[1:]:
        cell.remove(para)


def set_cell_text_if_empty(cell: etree._Element, new_text: str, label: str):
    """Set cell text only if cell is currently empty or contains placeholder text."""
    current = get_cell_text(cell).strip()
    if current and "{" in current:
        return  # Already tagged
    set_cell_text(cell, new_text)
    log(f"{label}: set to {{{new_text.strip('{}')}}}" if "{" in new_text else f"{label}: set text")


def clone_row_as_command(row: etree._Element, command_text: str) -> etree._Element:
    """
    Clone a table row, clear all cell text, and set the command text in the
    first cell only.  Preserves cell properties (tcPr) so column widths and
    spans match the data row.

    docx-templates requires FOR / END-FOR commands to live in their own
    dedicated rows so that the engine knows to duplicate the *data* row
    between them.
    """
    new_row = copy.deepcopy(row)
    cells = get_cells(new_row)
    for i, cell in enumerate(cells):
        if i == 0:
            set_cell_text(cell, command_text)
        else:
            set_cell_text(cell, "")
    return new_row


def make_paragraph(text: str, copy_rpr_from: etree._Element | None = None) -> etree._Element:
    """
    Create a new <w:p> element with a single run containing text.
    Optionally copies rPr from a reference element for consistent formatting.
    """
    para = etree.Element(wtag("p"))
    run = etree.SubElement(para, wtag("r"))

    if copy_rpr_from is not None:
        # Find an rPr to copy from the reference element
        rpr = copy_rpr_from.find(".//w:rPr", NSMAP)
        if rpr is not None:
            run.append(copy.deepcopy(rpr))

    t_el = etree.SubElement(run, wtag("t"))
    t_el.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    t_el.text = text
    return para


# ============================================================================
# Phase 0: Merge Split Runs
# ============================================================================

def merge_split_runs(body: etree._Element) -> int:
    """
    Find adjacent <w:r> elements where text forms {field} pattern.
    Merge into first run, remove subsequent runs. Keep first run's rPr.

    Returns count of merges performed.
    """
    count = 0
    for para in body.iter(wtag("p")):
        runs = para.findall("w:r", NSMAP)
        if len(runs) < 2:
            continue

        # Build a list of (run, text) pairs
        run_texts = []
        for r in runs:
            t = r.find("w:t", NSMAP)
            run_texts.append((r, t.text if t is not None else ""))

        # Scan for patterns like "{" + "field_name" + "}" across runs
        i = 0
        while i < len(run_texts):
            r, text = run_texts[i]
            text = text.strip() if text else ""

            if text == "{" and i + 2 < len(run_texts):
                _, mid_text = run_texts[i + 1]
                _, end_text = run_texts[i + 2]
                mid_text = (mid_text or "").strip()
                end_text = (end_text or "").strip()

                if end_text == "}" and mid_text and " " not in mid_text:
                    # Merge: set first run text to full field, remove others
                    merged = "{" + mid_text + "}"
                    t_el = r.find("w:t", NSMAP)
                    if t_el is not None:
                        t_el.text = merged
                        t_el.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")

                    # Remove the middle and end runs
                    para.remove(run_texts[i + 1][0])
                    para.remove(run_texts[i + 2][0])

                    # Rebuild run_texts list
                    run_texts = []
                    for r2 in para.findall("w:r", NSMAP):
                        t2 = r2.find("w:t", NSMAP)
                        run_texts.append((r2, t2.text if t2 is not None else ""))

                    count += 1
                    continue  # Re-scan from same position

            i += 1

    return count


# ============================================================================
# Phase 1: Tag Simple Fields
# ============================================================================

def tag_simple_fields(body: etree._Element):
    """Tag non-repeating fields in known table cells."""
    tables = get_tables(body)

    # --- T06 (1B.1 Principal Programme) ---
    # Row 4 has: award_class, (empty), nfq_level, ects, (empty), ...
    # These are ALREADY in the original as split runs — now merged by Phase 0
    # Just verify they exist

    # --- T09 (1C.1 Principal Programme) ---
    t09 = tables[9]
    rows = get_rows(t09)

    # Row 2, C1: NFQ Level → already has {nfq_level} from original
    # Row 2, C3: Award Class → already has {award_class} from original
    # Row 3, C1: Award Type
    if len(rows) > 3:
        cells = get_cells(rows[3])
        if len(cells) > 1 and "{" not in get_cell_text(cells[1]):
            set_cell_text(cells[1], "{award_type}")
            log("T09 R3C1: set {award_type}")

        # Row 3, C3: ECTS → already has {ects} from original

    # --- T19 (2.2 Award Standards) ---
    t19 = tables[19]
    rows = get_rows(t19)
    if len(rows) > 1:
        cells = get_cells(rows[1])
        if len(cells) > 1 and "{" not in get_cell_text(cells[1]):
            set_cell_text(cells[1], "{award_standard_name}")
            log("T19 R1C1: set {award_standard_name}")

    # --- T21 (2.4 MIPLOs) ---
    # {miplos} is already in original as split run → now merged

    # --- T08 (1B.5 Programme Schedule) - programme title ---
    t08 = tables[8]
    rows = get_rows(t08)
    if len(rows) > 2:
        cells = get_cells(rows[2])
        if len(cells) > 1 and "{" not in get_cell_text(cells[1]):
            set_cell_text(cells[1], "{programme_title}")
            log("T08 R2C1: set {programme_title}")


# ============================================================================
# Phase 2: Tag Module Descriptor Block (Section 7, T60-T70)
# ============================================================================

def tag_module_descriptors(body: etree._Element):
    """Tag the Section 7 module descriptor tables with field and FOR loop commands."""
    tables = get_tables(body)

    # --- T60: Module Overview ---
    t60 = tables[60]
    rows = get_rows(t60)

    # Row 1: Module Number | {code} | Module Title | {title}
    if len(rows) > 1:
        cells = get_cells(rows[1])
        if len(cells) > 1 and "{" not in get_cell_text(cells[1]):
            set_cell_text(cells[1], "{$module.code}")
            log("T60 R1C1: set {$module.code}")
        if len(cells) > 3 and "{" not in get_cell_text(cells[3]):
            set_cell_text(cells[3], "{$module.title}")
            log("T60 R1C3: set {$module.title}")

    # Row 2: Stage | {stage} | Semester | {semester} | Duration | {durationWeeks} | ECTS | {credits}
    if len(rows) > 2:
        cells = get_cells(rows[2])
        if len(cells) > 1 and "{" not in get_cell_text(cells[1]):
            set_cell_text(cells[1], "{$module.stage}")
            log("T60 R2C1: set {$module.stage}")
        if len(cells) > 3 and "{" not in get_cell_text(cells[3]):
            set_cell_text(cells[3], "{$module.semester}")
            log("T60 R2C3: set {$module.semester}")
        if len(cells) > 5 and "{" not in get_cell_text(cells[5]):
            set_cell_text(cells[5], "{$module.durationWeeks}")
            log("T60 R2C5: set {$module.durationWeeks}")
        if len(cells) > 7 and "{" not in get_cell_text(cells[7]):
            set_cell_text(cells[7], "{$module.credits}")
            log("T60 R2C7: set {$module.credits}")

    # Row 3: Mandatory/Elective | {M/E} | Hours per Week | {hoursPerWeek}
    if len(rows) > 3:
        cells = get_cells(rows[3])
        if len(cells) > 1 and "{" not in get_cell_text(cells[1]):
            set_cell_text(cells[1], "{$module.mandatoryElective}")
            log("T60 R3C1: set {$module.mandatoryElective}")
        if len(cells) > 3 and "{" not in get_cell_text(cells[3]):
            set_cell_text(cells[3], "{$module.hoursPerWeek}")
            log("T60 R3C3: set {$module.hoursPerWeek}")

    # Effort hours — rows 7-14, column 2
    effort_map = [
        (7, "effortOnsite"),
        (8, "effortSyncOnline"),
        (9, "effortSyncHybrid"),
        (11, "effortAsync"),
        (12, "effortIndependent"),
        (13, "effortWorkBased"),
        (14, "effortOther"),
    ]
    for row_idx, field in effort_map:
        if row_idx < len(rows):
            cells = get_cells(rows[row_idx])
            if len(cells) > 2 and "{" not in get_cell_text(cells[2]):
                set_cell_text(cells[2], "{$module." + field + "}")
                log(f"T60 R{row_idx}C2: set {{$module.{field}}}")

    # Row 15: Total
    if len(rows) > 15:
        cells = get_cells(rows[15])
        if len(cells) > 1 and "{" not in get_cell_text(cells[1]):
            set_cell_text(cells[1], "{$module.effortTotal}")
            log("T60 R15C1: set {$module.effortTotal}")

    # --- T62: Assessment technique percentages ---
    t62 = tables[62]
    rows62 = get_rows(t62)
    assess_map = [
        (1, 1, "assessContinuous"),
        (1, 3, "assessExamInPerson"),
        (1, 5, "assessPractical"),
        (2, 1, "assessProject"),
        (2, 3, "assessExamOnline"),
        (2, 5, "assessWorkBased"),
    ]
    for row_idx, col_idx, field in assess_map:
        if row_idx < len(rows62):
            cells = get_cells(rows62[row_idx])
            if col_idx < len(cells) and "{" not in get_cell_text(cells[col_idx]):
                set_cell_text(cells[col_idx], "{$module." + field + "}")
                log(f"T62 R{row_idx}C{col_idx}: set {{$module.{field}}}")

    # --- T63: MIMLOs (FOR loop) ---
    # docx-templates needs FOR and END-FOR in their own rows:
    #   Row A: {FOR mimlo IN $module.mimlos}  |  (empty)
    #   Row B: {$mimlo.index}. {$mimlo.text}  |  {$mimlo.relatedPlos}
    #   Row C: {END-FOR mimlo}                |  (empty)
    t63 = tables[63]
    rows63 = get_rows(t63)
    if len(rows63) > 2:
        data_row = rows63[2]
        for_row = clone_row_as_command(data_row, "{FOR mimlo IN $module.mimlos}")
        endfor_row = clone_row_as_command(data_row, "{END-FOR mimlo}")

        cells = get_cells(data_row)
        if len(cells) >= 2:
            set_cell_text(cells[0], "{$mimlo.index}. {$mimlo.text}")
            set_cell_text(cells[1], "{$mimlo.relatedPlos}")

        # Insert FOR row before data row, END-FOR after
        t63.insert(list(t63).index(data_row), for_row)
        t63.insert(list(t63).index(data_row) + 1, endfor_row)
        log("T63: set MIMLO FOR loop (3-row structure)")

        # Remove extra empty rows (rows after our new END-FOR)
        for row in get_rows(t63):
            if row not in (rows63[0], rows63[1], for_row, data_row, endfor_row):
                t63.remove(row)
                log("T63: removed extra empty row")

    # --- T68: Assessment strategy (FOR loop) ---
    # Same 3-row structure:
    #   Row A: {FOR asmt IN $module.assessments}  |  (empty)  |  (empty)
    #   Row B: {$asmt.mimloText}                  |  {$asmt.type}  |  {$asmt.weighting}%
    #   Row C: {END-FOR asmt}                     |  (empty)  |  (empty)
    t68 = tables[68]
    rows68 = get_rows(t68)
    if len(rows68) > 2:
        data_row = rows68[2]
        for_row = clone_row_as_command(data_row, "{FOR asmt IN $module.assessments}")
        endfor_row = clone_row_as_command(data_row, "{END-FOR asmt}")

        cells = get_cells(data_row)
        if len(cells) >= 3:
            set_cell_text(cells[0], "{$asmt.mimloText}")
            set_cell_text(cells[1], "{$asmt.title}")
            set_cell_text(cells[2], "{$asmt.weighting}%")

        t68.insert(list(t68).index(data_row), for_row)
        t68.insert(list(t68).index(data_row) + 1, endfor_row)
        log("T68: set assessment FOR loop (3-row structure)")

        for row in get_rows(t68):
            if row not in (rows68[0], rows68[1], for_row, data_row, endfor_row):
                t68.remove(row)
                log("T68: removed extra empty row")

    # --- T70: Reading lists ---
    t70 = tables[70]
    rows70 = get_rows(t70)
    if len(rows70) > 1:
        cells = get_cells(rows70[1])
        if cells and "{" not in get_cell_text(cells[0]):
            set_cell_text(cells[0], "{$module.readingListText}")
            log("T70 R1C0: set {$module.readingListText}")

    # --- Remove footnote references inside T60-T70 ---
    # When docx-templates expands the FOR loop, footnote refs get duplicated
    # for each module, causing Word to flag "Footnotes N" repair errors.
    # Strip them from within the repeating section.
    for tbl in tables[60:71]:
        for fn_ref in tbl.findall(f".//{{{W_NS}}}footnoteReference"):
            fn_run = fn_ref.getparent()
            if fn_run.tag != wtag("r"):
                fn_run = fn_run.getparent()
            fn_run.getparent().remove(fn_run)
            log(f"Removed footnote ref (id={fn_ref.get(wtag('id'))}) from FOR loop")

    # --- Wrap T60-T70 in block-level FOR loop ---
    # Insert {FOR module IN modules} paragraph before T60
    # Insert {END-FOR module} paragraph after T70
    # Copy rPr from a nearby run for consistent formatting

    # Find a reference element for formatting
    ref_run = t60.find(".//w:r", NSMAP)

    for_para = make_paragraph("{FOR module IN modules}", copy_rpr_from=ref_run)
    endfor_para = make_paragraph("{END-FOR module}", copy_rpr_from=ref_run)

    # Insert FOR before T60
    parent = t60.getparent()
    t60_idx = list(parent).index(t60)
    parent.insert(t60_idx, for_para)
    log("Section 7: inserted {FOR module IN modules} before T60")

    # Insert END-FOR after T70 (re-find index since we just inserted)
    t70_idx = list(parent).index(t70)
    parent.insert(t70_idx + 1, endfor_para)
    log("Section 7: inserted {END-FOR module} after T70")


# ============================================================================
# Phase 3: Tag Assessment Strategy (T55)
# ============================================================================

def tag_assessment_strategy(body: etree._Element):
    """Tag the PLO assessment strategy table with FOR loop (3-row structure)."""
    tables = get_tables(body)
    t55 = tables[55]
    rows = get_rows(t55)

    if len(rows) > 3:
        # Row 3 is the first data row — restructure into FOR/data/END-FOR
        data_row = rows[3]
        for_row = clone_row_as_command(data_row, "{FOR plo IN ploAssessmentMap}")
        endfor_row = clone_row_as_command(data_row, "{END-FOR plo}")

        cells = get_cells(data_row)
        if len(cells) >= 4:
            set_cell_text(cells[0], "PLO {$plo.index}")
            set_cell_text(cells[1], "{$plo.moduleMimloText}")
            set_cell_text(cells[2], "{$plo.assessmentTechniques}")
            set_cell_text(cells[3], "{$plo.weightings}")

        t55.insert(list(t55).index(data_row), for_row)
        t55.insert(list(t55).index(data_row) + 1, endfor_row)
        log("T55: set PLO assessment strategy FOR loop (3-row structure)")

        # Remove extra empty rows (rows 4+ from original)
        for row in get_rows(t55):
            if row not in (rows[0], rows[1], rows[2], for_row, data_row, endfor_row):
                t55.remove(row)
                log("T55: removed extra empty row")


# ============================================================================
# Phase 4: Tag Appendix 1 Mapping (T79)
# ============================================================================

def tag_appendix_mapping(body: etree._Element):
    """Tag the Appendix 1 strand mapping table."""
    tables = get_tables(body)
    t79 = tables[79]
    rows = get_rows(t79)

    # Row 0: Header with programme title — replace placeholder text
    if rows:
        cells = get_cells(rows[0])
        if cells:
            current = get_cell_text(cells[0])
            if "<Enter Programme Title>" in current or "<Enter" in current:
                set_cell_text(
                    cells[0],
                    "Comparison of Purpose of Programme {programme_title} to Purpose of "
                    "{award_class} awards at level {nfq_level} in the National Framework "
                    "of Qualifications",
                )
                log("T79 R0C0: set header with programme/award/level tags")

    # Row 3: Subheader with standard name
    if len(rows) > 3:
        cells = get_cells(rows[3])
        if cells:
            current = get_cell_text(cells[0])
            if "<Enter St" in current or "<Enter" in current:
                set_cell_text(
                    cells[0],
                    "Comparison of MIPLOs to QQI Awards standards in {award_standard_name}",
                )
                log("T79 R3C0: set {award_standard_name} in subheader")

    # Rows 5-10: Strand mappings
    strands = [
        (5, "knowledge_breadth"),
        (6, "knowhow_skill"),
        (7, "competence_context"),
        (8, "competence_role"),
        (9, "competence_learning"),
        (10, "competence_insight"),
    ]
    for row_idx, name in strands:
        if row_idx < len(rows):
            cells = get_cells(rows[row_idx])
            if len(cells) >= 5:
                if "{" not in get_cell_text(cells[3]):
                    set_cell_text(cells[3], "{mapping_" + name + "_plos}")
                    log(f"T79 R{row_idx}C3: set {{mapping_{name}_plos}}")
                if "{" not in get_cell_text(cells[4]):
                    set_cell_text(cells[4], "{mapping_" + name + "_evidence}")
                    log(f"T79 R{row_idx}C4: set {{mapping_{name}_evidence}}")


# ============================================================================
# Main
# ============================================================================

def main():
    # Parse args
    input_path = TEMPLATE_PATH
    output_path = TEMPLATE_PATH

    args = sys.argv[1:]
    if "--input" in args:
        idx = args.index("--input")
        input_path = Path(args[idx + 1])
    if "--output" in args:
        idx = args.index("--output")
        output_path = Path(args[idx + 1])

    print(f"Reading template: {input_path}")

    # Read the docx zip
    with zipfile.ZipFile(input_path, "r") as zin:
        # Read all entries
        zip_contents: dict[str, bytes] = {}
        for name in zin.namelist():
            zip_contents[name] = zin.read(name)

    # Parse document.xml
    doc_xml = zip_contents["word/document.xml"]
    root = etree.fromstring(doc_xml)
    body = root.find("w:body", NSMAP)
    if body is None:
        print("ERROR: No <w:body> found in document.xml")
        sys.exit(1)

    tables = get_tables(body)
    print(f"Found {len(tables)} tables\n")

    # Phase 0: Merge split runs
    print("Phase 0: Merging split runs...")
    merge_count = merge_split_runs(body)
    print(f"  Merged {merge_count} split runs\n")

    # Phase 1: Simple fields
    print("Phase 1: Tagging simple fields...")
    tag_simple_fields(body)
    print()

    # Phase 2: Module descriptors (Section 7)
    print("Phase 2: Tagging module descriptor block...")
    tag_module_descriptors(body)
    print()

    # Phase 3: Assessment strategy (T55)
    print("Phase 3: Tagging assessment strategy...")
    tag_assessment_strategy(body)
    print()

    # Phase 4: Appendix 1 mapping (T79)
    print("Phase 4: Tagging appendix mapping...")
    tag_appendix_mapping(body)
    print()

    # Summary
    print(f"\n{'='*60}")
    print(f"  Total changes: {len(changes)}")
    print(f"{'='*60}")

    # Verify: count commands in the result
    cmd_count = 0
    for_count = 0
    field_count = 0
    import re
    for t in root.iter(wtag("t")):
        if t.text:
            for m in re.finditer(r"\{([^}]+)\}", t.text):
                raw = m.group(1).strip()
                cmd_count += 1
                if raw.startswith("FOR "):
                    for_count += 1
                elif raw.startswith("END-FOR"):
                    pass  # don't count as field
                else:
                    field_count += 1

    print(f"\n  Commands found: {cmd_count} total ({for_count} FOR, {field_count} fields)")

    # Check for remaining split runs
    remaining_splits = 0
    for para in body.iter(wtag("p")):
        runs = para.findall("w:r", NSMAP)
        if len(runs) < 2:
            continue
        full_text = get_para_text(para)
        if "{" not in full_text:
            continue
        for r in runs:
            t = r.find("w:t", NSMAP)
            txt = t.text if t is not None else ""
            if "{" in txt and "}" not in txt:
                remaining_splits += 1
                break

    if remaining_splits:
        print(f"\n  ⚠️  {remaining_splits} split runs still remain!")
    else:
        print(f"\n  ✅ No split runs remaining")

    if DRY_RUN:
        print("\n[DRY RUN] No file written.")
        return

    # Serialize the modified XML
    modified_xml = etree.tostring(root, xml_declaration=True, encoding="UTF-8", standalone=True)

    # Write the output docx
    zip_contents["word/document.xml"] = modified_xml

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zout:
        for name, data in zip_contents.items():
            zout.writestr(name, data)

    output_path.write_bytes(buf.getvalue())
    print(f"\nTagged template written to {output_path} ({len(buf.getvalue())} bytes)")


if __name__ == "__main__":
    main()
