#!/usr/bin/env python3
"""
DOCX Inspector — CLI helper for examining .docx structure.

Usage:
    python scripts/inspect-docx.py overview <file>
    python scripts/inspect-docx.py tables <file>
    python scripts/inspect-docx.py table <file> <index>
    python scripts/inspect-docx.py commands <file>
    python scripts/inspect-docx.py loops <file>
    python scripts/inspect-docx.py paras <file> [start] [end]
    python scripts/inspect-docx.py splits <file>
    python scripts/inspect-docx.py search <file> <pattern>
    python scripts/inspect-docx.py parts <file>
    python scripts/inspect-docx.py xml <file> [part]
    python scripts/inspect-docx.py compare <template> <output>
"""

import sys
import re
import zipfile
from pathlib import Path
from lxml import etree

W_NS = (
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
)
NSMAP = {"w": W_NS}


# ── Core helpers ─────────────────────────────────────────────


def read_docx_xml(
    path: Path,
    part: str = "word/document.xml",
) -> etree._Element:
    """Read and parse an XML part from a .docx ZIP archive."""
    with zipfile.ZipFile(path) as z:
        return etree.fromstring(z.read(part))


def list_parts(path: Path) -> list[str]:
    """Return the list of ZIP entry names in a .docx file."""
    with zipfile.ZipFile(path) as z:
        return z.namelist()


def extract_paras(path: Path) -> list[dict]:
    """Extract all paragraphs with text, style, and location."""
    root = read_docx_xml(path)
    results = []
    for i, para in enumerate(root.iter(f"{{{W_NS}}}p")):
        style_el = para.find("w:pPr/w:pStyle", NSMAP)
        style = (
            style_el.get(f"{{{W_NS}}}val")
            if style_el is not None
            else None
        )
        runs = []
        for r in para.iter(f"{{{W_NS}}}r"):
            t = r.find("w:t", NSMAP)
            if t is not None and t.text:
                runs.append(t.text)
        text = "".join(runs)
        parent = para.getparent()
        in_table = (
            parent.tag == f"{{{W_NS}}}tc"
            if parent is not None
            else False
        )
        results.append({
            "i": i,
            "style": style,
            "text": text,
            "runs": runs,
            "tbl": in_table,
        })
    return results


def find_commands(path: Path) -> list[dict]:
    """Find all template commands ({FOR}, {field}, etc.)."""
    paras = extract_paras(path)
    cmds = []
    pat = re.compile(r"\{([^}]+)\}")
    for p in paras:
        for m in pat.finditer(p["text"]):
            raw = m.group(1).strip()
            if raw.startswith("FOR "):
                t = "FOR"
            elif raw.startswith("END-FOR"):
                t = "END-FOR"
            elif raw.startswith("IF "):
                t = "IF"
            elif raw == "END-IF":
                t = "END-IF"
            elif raw.startswith("INS "):
                t = "INS"
            else:
                t = "field"
            cmds.append({
                "para": p["i"],
                "tbl": p["tbl"],
                "raw": raw,
                "type": t,
            })
    return cmds


def list_tables(path: Path) -> list[dict]:
    """List all tables with row/col counts and header text."""
    root = read_docx_xml(path)
    tables = []
    for i, tbl in enumerate(root.iter(f"{{{W_NS}}}tbl")):
        rows = tbl.findall("w:tr", NSMAP)
        first_row = []
        cols = 0
        if rows:
            cells = rows[0].findall("w:tc", NSMAP)
            cols = len(cells)
            for cell in cells:
                ct = ""
                for p in cell.iter(f"{{{W_NS}}}p"):
                    for r in p.iter(f"{{{W_NS}}}r"):
                        t = r.find("w:t", NSMAP)
                        if t is not None and t.text:
                            ct += t.text
                first_row.append(ct.strip())
        tables.append({
            "i": i,
            "rows": len(rows),
            "cols": cols,
            "header": first_row,
        })
    return tables


def get_table(path: Path, idx: int) -> list[list[str]]:
    """Get full cell text for every row in a specific table."""
    root = read_docx_xml(path)
    tbls = list(root.iter(f"{{{W_NS}}}tbl"))
    if idx >= len(tbls):
        raise IndexError(
            f"Table {idx} not found (only {len(tbls)} tables)"
        )
    result = []
    for row in tbls[idx].findall("w:tr", NSMAP):
        rd = []
        for cell in row.findall("w:tc", NSMAP):
            ct = ""
            for p in cell.iter(f"{{{W_NS}}}p"):
                for r in p.iter(f"{{{W_NS}}}r"):
                    t = r.find("w:t", NSMAP)
                    if t is not None and t.text:
                        ct += t.text
            rd.append(ct.strip())
        result.append(rd)
    return result


