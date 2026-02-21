/**
 * MIPLO Assessment Strategy HTML table rendering (Section 6.8).
 * Generates an HTML table mapping MIPLOs to modules, assessment techniques, and weightings.
 * @module template/miplo-assessment-html
 */

import type { PLO, Programme } from "../types";
import { escapeHtml } from "../utils/dom";

/** A single assessment linked to this MIPLO through a module's MIMLO. */
interface AssessmentInfo {
  title: string;
  weighting: number;
}

/** One row in the MIPLO table — one module that addresses the MIPLO. */
interface MiploModuleRow {
  moduleCode: string;
  moduleTitle: string;
  mimloNumbers: number[];
  assessments: AssessmentInfo[];
}

/**
 * Builds the list of module rows for a given PLO/MIPLO.
 *
 * Walks:  PLO → ploToMimlos → module.mimlos → module.assessments
 * and groups by module — each module appears once, with all relevant
 * assessments collected together.
 */
function buildModuleRowsForPlo(plo: PLO, programme: Programme): MiploModuleRow[] {
  const ploToMimlos = programme.ploToMimlos ?? {};
  const linkedMimloIds = ploToMimlos[plo.id] ?? [];
  if (linkedMimloIds.length === 0) {
    return [];
  }

  const modules = programme.modules ?? [];
  const rows: MiploModuleRow[] = [];

  modules.forEach((mod) => {
    const modMimlos = mod.mimlos ?? [];
    // Find which of this module's MIMLOs are linked to this PLO
    const matchingMimloIndices: number[] = [];
    modMimlos.forEach((mimlo, idx) => {
      if (linkedMimloIds.includes(mimlo.id)) {
        matchingMimloIndices.push(idx + 1); // 1-based
      }
    });

    if (matchingMimloIndices.length === 0) {
      return;
    }

    const assessments = mod.assessments ?? [];
    const relevantAssessments: AssessmentInfo[] = [];

    // Find assessments that assess at least one of the matching MIMLOs
    assessments.forEach((asmt) => {
      const asmtMimloIds = asmt.mimloIds ?? [];
      const hasRelevant = matchingMimloIndices.some((num) => {
        const mimlo = modMimlos[num - 1];
        return mimlo && asmtMimloIds.includes(mimlo.id);
      });

      if (hasRelevant) {
        relevantAssessments.push({
          title: asmt.title ?? asmt.type ?? "",
          weighting: asmt.weighting ?? 0,
        });
      }
    });

    if (relevantAssessments.length > 0) {
      rows.push({
        moduleCode: mod.code ?? "",
        moduleTitle: mod.title ?? "",
        mimloNumbers: matchingMimloIndices,
        assessments: relevantAssessments,
      });
    }
  });

  return rows;
}

/**
 * Renders row group for a single MIPLO (one row per module).
 * The MIPLO # cell spans multiple rows when there are multiple modules.
 */
function renderMiploRows(ploIndex: number, plo: PLO, moduleRows: MiploModuleRow[]): string {
  if (moduleRows.length === 0) {
    return `<tr>
      <td>${ploIndex}. ${escapeHtml(plo.text)}</td>
      <td></td>
      <td></td>
      <td></td>
    </tr>`;
  }

  let html = "";
  moduleRows.forEach((row, idx) => {
    const moduleLabel = row.moduleCode || row.moduleTitle;
    const mimloText = row.mimloNumbers.map((n) => `MIMLO${n}`).join(", ");
    const moduleMimloCell = `${escapeHtml(moduleLabel)}-${escapeHtml(mimloText)}`;

    const techniquesCell = row.assessments.map((a) => escapeHtml(a.title)).join("<br><br>");
    const weightingsCell = row.assessments.map((a) => `${a.weighting}%`).join("<br><br>");

    if (idx === 0) {
      const rowspan = moduleRows.length > 1 ? ` rowspan="${moduleRows.length}"` : "";
      html += `<tr>
      <td${rowspan}>${ploIndex}. ${escapeHtml(plo.text)}</td>
      <td>${moduleMimloCell}</td>
      <td>${techniquesCell}</td>
      <td class="tight">${weightingsCell}</td>
    </tr>`;
    } else {
      html += `<tr>
      <td>${moduleMimloCell}</td>
      <td>${techniquesCell}</td>
      <td class="tight">${weightingsCell}</td>
    </tr>`;
    }
  });

  return html;
}

/**
 * Renders the full MIPLO Assessment Strategy table (Section 6.8).
 *
 * Each MIPLO (PLO) can have multiple data rows — one per module/assessment
 * that maps to it through the PLO → MIMLO → Assessment chain.
 */
export function renderMiploAssessmentTable(programme: Programme): string {
  const plos = programme.plos ?? [];

  if (plos.length === 0) {
    return "<p>No MIPLOs (Programme Learning Outcomes) defined.</p>";
  }

  let bodyRows = "";
  plos.forEach((plo, idx) => {
    const moduleRows = buildModuleRowsForPlo(plo, programme);
    bodyRows += renderMiploRows(idx + 1, plo, moduleRows);
  });

  return `
<table class="miplo-assessment-table" aria-label="MIPLO Assessment Strategy">
  <colgroup>
    <col style="width: 30%">
    <col style="width: 30%">
    <col style="width: 22%">
    <col style="width: 18%">
  </colgroup>
  <tr>
    <th colspan="4" class="grey">6.8&emsp;Assessment Strategy aligned to MIPLOs</th>
  </tr>
  <tr class="blue">
    <th>MIPLO #</th>
    <th>Identify which Modules (M) and MIMLO(s) address this MIPLO, e.g., M3-MIMLO2</th>
    <th>Assessment Technique(s)</th>
    <th>Weighting per Assessment Instrument</th>
  </tr>
  ${bodyRows}
</table>`;
}

/**
 * Renders all MIPLO assessment tables for a programme.
 */
export function renderAllMiploAssessments(programme: Programme): string {
  return renderMiploAssessmentTable(programme);
}
