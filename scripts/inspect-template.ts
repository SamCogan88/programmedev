/**
 * Template Inspection Utility
 *
 * Reads the QQI Programme Descriptor template (.docx) and outputs a
 * markdown summary of its structure: sections, tables, and template
 * commands found.
 *
 * Usage: npx tsx scripts/inspect-template.ts
 *
 * This serves two purposes:
 * 1. AI tools can run it to understand the current template structure
 * 2. When the template changes, run it to see what tags need updating
 *
 * @module scripts/inspect-template
 */

import { readFileSync } from "fs";

import { listCommands, getMetadata } from "docx-templates";
import JSZip from "jszip";

const TEMPLATE_PATH = process.argv[2] ?? "public/assets/programme_descriptor_template.docx";

// ============================================================================
// Types
// ============================================================================

interface CellInfo {
  text: string;
}

interface RowInfo {
  cells: CellInfo[];
}

interface CommandInfo {
  raw: string;
  type: string;
  code: string;
}

// ============================================================================
// XML Parsing
// ============================================================================

function extractTableRows(tableXml: string): RowInfo[] {
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
      cells.push({ text: texts.join("") });
    }
    rows.push({ cells });
  }
  return rows;
}

function extractTables(xml: string): string[] {
  const tables: string[] = [];
  const tblRegex = /<w:tbl[\s>][\s\S]*?<\/w:tbl>/g;
  let m: RegExpExecArray | null;
  while ((m = tblRegex.exec(xml)) !== null) {
    tables.push(m[0]);
  }
  return tables;
}

function getFirstCellText(tableXml: string): string {
  const rows = extractTableRows(tableXml);
  if (rows.length > 0 && rows[0].cells.length > 0) {
    return rows[0].cells[0].text.substring(0, 80);
  }
  return "(empty)";
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log(`# Template Inspection: ${TEMPLATE_PATH}\n`);

  const buf = readFileSync(TEMPLATE_PATH);

  // Metadata
  const meta = await getMetadata(buf);
  console.log("## Document Metadata\n");
  console.log(`| Property | Value |`);
  console.log(`| --- | --- |`);
  if (meta.pages) {
    console.log(`| Pages | ${meta.pages} |`);
  }
  if (meta.words) {
    console.log(`| Words | ${meta.words} |`);
  }
  if (meta.title) {
    console.log(`| Title | ${meta.title} |`);
  }
  if (meta.creator) {
    console.log(`| Creator | ${meta.creator} |`);
  }
  if (meta.modified) {
    console.log(`| Modified | ${meta.modified} |`);
  }
  console.log();

  // Tables
  const zip = await JSZip.loadAsync(buf);
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("word/document.xml not found");
  }
  const xml = await docFile.async("string");
  const tables = extractTables(xml);

  console.log(`## Tables (${tables.length})\n`);
  console.log("| Index | First Cell Content |");
  console.log("| --- | --- |");
  tables.forEach((tbl, i) => {
    const text = getFirstCellText(tbl).replace(/\|/g, "\\|");
    console.log(`| T${String(i).padStart(2, "0")} | ${text} |`);
  });
  console.log();

  // Template commands
  const cmds: CommandInfo[] = await listCommands(buf, ["{", "}"]);
  console.log(`## Template Commands (${cmds.length})\n`);

  // Group by type
  const byType: Record<string, CommandInfo[]> = {};
  cmds.forEach((c) => {
    (byType[c.type] ??= []).push(c);
  });

  for (const [type, items] of Object.entries(byType)) {
    console.log(`### ${type} (${items.length})\n`);
    items.forEach((c) => console.log(`- \`${c.raw}\``));
    console.log();
  }

  // Summary
  const insCount = byType.INS?.length ?? 0;
  const forCount = byType.FOR?.length ?? 0;
  const endForCount = byType["END-FOR"]?.length ?? 0;

  console.log("## Summary\n");
  console.log(`- **${tables.length}** tables`);
  console.log(`- **${cmds.length}** template commands`);
  console.log(`  - ${insCount} INS (value insertions)`);
  console.log(`  - ${forCount} FOR loops`);
  console.log(`  - ${endForCount} END-FOR`);

  if (forCount !== endForCount) {
    console.log(`\n⚠️  **Warning:** FOR/END-FOR count mismatch (${forCount} vs ${endForCount})`);
  }

  // Unique field names
  const fields = new Set(
    (byType.INS ?? []).map((c) => c.code),
  );
  console.log(`- **${fields.size}** unique fields:`);
  [...fields].sort().forEach((f) => console.log(`  - \`${f}\``));
}

main().catch((e: unknown) => {
  console.error("Error:", e);
  process.exit(1);
});