# ── CLI commands ─────────────────────────────────────────────


def cmd_overview(path: Path):
    """Print a high-level summary of the document."""
    paras = extract_paras(path)
    tables = list_tables(path)
    cmds = find_commands(path)
    splits = [
        p for p in paras
        if len(p["runs"]) > 1
        and "{" in p["text"]
        and any("{" in r and "}" not in r for r in p["runs"])
    ]
    ne = sum(1 for p in paras if p["text"].strip())
    fc = sum(1 for c in cmds if c["type"] == "FOR")
    ff = sum(1 for c in cmds if c["type"] == "field")
    print(f"File:        {path.name}")
    print(f"ZIP parts:   {len(list_parts(path))}")
    print(f"Tables:      {len(tables)}")
    print(f"Commands:    {len(cmds)}  ({fc} FOR, {ff} fields)")
    print(f"Paragraphs:  {len(paras)}  ({ne} non-empty)")
    print(f"Split runs:  {len(splits)}")


def cmd_tables(path: Path):
    """List all tables with index, dimensions, and header."""
    for t in list_tables(path):
        h = " | ".join(t["header"][:4])
        if len(t["header"]) > 4:
            h += " | ..."
        h = (h[:75] + "...") if len(h) > 78 else h
        print(
            f"[{t['i']:>2}] {t['rows']:>3}x{t['cols']:<3}  {h}"
        )


def cmd_table(path: Path, idx: int):
    """Show all rows and cells for a specific table."""
    content = get_table(path, idx)
    table_info = list_tables(path)[idx]
    print(f"Table [{idx}] — {table_info['rows']}x{table_info['cols']}")
    for r, row in enumerate(content):
        cells = " | ".join(c if c else "(empty)" for c in row)
        suffix = "..." if len(cells) > 120 else ""
        print(f"  R{r:>3}: {cells[:120]}{suffix}")


def cmd_commands(path: Path):
    """List all template commands found in the document."""
    for c in find_commands(path):
        loc = "T" if c["tbl"] else "P"
        print(
            f"  {loc} P{c['para']:<5} "
            f"[{c['type']:>7}] {{{c['raw']}}}"
        )


def cmd_loops(path: Path):
    """Show FOR loops with their nested field references."""
    cmds = find_commands(path)
    stack: list[dict] = []
    loops = []
    for c in cmds:
        if c["type"] == "FOR":
            parts = c["raw"].split()
            loops.append({
                "var": parts[1] if len(parts) > 1 else "?",
                "iter": parts[3] if len(parts) > 3 else "?",
                "para": c["para"],
                "fields": [],
            })
            stack.append(loops[-1])
        elif c["type"] == "END-FOR":
            if stack:
                stack.pop()
        elif c["type"] == "field" and stack:
            stack[-1]["fields"].append(c["raw"])
    for lp in loops:
        print(
            f"FOR {lp['var']} IN {lp['iter']}  "
            f"(para {lp['para']})"
        )
        for f in lp["fields"]:
            print(f"    {{{f}}}")


def cmd_paras(
    path: Path,
    start: int = 0,
    end: int | None = None,
):
    """Show paragraphs in the given range."""
    paras = extract_paras(path)
    end = min(end or start + 30, len(paras))
    for p in paras[start:end]:
        loc = "T" if p["tbl"] else "P"
        sty = f" [{p['style']}]" if p["style"] else ""
        txt = p["text"][:100]
        if len(p["text"]) > 100:
            txt += "..."
        print(f"  {loc} {p['i']:>4}{sty}: {txt}")


def cmd_splits(path: Path):
    """Find paragraphs with split runs across braces."""
    paras = extract_paras(path)
    splits = [
        p for p in paras
        if len(p["runs"]) > 1
        and "{" in p["text"]
        and any("{" in r and "}" not in r for r in p["runs"])
    ]
    if not splits:
        print("No split runs found.")
        return
    for p in splits:
        print(f"  Para {p['i']}: {p['runs']}")


def cmd_search(path: Path, pattern: str):
    """Search paragraphs for a regex pattern."""
    paras = extract_paras(path)
    pat = re.compile(pattern, re.IGNORECASE)
    hits = [p for p in paras if pat.search(p["text"])]
    if not hits:
        print(f"No matches for '{pattern}'")
        return
    for p in hits:
        txt = p["text"][:100]
        suffix = "..." if len(p["text"]) > 100 else ""
        loc = "T" if p["tbl"] else "P"
        print(f"  {loc} P{p['i']}: {txt}{suffix}")


