// @ts-check
/**
 * Module Descriptors HTML table rendering (Section 7).
 * Generates HTML tables for module descriptors per the QQI template.
 * @module template/module-descriptors-html
 */

import { escapeHtml } from "../utils/dom.js";

/**
 * Formats effort hours for the teaching modalities table.
 * @param {Module} mod - Module data
 * @param {string} versionKey - Version/delivery key to look up effort hours
 * @returns {{ classroomHours: number, mentoringHours: number, syncHybridHours: number, asyncHours: number, independentHours: number, workBasedHours: number, otherHours: number, total: number, classroomRatio: string, mentoringRatio: string }}
 */
function getEffortHours(mod, versionKey) {
  const effort =
    mod.effortHours?.[versionKey] ??
    mod.effortHours?.[Object.keys(mod.effortHours ?? {})[0]] ??
    {};

  const classroomHours = effort.classroomHours ?? 0;
  const mentoringHours = effort.mentoringHours ?? 0;
  const syncHybridHours = effort.otherContactHours ?? 0;
  const asyncHours = effort.directedElearningHours ?? 0;
  const independentHours = effort.independentLearningHours ?? 0;
  const workBasedHours = effort.workBasedHours ?? 0;
  const otherHours = effort.otherHours ?? 0;

  const total =
    classroomHours +
    mentoringHours +
    syncHybridHours +
    asyncHours +
    independentHours +
    workBasedHours +
    otherHours;

  return {
    classroomHours,
    mentoringHours,
    syncHybridHours,
    asyncHours,
    independentHours,
    workBasedHours,
    otherHours,
    total,
    classroomRatio: effort.classroomRatio ?? "",
    mentoringRatio: effort.mentoringRatio ?? "",
  };
}

/**
 * Gets assessment percentages by type.
 * @param {Module} mod - Module data
 * @returns {{ continuous: number, invigilated: number, proctored: number, project: number, practical: number, workBased: number }}
 */
function getAssessmentPercentages(mod) {
  const pcts = {
    continuous: 0,
    invigilated: 0,
    proctored: 0,
    project: 0,
    practical: 0,
    workBased: 0,
  };

  (mod.assessments ?? []).forEach((a) => {
    const t = (a.type ?? "").toLowerCase();
    const w = a.weighting ?? 0;
    if (t.includes("exam") && t.includes("campus")) {
      pcts.invigilated += w;
    } else if (t.includes("exam") && t.includes("online")) {
      pcts.proctored += w;
    } else if (t.includes("project")) {
      pcts.project += w;
    } else if (t.includes("practical") || t.includes("lab")) {
      pcts.practical += w;
    } else if (t.includes("work")) {
      pcts.workBased += w;
    } else {
      pcts.continuous += w;
    }
  });

  return pcts;
}

/**
 * Gets the PLO numbers that a module contributes to.
 * @param {Programme} programme - Programme data
 * @param {string} moduleId - Module ID
 * @returns {string[]} Array of PLO codes/numbers
 */
function getRelatedPLOs(programme, moduleId) {
  const ploIds = [];
  const mapping = programme.ploToModules ?? {};

  Object.entries(mapping).forEach(([ploId, moduleIds]) => {
    if ((moduleIds ?? []).includes(moduleId)) {
      ploIds.push(ploId);
    }
  });

  // Return PLO numbers (extract from plo_1 -> 1)
  return ploIds
    .map((id) => {
      const plo = (programme.plos ?? []).find((p) => p.id === id);
      return plo?.code ?? id.replace("plo_", "");
    })
    .sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
}

/**
 * Renders a single module descriptor table (Section 7).
 *
 * @param {Programme} programme - Programme data
 * @param {Module} mod - Module data
 * @param {ProgrammeVersion} version - Programme version
 * @param {Stage} stage - Stage containing this module
 * @param {{ semester?: string }} stageModule - Stage module reference
 * @returns {string} HTML table markup
 */
