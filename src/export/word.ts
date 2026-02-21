/**
 * Word document export using docx-templates.
 * Generates QQI-compatible programme descriptor documents from a tagged template.
 *
 * The template (`public/assets/programme_descriptor_template.docx`) contains
 * `{field}` and `{FOR}...{END-FOR}` commands processed by docx-templates.
 * The data is built by {@link buildDescriptorData} in `descriptor-data.ts`.
 *
 * @module export/word
 */

import { createReport } from "docx-templates";
import { saveAs } from "file-saver";

import type { Programme } from "../types";
import { buildDescriptorData } from "./descriptor-data";

/**
 * Exports programme descriptor as a Word document.
 * Loads the tagged template, builds data from programme state,
 * and generates the output document.
 *
 * @throws {Error} If template loading fails
 */
export async function exportProgrammeDescriptorWord(p: Programme): Promise<void> {
  const tplRes = await fetch("./assets/programme_descriptor_template.docx");
  if (!tplRes.ok) {
    throw new Error("Failed to load Word template");
  }
  const tplBuf = await tplRes.arrayBuffer();

  const data = buildDescriptorData(p);

  const output = await createReport({
    template: new Uint8Array(tplBuf),
    data,
    cmdDelimiter: ["{", "}"],
    processLineBreaks: true,
    failFast: false,
  });

  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });

  const safeTitle = (p.title || "programme")
    .replace(/[^a-z0-9\-\s]/gi, "")
    .trim()
    .replace(/\s+/g, "_");
  saveAs(blob, `${safeTitle || "programme"}_programme_descriptor.docx`);
}

/** Export programme to Word (alias with fallback). */
export async function exportProgrammeToWord(p: Programme): Promise<void> {
  try {
    await exportProgrammeDescriptorWord(p);
  } catch (err) {
    console.error("Word export failed:", err);
    alert(
      "Word export failed. The template file may be missing. Please ensure programme_descriptor_template.docx exists in assets folder.",
    );
  }
}