def cmd_parts(path: Path):
    """List all ZIP parts inside the .docx file."""
    for p in list_parts(path):
        print(f"  {p}")


def cmd_xml(path: Path, part: str = "word/document.xml"):
    """Dump raw XML for a specific ZIP part."""
    root = read_docx_xml(path, part)
    print(etree.tostring(
        root, pretty_print=True, encoding="unicode",
    ))


# ── Comparison helpers ───────────────────────────────────────


def _table_grid(tbl) -> list[str]:
    """Return list of gridCol widths for a table element."""
    grid = tbl.find(f"{{{W_NS}}}tblGrid")
    if grid is None:
        return []
    return [
        c.get(f"{{{W_NS}}}w", "?")
        for c in grid.findall(f"{{{W_NS}}}gridCol")
    ]


def _table_width(tbl) -> tuple[str, str]:
    """Return (w, type) from tblPr/tblW."""
    tbl_pr = tbl.find(f"{{{W_NS}}}tblPr")
    if tbl_pr is not None:
        tw = tbl_pr.find(f"{{{W_NS}}}tblW")
        if tw is not None:
            return (
                tw.get(f"{{{W_NS}}}w", "?"),
                tw.get(f"{{{W_NS}}}type", "?"),
            )
    return "?", "?"


def _row_cell_widths(row) -> list[dict]:
    """Return list of {w, type, span} for each cell."""
    result = []
    for cell in row.findall(f"{{{W_NS}}}tc"):
        tc_pr = cell.find(f"{{{W_NS}}}tcPr")
        cell_info: dict = {"w": "?", "type": "?", "span": 1}
        if tc_pr is not None:
            tc_w = tc_pr.find(f"{{{W_NS}}}tcW")
            if tc_w is not None:
                cell_info["w"] = tc_w.get(
                    f"{{{W_NS}}}w", "?"
                )
                cell_info["type"] = tc_w.get(
                    f"{{{W_NS}}}type", "?"
                )
            gs = tc_pr.find(f"{{{W_NS}}}gridSpan")
            if gs is not None:
                cell_info["span"] = int(
                    gs.get(f"{{{W_NS}}}val", "1")
                )
        result.append(cell_info)
    return result


def _cell_text(cell) -> str:
    """Get concatenated text from a table cell element."""
    ts = cell.findall(f".//{{{W_NS}}}t")
    return "".join(t.text or "" for t in ts).strip()


def _footnote_refs(root) -> list[str]:
    """Return list of footnote reference IDs in the doc."""
    return [
        r.get(f"{{{W_NS}}}id", "?")
        for r in root.findall(
            f".//{{{W_NS}}}footnoteReference"
        )
    ]


def _table_label(tbl) -> str:
    """Get first ~60 chars of text from row 0 for ID."""
    rows = tbl.findall(f"{{{W_NS}}}tr")
    if not rows:
        return "(empty table)"
    cells = rows[0].findall(f"{{{W_NS}}}tc")
    texts = []
    for c in cells[:3]:
        texts.append(_cell_text(c)[:30])
    label = " | ".join(t for t in texts if t)
    return (label[:60] + "...") if len(label) > 60 else label


def _find_table_in_output(out_tables, tpl_label, tpl_grid):
    """Find matching table in output by header text."""
    for i, tbl in enumerate(out_tables):
        if _table_label(tbl) == tpl_label:
            return i
    return None


# ── Compare command ──────────────────────────────────────────


