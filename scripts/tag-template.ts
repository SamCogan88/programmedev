/**
 * Template Tagging Script
 *
 * Reads the QQI Programme Descriptor template (.docx) and inserts
 * docx-templates command tags ({field}, {FOR ...}, {END-FOR ...})
 * into the appropriate table cells and paragraph positions.
 *
 * Usage: npx tsx scripts/tag-template.ts [--dry-run]
 *
 * The tagged template is written to public/assets/programme_descriptor_template.docx
 * (overwriting the original). Use --dry-run to preview changes without writing.
 *
 * @module scripts/tag-template
 */

import { readFileSync, writeFileSync } from "fs";

import JSZip from "jszip";

import { listCommands } from "docx-templates";

const TEMPLATE_PATH = "public/assets/programme_descriptor_template.docx";
const DRY_RUN = process.argv.includes("--dry-run");

// ============================================================================
// Types
// ============================================================================

interface TableInfo {
  start: number;
  end: number;
  xml: string;
}

interface CellInfo {
  xml: string;
  text: string;
}

interface RowInfo {
  xml: string;
  cells: CellInfo[];
}

// ============================================================================
// XML Helpers
// ============================================================================

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Create a simple <w:r><w:t> run with text. */
function makeRun(text: string, rPrXml = ""): string {
  return `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

/** Create a paragraph containing a single text run. */
function makeParagraph(text: string, pPrXml = "", rPrXml = ""): string {
  return `<w:p>${pPrXml}${makeRun(text, rPrXml)}</w:p>`;
}

// ============================================================================
// Table Parsing
// ============================================================================

/** Find all <w:tbl>...</w:tbl> blocks and their positions in the XML. */
function indexTables(xml: string): TableInfo[] {
  const tables: TableInfo[] = [];
  const tblRegex = /<w:tbl[\s>][\s\S]*?<\/w:tbl>/g;
  let m: RegExpExecArray | null;
  while ((m = tblRegex.exec(xml)) !== null) {
    tables.push({ start: m.index, end: m.index + m[0].length, xml: m[0] });
  }
  return tables;
}

/** Extract rows and their cells from a table XML string. */
function getRows(tableXml: string): RowInfo[] {
  const rows: RowInfo[] = [];
  const rowRegex = /<w:tr[\s>][\s\S]*?<\/w:tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(tableXml)) !== null) {
    const cells: CellInfo[] = [];
    const cellRegex = /<w:tc[\s>][\s\S]*?<\/w:tc>/g;
    let cm: RegExpExecArray | null;
    while ((cm = cellRegex.exec(m[0])) !== null) {
      const texts: string[] = [];
      const textRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
      let tm: RegExpExecArray | null;
      while ((tm = textRegex.exec(cm[0])) !== null) {
        if (tm[1]) {
          texts.push(tm[1]);
        }
      }
      cells.push({ xml: cm[0], text: texts.join("") });
    }
    rows.push({ xml: m[0], cells });
  }
  return rows;
}

/**
 * Replace all content in a table cell with a single text value,
 * preserving cell properties (tcPr) and formatting (rPr/pPr).
 */
function setCellText(cellXml: string, newText: string): string {
  const tcPrMatch = cellXml.match(/<w:tcPr[\s>][\s\S]*?<\/w:tcPr>/);
  const tcPr = tcPrMatch ? tcPrMatch[0] : "";
  const rPrMatch = cellXml.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  const rPr = rPrMatch ? rPrMatch[0] : "";
  const pPrMatch = cellXml.match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
  const pPr = pPrMatch ? pPrMatch[0] : "";

  return `<w:tc>${tcPr}${makeParagraph(newText, pPr, rPr)}</w:tc>`;
}

// ============================================================================
// Tagging Operations
// ============================================================================

interface TagResult {
  xml: string;
  changes: string[];
}

/** Phase 2: Tag simple (non-repeating) fields. */
function tagSimpleFields(xml: string, tables: TableInfo[]): TagResult {
  let modified = xml;
  const changes: string[] = [];

  // --- T09 (1C.1 Principal Programme) ---
  {
    const t = tables[9];
    const rows = getRows(t.xml);
    let tblXml = t.xml;

    // Row 2, C1: NFQ Level value
    if (rows[2]?.cells[1] && !rows[2].cells[1].text.includes("nfq_level")) {
      const oldCell = rows[2].cells[1].xml;
      tblXml = tblXml.replace(oldCell, setCellText(oldCell, "{nfq_level}"));
      changes.push("T09 R2C1: added {nfq_level}");
    }

    // Row 3, C1: Award Type
    if (rows[3]?.cells[1] && !rows[3].cells[1].text.includes("award_type")) {
      const oldCell = rows[3].cells[1].xml;
      tblXml = tblXml.replace(oldCell, setCellText(oldCell, "{award_type}"));
      changes.push("T09 R3C1: added {award_type}");
    }

    if (tblXml !== t.xml) {
      modified = modified.replace(t.xml, tblXml);
    }
  }

  // --- T19 (2.2 Award Standards) ---
  {
    const t = tables[19];
    const rows = getRows(t.xml);
    let tblXml = t.xml;

    if (rows[1]?.cells[1] && !rows[1].cells[1].text.includes("award_standard")) {
      const oldCell = rows[1].cells[1].xml;
      tblXml = tblXml.replace(oldCell, setCellText(oldCell, "{award_standard_name}"));
      changes.push("T19 R1C1: added {award_standard_name}");
    }

    if (tblXml !== t.xml) {
      modified = modified.replace(t.xml, tblXml);
    }
  }

  return { xml: modified, changes };
}

/** Phase 3a: Tag the Section 7 module descriptor block with FOR loop and field tags. */
function tagModuleDescriptorBlock(xml: string, tables: TableInfo[]): TagResult {
  let modified = xml;
  const changes: string[] = [];

  const t60 = tables[60];
  const t70 = tables[70];
  if (!t60 || !t70) {
    console.error("Could not find tables T60 and T70");
    return { xml: modified, changes };
  }

  // --- T60: Module Overview fields ---
  {
    const rows = getRows(t60.xml);
    let tblXml = t60.xml;

    // Row 1: C1=Module Number, C3=Module Title
    // Note: Loop variables use $ prefix in docx-templates (e.g. $module.code)
    if (rows[1]?.cells[1] && !rows[1].cells[1].text.includes("$module.")) {
      tblXml = tblXml.replace(rows[1].cells[1].xml, setCellText(rows[1].cells[1].xml, "{$module.code}"));
      changes.push("T60 R1C1: added {$module.code}");
    }
    if (rows[1]?.cells[3] && !rows[1].cells[3].text.includes("$module.")) {
      tblXml = tblXml.replace(rows[1].cells[3].xml, setCellText(rows[1].cells[3].xml, "{$module.title}"));
      changes.push("T60 R1C3: added {$module.title}");
    }

    // Row 2: C1=Stage, C3=Semester, C7=ECTS
    if (rows[2]?.cells[1] && !rows[2].cells[1].text.includes("$module.")) {
      tblXml = tblXml.replace(rows[2].cells[1].xml, setCellText(rows[2].cells[1].xml, "{$module.stage}"));
      changes.push("T60 R2C1: added {$module.stage}");
    }
    if (rows[2]?.cells[3] && !rows[2].cells[3].text.includes("$module.")) {
      tblXml = tblXml.replace(rows[2].cells[3].xml, setCellText(rows[2].cells[3].xml, "{$module.semester}"));
      changes.push("T60 R2C3: added {$module.semester}");
    }
    if (rows[2]?.cells[7] && !rows[2].cells[7].text.includes("$module.")) {
      tblXml = tblXml.replace(rows[2].cells[7].xml, setCellText(rows[2].cells[7].xml, "{$module.credits}"));
      changes.push("T60 R2C7: added {$module.credits}");
    }

    // Row 3: C1=Mandatory/Elective
    if (rows[3]?.cells[1] && !rows[3].cells[1].text.includes("$module.")) {
      tblXml = tblXml.replace(rows[3].cells[1].xml, setCellText(rows[3].cells[1].xml, "{$module.mandatoryElective}"));
      changes.push("T60 R3C1: added {$module.mandatoryElective}");
    }

    // Effort hours rows
    const effortRows: Array<{ row: number; field: string }> = [
      { row: 7, field: "effortOnsite" },
      { row: 8, field: "effortSyncOnline" },
      { row: 9, field: "effortSyncHybrid" },
      { row: 11, field: "effortAsync" },
      { row: 12, field: "effortIndependent" },
      { row: 13, field: "effortWorkBased" },
    ];
    for (const { row, field } of effortRows) {
      if (rows[row]?.cells[2] && !rows[row].cells[2].text.includes("$module.")) {
        tblXml = tblXml.replace(
          rows[row].cells[2].xml,
          setCellText(rows[row].cells[2].xml, `{$module.${field}}`),
        );
        changes.push(`T60 R${row}C2: added {$module.${field}}`);
      }
    }

    // Row 15: Total hours
    if (rows[15]?.cells[1] && !rows[15].cells[1].text.includes("$module.")) {
      tblXml = tblXml.replace(rows[15].cells[1].xml, setCellText(rows[15].cells[1].xml, "{$module.effortTotal}"));
      changes.push("T60 R15C1: added {$module.effortTotal}");
    }

    if (tblXml !== t60.xml) {
      modified = modified.replace(t60.xml, tblXml);
    }
  }

  // --- T62: Assessment technique percentages ---
  {
    const t62 = tables[62];
    const rows = getRows(t62.xml);
    let tblXml = t62.xml;

    const assessCells: Array<{ row: number; col: number; field: string }> = [
      { row: 1, col: 1, field: "assessContinuous" },
      { row: 1, col: 3, field: "assessExamInPerson" },
      { row: 1, col: 5, field: "assessPractical" },
      { row: 2, col: 1, field: "assessProject" },
      { row: 2, col: 3, field: "assessExamOnline" },
      { row: 2, col: 5, field: "assessWorkBased" },
    ];
    for (const { row, col, field } of assessCells) {
      if (rows[row]?.cells[col] && !rows[row].cells[col].text.includes("$module.")) {
        tblXml = tblXml.replace(
          rows[row].cells[col].xml,
          setCellText(rows[row].cells[col].xml, `{$module.${field}}`),
        );
        changes.push(`T62 R${row}C${col}: added {$module.${field}}`);
      }
    }

    if (tblXml !== t62.xml) {
      modified = modified.replace(t62.xml, tblXml);
    }
  }

  // --- T63: MIMLOs (row-level FOR loop) ---
  {
    const t63 = tables[63];
    const rows = getRows(t63.xml);
    let tblXml = t63.xml;

    if (rows.length > 2) {
      const templateRow = rows[2].xml;
      const forRow = templateRow
        .replace(
          rows[2].cells[0].xml,
          setCellText(rows[2].cells[0].xml, "{FOR mimlo IN $module.mimlos}{$mimlo.index}. {$mimlo.text}"),
        )
        .replace(
          rows[2].cells[1].xml,
          setCellText(rows[2].cells[1].xml, "{$mimlo.relatedPlos}{END-FOR mimlo}"),
        );

      tblXml = tblXml.replace(templateRow, forRow);
      for (let i = 3; i < rows.length; i++) {
        tblXml = tblXml.replace(rows[i].xml, "");
      }
      changes.push("T63: added MIMLO FOR loop, removed empty rows");
    }

    if (tblXml !== t63.xml) {
      modified = modified.replace(t63.xml, tblXml);
    }
  }

  // --- T68: Assessment strategy (row-level FOR loop) ---
  {
    const t68 = tables[68];
    const rows = getRows(t68.xml);
    let tblXml = t68.xml;

    if (rows.length > 2) {
      const templateRow = rows[2].xml;
      const forRow = templateRow
        .replace(
          rows[2].cells[0].xml,
          setCellText(rows[2].cells[0].xml, "{FOR asmt IN $module.assessments}{$asmt.mimloText}"),
        )
        .replace(rows[2].cells[1].xml, setCellText(rows[2].cells[1].xml, "{$asmt.type}"))
        .replace(
          rows[2].cells[2].xml,
          setCellText(rows[2].cells[2].xml, "{$asmt.weighting}%{END-FOR asmt}"),
        );

      tblXml = tblXml.replace(templateRow, forRow);
      for (let i = 3; i < rows.length; i++) {
        tblXml = tblXml.replace(rows[i].xml, "");
      }
      changes.push("T68: added assessment FOR loop, removed empty rows");
    }

    if (tblXml !== t68.xml) {
      modified = modified.replace(t68.xml, tblXml);
    }
  }

  // --- T70: Reading lists ---
  {
    const rows = getRows(t70.xml);
    let tblXml = t70.xml;

    if (rows[1]?.cells[0]) {
      tblXml = tblXml.replace(
        rows[1].cells[0].xml,
        setCellText(rows[1].cells[0].xml, "{$module.readingListText}"),
      );
      changes.push("T70 R1C0: added {$module.readingListText}");
    }

    if (tblXml !== t70.xml) {
      modified = modified.replace(t70.xml, tblXml);
    }
  }

  // --- Wrap T60-T70 in block-level FOR loop ---
  const newTables = indexTables(modified);
  const newT60 = newTables[60];
  const newT70 = newTables[70];

  if (newT60 && newT70) {
    const forParagraph = makeParagraph("{FOR module IN modules}");
    modified = modified.substring(0, newT60.start) + forParagraph + modified.substring(newT60.start);

    const shift = forParagraph.length;
    const endForParagraph = makeParagraph("{END-FOR module}");
    modified =
      modified.substring(0, newT70.end + shift) +
      endForParagraph +
      modified.substring(newT70.end + shift);

    changes.push("Section 7: wrapped T60-T70 in {FOR module IN modules}...{END-FOR module}");
  }

  return { xml: modified, changes };
}

/** Phase 3b: Tag the schedule table (T08). */
function tagScheduleTable(xml: string, tables: TableInfo[]): TagResult {
  let modified = xml;
  const changes: string[] = [];

  const t = tables[8];
  if (!t) {
    return { xml: modified, changes };
  }

  const rows = getRows(t.xml);
  let tblXml = t.xml;

  // Row 2, C1: Programme title
  if (rows[2]?.cells[1] && !rows[2].cells[1].text.includes("{")) {
    tblXml = tblXml.replace(rows[2].cells[1].xml, setCellText(rows[2].cells[1].xml, "{programme_title}"));
    changes.push("T08 R2C1: added {programme_title}");
  }

  if (tblXml !== t.xml) {
    modified = modified.replace(t.xml, tblXml);
  }

  return { xml: modified, changes };
}

/** Phase 3c: Tag the assessment strategy table (T55). */
function tagAssessmentStrategy(xml: string, tables: TableInfo[]): TagResult {
  let modified = xml;
  const changes: string[] = [];

  const t = tables[55];
  if (!t) {
    return { xml: modified, changes };
  }

  const rows = getRows(t.xml);
  let tblXml = t.xml;

  if (rows.length > 3) {
    const templateRow = rows[3].xml;
    const forRow = templateRow
      .replace(
        rows[3].cells[0].xml,
        setCellText(rows[3].cells[0].xml, "{FOR plo IN ploAssessmentMap}PLO {$plo.index}"),
      )
      .replace(rows[3].cells[1].xml, setCellText(rows[3].cells[1].xml, "{$plo.moduleMimloText}"))
      .replace(rows[3].cells[2].xml, setCellText(rows[3].cells[2].xml, "{$plo.assessmentTechniques}"))
      .replace(
        rows[3].cells[3].xml,
        setCellText(rows[3].cells[3].xml, "{$plo.weightings}{END-FOR plo}"),
      );

    tblXml = tblXml.replace(templateRow, forRow);
    for (let i = 4; i < rows.length; i++) {
      tblXml = tblXml.replace(rows[i].xml, "");
    }
    changes.push("T55: added PLO assessment strategy FOR loop, removed empty rows");
  }

  if (tblXml !== t.xml) {
    modified = modified.replace(t.xml, tblXml);
  }

  return { xml: modified, changes };
}

/** Phase 3d: Tag the Appendix 1 mapping table (T79). */
function tagAppendixMapping(xml: string, tables: TableInfo[]): TagResult {
  let modified = xml;
  const changes: string[] = [];

  const t = tables[79];
  if (!t) {
    return { xml: modified, changes };
  }

  const rows = getRows(t.xml);
  let tblXml = t.xml;

  // Row 0: Header with programme title
  if (rows[0]?.cells[0]) {
    const oldText = rows[0].cells[0].text;
    if (oldText.includes("<Enter Programme Title>") || oldText.includes("&lt;Enter Programme Title")) {
      tblXml = tblXml.replace(
        rows[0].cells[0].xml,
        setCellText(
          rows[0].cells[0].xml,
          "Comparison of Purpose of Programme {programme_title} to Purpose of {award_class} awards at level {nfq_level} in the National Framework of Qualifications",
        ),
      );
      changes.push("T79 R0C0: added programme title/award/level tags to header");
    }
  }

  // Row 3: Subheader with standard name
  if (rows[3]?.cells[0]) {
    const oldText = rows[3].cells[0].text;
    if (oldText.includes("<Enter St") || oldText.includes("&lt;Enter St")) {
      tblXml = tblXml.replace(
        rows[3].cells[0].xml,
        setCellText(
          rows[3].cells[0].xml,
          "Comparison of MIPLOs to QQI Awards standards in {award_standard_name}",
        ),
      );
      changes.push("T79 R3C0: added {award_standard_name} tag to subheader");
    }
  }

  // Rows 5-10: Standard strands — tag with PLO data
  const strands: Array<{ row: number; name: string }> = [
    { row: 5, name: "knowledge_breadth" },
    { row: 6, name: "knowhow_skill" },
    { row: 7, name: "competence_context" },
    { row: 8, name: "competence_role" },
    { row: 9, name: "competence_learning" },
    { row: 10, name: "competence_insight" },
  ];

  for (const { row, name } of strands) {
    if (rows[row] && rows[row].cells.length >= 5) {
      if (!rows[row].cells[3].text.includes("{")) {
        tblXml = tblXml.replace(
          rows[row].cells[3].xml,
          setCellText(rows[row].cells[3].xml, `{mapping_${name}_plos}`),
        );
        changes.push(`T79 R${row}C3: added {mapping_${name}_plos}`);
      }
      if (!rows[row].cells[4].text.includes("{")) {
        tblXml = tblXml.replace(
          rows[row].cells[4].xml,
          setCellText(rows[row].cells[4].xml, `{mapping_${name}_evidence}`),
        );
        changes.push(`T79 R${row}C4: added {mapping_${name}_evidence}`);
      }
    }
  }

  if (tblXml !== t.xml) {
    modified = modified.replace(t.xml, tblXml);
  }

  return { xml: modified, changes };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("Reading template:", TEMPLATE_PATH);
  const buf = readFileSync(TEMPLATE_PATH);
  const zip = await JSZip.loadAsync(buf);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("word/document.xml not found in template");
  }
  let xml = await docFile.async("string");
  const tables = indexTables(xml);

  console.log(`Found ${tables.length} tables\n`);

  const allChanges: string[] = [];

  // Phase 2: Simple fields
  let result = tagSimpleFields(xml, tables);
  xml = result.xml;
  allChanges.push(...result.changes);

  // Phase 3a: Module descriptor block
  result = tagModuleDescriptorBlock(xml, indexTables(xml));
  xml = result.xml;
  allChanges.push(...result.changes);

  // Phase 3b: Schedule table
  result = tagScheduleTable(xml, indexTables(xml));
  xml = result.xml;
  allChanges.push(...result.changes);

  // Phase 3c: Assessment strategy
  result = tagAssessmentStrategy(xml, indexTables(xml));
  xml = result.xml;
  allChanges.push(...result.changes);

  // Phase 3d: Appendix 1 mapping
  result = tagAppendixMapping(xml, indexTables(xml));
  xml = result.xml;
  allChanges.push(...result.changes);

  // Summary
  console.log(`\n=== Changes (${allChanges.length}) ===`);
  allChanges.forEach((c) => console.log("  ✓", c));

  if (DRY_RUN) {
    console.log("\n[DRY RUN] No file written.");
  } else {
    zip.file("word/document.xml", xml);
    const output = await zip.generateAsync({ type: "nodebuffer" });
    writeFileSync(TEMPLATE_PATH, output);
    console.log(`\nTagged template written to ${TEMPLATE_PATH} (${output.length} bytes)`);
  }

  // Verify commands in the resulting template
  const verifyBuf = DRY_RUN ? buf : readFileSync(TEMPLATE_PATH);
  const cmds = await listCommands(verifyBuf, ["{", "}"]);
  console.log(`\nVerification: ${cmds.length} commands found in template:`);
  const typeCounts: Record<string, number> = {};
  cmds.forEach((c) => {
    typeCounts[c.type] = (typeCounts[c.type] ?? 0) + 1;
  });
  console.log("  Types:", typeCounts);
  cmds.forEach((c) => console.log(`  ${c.type}: ${c.raw}`));
}

main().catch((e: unknown) => {
  console.error("Error:", e);
  process.exit(1);
});