export function renderModuleDescriptor(programme, mod, version, stage, stageModule) {
  const versionKey = `${version.id}_${version.deliveryModality}`;
  const effort = getEffortHours(mod, versionKey);
  const asmPcts = getAssessmentPercentages(mod);
  const relatedPLOs = getRelatedPLOs(programme, mod.id);
  const mimlos = mod.mimlos ?? [];
  const assessments = mod.assessments ?? [];
  const readingList = mod.readingList ?? [];

  let html = '<table class="module-descriptor">';

  // 7.1 Module Overview
  html += `<tr>
    <td colspan="6" class="form-section-title">
      <strong>7.1&nbsp;&nbsp;&nbsp;Module Overview</strong>
      <span class="instruction-text"> (copy and paste for other modules)</span>
    </td>
  </tr>`;

  // Module Number / Module Title
  html += `<tr>
    <td class="label-cell">Module Number</td>
    <td class="empty-data">${escapeHtml(mod.code ?? "")}</td>
    <td colspan="4" class="label-cell">Module Title</td>
  </tr>`;
  html += `<tr>
    <td colspan="6" class="empty-data">${escapeHtml(mod.title ?? "")}</td>
  </tr>`;

  // Stage / Semester / Duration / ECTS
  html += `<tr>
    <td colspan="2" class="label-cell">Stage of Principal Programme</td>
    <td class="label-cell">Semester<br><span class="instruction-text">(if applicable)</span></td>
    <td class="label-cell">Duration.<br><span class="instruction-text">(Weeks F/T)</span></td>
    <td class="label-cell">ECTS</td>
    <td class="empty-data"></td>
  </tr>`;
  html += `<tr>
    <td colspan="2" class="empty-data">${escapeHtml(stage.name ?? "")}</td>
    <td class="empty-data">${escapeHtml(stageModule.semester ?? "")}</td>
    <td class="empty-data">${version.durationWeeks ?? ""}</td>
    <td class="empty-data">${mod.credits ?? ""}</td>
    <td class="empty-data"></td>
  </tr>`;

  // Mandatory/Elective and Hours of Learner Effort
  html += `<tr>
    <td class="label-cell">Mandatory / Elective<br>(M/E)</td>
    <td class="label-cell">Hours of Learner<br>Effort / Week<sup>2</sup></td>
    <td colspan="4" class="form-section-title">Analysis of required hours of learning effort</td>
  </tr>`;

  // Teaching and Learning Modalities table
  html += `<tr>
    <td rowspan="12" class="empty-data" style="vertical-align: top;">${mod.isElective ? "E" : "M"}</td>
    <td rowspan="12" class="empty-data" style="vertical-align: top;">${effort.total > 0 ? Math.round(effort.total / 15) : ""}</td>
    <td colspan="2" class="label-cell">Teaching and Learning Modalities</td>
    <td class="label-cell">✓ if relevant to this module</td>
    <td class="label-cell">Approx. proportion of total (hours)</td>
  </tr>`;

  // Direct Contact Hours header
  html += `<tr>
    <td colspan="2" class="label-cell">Direct Contact Hours</td>
    <td class="empty-data"></td>
    <td class="empty-data"></td>
  </tr>`;

  // On-site face-to-face
  html += `<tr>
    <td colspan="2" class="checkbox-label">On-site face-to-face</td>
    <td class="empty-data">${effort.classroomHours > 0 ? "✔" : ""}</td>
    <td class="empty-data">${effort.classroomHours || ""}</td>
  </tr>`;

  // Synchronous online
  html += `<tr>
    <td colspan="2" class="checkbox-label">Synchronous online</td>
    <td class="empty-data">${effort.mentoringHours > 0 ? "✔" : ""}</td>
    <td class="empty-data">${effort.mentoringHours || ""}</td>
  </tr>`;

  // Synchronous Hybrid
  html += `<tr>
    <td colspan="2" class="checkbox-label">Synchronous Hybrid</td>
    <td class="empty-data">${effort.syncHybridHours > 0 ? "✔" : ""}</td>
    <td class="empty-data">${effort.syncHybridHours || ""}</td>
  </tr>`;

  // Indirect/Non-contact Hours header
  html += `<tr>
    <td colspan="2" class="label-cell">Indirect/Non-contact Hours</td>
    <td class="empty-data"></td>
    <td class="empty-data"></td>
  </tr>`;

  // Asynchronous
  html += `<tr>
    <td colspan="2" class="checkbox-label">Asynchronous</td>
    <td class="empty-data">${effort.asyncHours > 0 ? "✔" : ""}</td>
    <td class="empty-data">${effort.asyncHours || ""}</td>
  </tr>`;

  // Independent Learning
  html += `<tr>
    <td colspan="2" class="checkbox-label">Independent Learning</td>
    <td class="empty-data">${effort.independentHours > 0 ? "✔" : ""}</td>
    <td class="empty-data">${effort.independentHours || ""}</td>
  </tr>`;

  // Work Based
  html += `<tr>
    <td colspan="2" class="checkbox-label">Work Based</td>
    <td class="empty-data">${effort.workBasedHours > 0 ? "✔" : ""}</td>
    <td class="empty-data">${effort.workBasedHours || ""}</td>
  </tr>`;

  // Other (identify)
  html += `<tr>
    <td colspan="2" class="checkbox-label">Other (identify)</td>
    <td class="empty-data">${effort.otherHours > 0 ? "✔" : ""}</td>
    <td class="empty-data">${effort.otherHours || ""}</td>
  </tr>`;

  // Total row
  html += `<tr>
    <td colspan="2" class="label-cell">Total</td>
    <td class="empty-data"></td>
    <td class="empty-data">${effort.total || ""}</td>
  </tr>`;

  // Pre/Co-requisites and Max learners
  html += `<tr>
    <td colspan="4" class="label-cell">Pre-Requisite Module, if any. Module Number and Title</td>
    <td colspan="2" class="empty-data"></td>
  </tr>`;
  html += `<tr>
    <td colspan="4" class="label-cell">Co-Requisite Module, if any. Module Number and Title</td>
    <td colspan="2" class="empty-data"></td>
  </tr>`;
  html += `<tr>
    <td colspan="4" class="label-cell">Maximum number of learners per instance of the module</td>
    <td colspan="2" class="empty-data"></td>
  </tr>`;

  // Staff qualifications table
  html += `<tr>
    <td colspan="6" class="form-section-title">
      Specification of the qualifications (academic, pedagogical and professional/occupational) and experience required of staff working in this module.
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="2" class="label-cell">Role e.g.,<br>Tutor, Mentor,<br>Lecturer, Research<br>Supervisor, etc.</td>
    <td colspan="2" class="label-cell">Qualifications & experience required</td>
    <td colspan="2" class="label-cell">Staff (X) : Learner (Y)<br>Ratio<br>Express as X:Y</td>
  </tr>`;
  // Empty staff row
  html += `<tr>
    <td colspan="2" class="empty-data" style="min-height: 30pt;">&nbsp;</td>
    <td colspan="2" class="empty-data">&nbsp;</td>
    <td colspan="2" class="empty-data">&nbsp;</td>
  </tr>`;

  // Assessment Techniques table
  html += `<tr>
    <td colspan="6" class="form-section-title">Assessment Techniques – percentage contribution</td>
  </tr>`;
  html += `<tr>
    <td class="label-cell">Continuous<br>Assessment</td>
    <td class="label-cell">Proctored Exam – in<br>person</td>
    <td class="label-cell">Practical Skills<br>Based</td>
    <td class="label-cell">Project</td>
    <td class="label-cell">Proctored Exam –<br>online</td>
    <td class="label-cell">Work Based</td>
  </tr>`;
  html += `<tr>
    <td class="empty-data">${asmPcts.continuous || ""}</td>
    <td class="empty-data">${asmPcts.invigilated || ""}</td>
    <td class="empty-data">${asmPcts.practical || ""}</td>
    <td class="empty-data">${asmPcts.project || ""}</td>
    <td class="empty-data">${asmPcts.proctored || ""}</td>
    <td class="empty-data">${asmPcts.workBased || ""}</td>
  </tr>`;

  // Capstone modules row
  html += `<tr>
    <td colspan="2" class="label-cell">Capstone modules<br>(Yes/No)?</td>
    <td colspan="4" class="label-cell">If Yes, provide details</td>
  </tr>`;
  html += `<tr>
    <td colspan="2" class="empty-data">&nbsp;</td>
    <td colspan="4" class="empty-data">&nbsp;</td>
  </tr>`;

  // 7.2 MIMLOs
  html += `<tr>
    <td colspan="6" class="form-section-title">
      <strong>7.2&nbsp;&nbsp;&nbsp;Minimum Intended Module Learning Outcomes (MIMLOs)</strong>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="5" class="label-cell">MIMLO<br>On successful completion of this module a learner will be able to:</td>
    <td class="label-cell">Related MIPLO<br>#</td>
  </tr>`;

  // MIMLO rows (show up to 5, or all if more)
  const mimloCount = Math.max(5, mimlos.length);
  for (let i = 0; i < mimloCount; i++) {
    const mimlo = mimlos[i];
    const ploNums = mimlo ? relatedPLOs.join(", ") : "";
    html += `<tr>
      <td class="empty-data" style="width: 20px;">${i + 1}.</td>
      <td colspan="4" class="empty-data">${mimlo ? escapeHtml(mimlo.text) : ""}</td>
      <td class="empty-data">${ploNums}</td>
    </tr>`;
  }

  // 7.3 Indicative Module Content
  html += `<tr>
    <td colspan="6" class="form-section-title">
      <strong>7.3&nbsp;&nbsp;&nbsp;Indicative Module Content, Organisation and Structure</strong>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="6" class="empty-data" style="min-height: 60pt;">&nbsp;</td>
  </tr>`;

  // 7.4 Work based learning
  html += `<tr>
    <td colspan="6" class="form-section-title">
      <strong>7.4&nbsp;&nbsp;&nbsp;Work based learning and practice-placement</strong>
      <span class="instruction-text"> (if applicable)</span>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="6" class="empty-data" style="min-height: 40pt;">&nbsp;</td>
  </tr>`;

  // 7.5 Specific module resources
  html += `<tr>
    <td colspan="6" class="form-section-title">
      <strong>7.5&nbsp;&nbsp;&nbsp;Specific module resources required</strong>
      <span class="instruction-text"> (if applicable)</span>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="6" class="empty-data" style="min-height: 40pt;">&nbsp;</td>
  </tr>`;

  // 7.6 Application of programme teaching
  html += `<tr>
    <td colspan="6" class="form-section-title">
      <strong>7.6&nbsp;&nbsp;&nbsp;Application of programme teaching, learning and assessment strategies to this module</strong>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="6" class="empty-data" style="min-height: 60pt;">&nbsp;</td>
  </tr>`;

  // 7.7 Summative Assessment Strategy
  html += `<tr>
    <td colspan="6" class="form-section-title">
      <strong>7.7&nbsp;&nbsp;&nbsp;Summative Assessment Strategy for this module</strong>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="2" class="label-cell">MIMLOs</td>
    <td colspan="2" class="label-cell">Technique(s)</td>
    <td colspan="2" class="label-cell">Weighting</td>
  </tr>`;

  // Assessment rows
  assessments.forEach((a) => {
    const mimloNums = (a.mimloIds ?? [])
      .map((id) => {
        const idx = mimlos.findIndex((m) => m.id === id);
        return idx >= 0 ? idx + 1 : "";
      })
      .filter((n) => n !== "")
      .join(", ");

    html += `<tr>
      <td colspan="2" class="empty-data">${mimloNums}</td>
      <td colspan="2" class="empty-data">${escapeHtml(a.title ?? a.type ?? "")}</td>
      <td colspan="2" class="empty-data">${a.weighting ?? ""}%</td>
    </tr>`;
  });

  // Add empty rows if no assessments
  if (assessments.length === 0) {
    for (let i = 0; i < 2; i++) {
      html += `<tr>
        <td colspan="2" class="empty-data">&nbsp;</td>
        <td colspan="2" class="empty-data">&nbsp;</td>
        <td colspan="2" class="empty-data">&nbsp;</td>
      </tr>`;
    }
  }

  // 7.8 Sample Assessment Materials
  html += `<tr>
    <td colspan="6" class="form-section-title">
      <strong>7.8&nbsp;&nbsp;&nbsp;Sample Assessment Materials</strong>
    </td>
  </tr>`;
  html += `<tr>
    <td colspan="6" class="instruction-text" style="padding: 4pt;">
      List sample assessment materials as supporting documentation and supply in separate document.
    </td>
  </tr>`;

  // 7.9 Indicative reading lists
  html += `<tr>
    <td colspan="6" class="form-section-title">
      <strong>7.9&nbsp;&nbsp;&nbsp;Indicative reading lists and other information resources</strong>
    </td>
  </tr>`;

  // Reading list entries
  if (readingList.length > 0) {
    readingList.forEach((item) => {
      const citation =
        item.citation ??
        `${item.author ?? ""} (${item.year ?? ""}). ${item.title ?? ""}. ${item.publisher ?? ""}.`;
      html += `<tr>
        <td colspan="6" class="empty-data">${escapeHtml(citation)}</td>
      </tr>`;
    });
  } else {
    html += `<tr>
      <td colspan="6" class="empty-data" style="min-height: 60pt;">&nbsp;</td>
    </tr>`;
  }

  html += "</table>";
  return html;
}