def cmd_compare(tpl_path: Path, out_path: Path):
    """Deep structural comparison of template vs output DOCX.

    Checks: table counts, grid column widths, cell widths per
    row, footnote ref consistency, residual commands, and
    row-level anomalies from FOR loop expansion.
    """
    tpl_root = read_docx_xml(tpl_path)
    out_root = read_docx_xml(out_path)

    tpl_tables = list(tpl_root.iter(f"{{{W_NS}}}tbl"))
    out_tables = list(out_root.iter(f"{{{W_NS}}}tbl"))
    tpl_paras = extract_paras(tpl_path)
    out_paras = extract_paras(out_path)
    tpl_cmds = find_commands(tpl_path)
    out_cmds = find_commands(out_path)

    issues: list[str] = []

    # ── 1. High-level summary ────────────────────────────────
    print("=" * 70)
    print("DOCX COMPARISON: Template vs Output")
    print("=" * 70)
    hdr = f"  {'':>25} {'Template':>12} {'Output':>12}"
    print(hdr)
    print(
        f"  {'Tables':>25} "
        f"{len(tpl_tables):>12} {len(out_tables):>12}"
    )
    print(
        f"  {'Paragraphs':>25} "
        f"{len(tpl_paras):>12} {len(out_paras):>12}"
    )
    print(
        f"  {'Commands':>25} "
        f"{len(tpl_cmds):>12} {len(out_cmds):>12}"
    )

    # ── 2. Residual commands ─────────────────────────────────
    control_types = ("FOR", "END-FOR", "IF", "END-IF", "INS")
    residual = [
        c for c in out_cmds
        if c["type"] in control_types
    ]
    unresolved_fields = [
        c for c in out_cmds
        if c["type"] == "field" and c["raw"].startswith("$")
    ]
    for c in residual:
        issues.append(
            f"Residual loop/control command: "
            f"{{{c['raw']}}}"
        )
    for c in unresolved_fields:
        issues.append(
            f"Unresolved template field: {{{c['raw']}}}"
        )

    # ── 3. Footnote consistency ──────────────────────────────
    out_fn_refs = _footnote_refs(out_root)
    fn_counts: dict[str, int] = {}
    for fid in out_fn_refs:
        fn_counts[fid] = fn_counts.get(fid, 0) + 1
    for fid, count in fn_counts.items():
        if count > 1:
            issues.append(
                f"Footnote ref id={fid} appears {count}x "
                f"(duplicated by FOR loop expansion?)"
            )
    try:
        with zipfile.ZipFile(out_path) as z:
            if "word/footnotes.xml" in z.namelist():
                fn_xml = etree.fromstring(
                    z.read("word/footnotes.xml")
                )
                fn_defs = {
                    f.get(f"{{{W_NS}}}id")
                    for f in fn_xml.findall(
                        f"{{{W_NS}}}footnote"
                    )
                }
                for fid in set(out_fn_refs):
                    if fid not in fn_defs:
                        issues.append(
                            f"Footnote ref id={fid} "
                            f"has no definition"
                        )
    except Exception:
        pass

    # ── 4. Table grid & cell width comparison ────────────────
    print("\n--- Table Grid Comparison ---")

    matched = 0
    for ti, tpl_tbl in enumerate(tpl_tables):
        tpl_grid = _table_grid(tpl_tbl)
        tpl_label = _table_label(tpl_tbl)
        tpl_tw = _table_width(tpl_tbl)

        # Skip tables with template commands in label
        if "{FOR" in tpl_label or "{$" in tpl_label:
            continue

        oi = _find_table_in_output(
            out_tables, tpl_label, tpl_grid,
        )
        if oi is None:
            continue

        out_tbl = out_tables[oi]
        out_grid = _table_grid(out_tbl)
        out_tw = _table_width(out_tbl)
        matched += 1

        label_short = tpl_label[:40]
        if tpl_grid != out_grid:
            issues.append(
                f"T[{ti}] '{label_short}': "
                f"grid mismatch — "
                f"tpl={tpl_grid}, out={out_grid}"
            )
        if tpl_tw != out_tw:
            issues.append(
                f"T[{ti}] '{label_short}': "
                f"tblW mismatch — "
                f"tpl={tpl_tw}, out={out_tw}"
            )

        # Row-by-row cell width comparison
        tpl_rows = tpl_tbl.findall(f"{{{W_NS}}}tr")
        out_rows = out_tbl.findall(f"{{{W_NS}}}tr")
        max_rows = min(len(tpl_rows), len(out_rows))
        for ri in range(max_rows):
            tpl_cw = _row_cell_widths(tpl_rows[ri])
            out_cw = _row_cell_widths(out_rows[ri])
            if len(tpl_cw) != len(out_cw):
                issues.append(
                    f"T[{ti}] R{ri}: cell count — "
                    f"tpl={len(tpl_cw)}, "
                    f"out={len(out_cw)}"
                )
            else:
                for ci in range(len(tpl_cw)):
                    tw = tpl_cw[ci]
                    ow = out_cw[ci]
                    if (
                        tw["w"] != ow["w"]
                        or tw["type"] != ow["type"]
                    ):
                        issues.append(
                            f"T[{ti}] R{ri} C{ci}: "
                            f"width — "
                            f"tpl={tw['w']}/{tw['type']}"
                            f", out={ow['w']}/{ow['type']}"
                        )
                    if tw["span"] != ow["span"]:
                        issues.append(
                            f"T[{ti}] R{ri} C{ci}: "
                            f"gridSpan — "
                            f"tpl={tw['span']}, "
                            f"out={ow['span']}"
                        )

    tpl_count = len(tpl_tables)
    print(
        f"  Matched {matched}/{tpl_count} "
        f"template tables in output"
    )

    # ── 5. FOR loop expansion check ──────────────────────────
    print("\n--- FOR Loop Expansion Check ---")
    grid_groups: dict[str, list[int]] = {}
    for i, tbl in enumerate(out_tables):
        g = tuple(_table_grid(tbl))
        key = str(g)
        grid_groups.setdefault(key, []).append(i)

    for key, indices in grid_groups.items():
        if len(indices) <= 2:
            continue
        # Check all instances have same grid
        grids = [_table_grid(out_tables[i]) for i in indices]
        first_grid = grids[0]
        for idx, g in zip(indices, grids):
            if g != first_grid:
                issues.append(
                    f"FOR-expanded T[{idx}]: "
                    f"grid differs — "
                    f"expected {first_grid}, got {g}"
                )

        # Compare cell widths against first instance
        ref_tbl = out_tables[indices[0]]
        ref_rows = ref_tbl.findall(f"{{{W_NS}}}tr")
        for idx in indices[1:]:
            tbl = out_tables[idx]
            rows = tbl.findall(f"{{{W_NS}}}tr")
            if len(rows) != len(ref_rows):
                continue
            for ri in range(len(rows)):
                ref_cw = _row_cell_widths(ref_rows[ri])
                cur_cw = _row_cell_widths(rows[ri])
                if len(ref_cw) != len(cur_cw):
                    issues.append(
                        f"FOR-expanded T[{idx}] R{ri}: "
                        f"cell count {len(cur_cw)} vs "
                        f"T[{indices[0]}] ({len(ref_cw)})"
                    )

        ref_label = _table_label(out_tables[indices[0]])
        print(
            f"  {len(indices)} instances of "
            f"grid {key[:60]}: '{ref_label[:40]}'"
        )

    # ── 6. Row cell count anomalies ──────────────────────────
    print("\n--- Row Cell Count Anomalies ---")
    row_issues_count = 0
    for i, tbl in enumerate(out_tables):
        grid_cols = len(_table_grid(tbl))
        if grid_cols == 0:
            continue
        rows = tbl.findall(f"{{{W_NS}}}tr")
        for ri, row in enumerate(rows):
            cells = _row_cell_widths(row)
            total_span = sum(c["span"] for c in cells)
            if total_span != grid_cols:
                cell_texts = [
                    _cell_text(c)[:25]
                    for c in row.findall(f"{{{W_NS}}}tc")
                ]
                issues.append(
                    f"T[{i}] R{ri}: span={total_span} "
                    f"vs grid={grid_cols} — "
                    f"cells({len(cells)}): "
                    f"{cell_texts[:4]}..."
                )
                row_issues_count += 1
    if row_issues_count == 0:
        print("  No anomalies found.")
    else:
        print(
            f"  {row_issues_count} rows have "
            f"cell span != grid columns"
        )

    # ── 7. Print all issues ──────────────────────────────────
    print(f"\n{'=' * 70}")
    if issues:
        print(f"⚠  {len(issues)} ISSUES FOUND:")
        for issue in issues:
            print(f"  • {issue}")
    else:
        print(
            "✅ No issues found — "
            "output matches template structure."
        )
    print("=" * 70)


# ── Main ─────────────────────────────────────────────────────

DISPATCH = {
    "overview": lambda a: cmd_overview(Path(a[1])),
    "tables": lambda a: cmd_tables(Path(a[1])),
    "table": lambda a: cmd_table(Path(a[1]), int(a[2])),
    "commands": lambda a: cmd_commands(Path(a[1])),
    "loops": lambda a: cmd_loops(Path(a[1])),
    "paras": lambda a: cmd_paras(
        Path(a[1]),
        int(a[2]) if len(a) > 2 else 0,
        int(a[3]) if len(a) > 3 else None,
    ),
    "splits": lambda a: cmd_splits(Path(a[1])),
    "search": lambda a: cmd_search(Path(a[1]), a[2]),
    "parts": lambda a: cmd_parts(Path(a[1])),
    "xml": lambda a: cmd_xml(
        Path(a[1]),
        a[2] if len(a) > 2 else "word/document.xml",
    ),
    "compare": lambda a: cmd_compare(
        Path(a[1]), Path(a[2]),
    ),
}

if __name__ == "__main__":
    argv = sys.argv[1:]
    if len(argv) < 2:
        print(__doc__)
        sys.exit(1)

    action = argv[0]
    if action in DISPATCH:
        DISPATCH[action](argv)
    else:
        print(f"Unknown action: {action}\n{__doc__}")
        sys.exit(1)