/**
 * Renders all module descriptors for a programme (Section 7).
 *
 * @param {Programme} data - Programme data
 * @returns {string} HTML markup for all module descriptors
 */
export function renderAllModuleDescriptors(data) {
  if (!data.modules || data.modules.length === 0) {
    return "<p>No modules available.</p>";
  }

  if (!data.versions || data.versions.length === 0) {
    return "<p>No programme versions available.</p>";
  }

  let html = '<h2 class="section-title">Section 7: Module Descriptors</h2>';

  // Use the first version as default context for effort hours
  const defaultVersion = data.versions[0];

  // Build a map of moduleId -> stage/stageModule for lookup
  /** @type {Map<string, { version: ProgrammeVersion, stage: Stage, stageModule: { moduleId: string, semester?: string } }>} */
  const moduleContextMap = new Map();

  data.versions.forEach((version) => {
    (version.stages ?? []).forEach((stage) => {
      (stage.modules ?? []).forEach((sm) => {
        if (!moduleContextMap.has(sm.moduleId)) {
          moduleContextMap.set(sm.moduleId, { version, stage, stageModule: sm });
        }
      });
    });
  });

  // Render each module
  data.modules.forEach((mod, idx) => {
    const context = moduleContextMap.get(mod.id);
    const version = context?.version ?? defaultVersion;
    const stage = context?.stage ?? { id: "", name: "" };
    const stageModule = context?.stageModule ?? { moduleId: mod.id };

    if (idx > 0) {
      html += '<div class="page-break"></div>';
    }

    html += renderModuleDescriptor(data, mod, version, stage, stageModule);
  });

  return html;
}
