/**
 * Structure (Credits & Modules) step component
 */

import { state, saveDebounced } from '../../state/store.js';
import { escapeHtml } from '../../utils/dom.js';
import { uid } from '../../utils/uid.js';
import { getDevModeToggleHtml, wireDevModeToggle } from '../dev-mode.js';
import { accordionControlsHtml, wireAccordionControls, captureOpenCollapseIds } from './shared.js';

/**
 * Render the Structure step
 */
export function renderStructureStep() {
  const p = state.programme;
  const content = document.getElementById("content");
  if (!content) return;

  const devModeToggleHtml = getDevModeToggleHtml();
  const openCollapseIds = captureOpenCollapseIds('modulesAccordion');

  // Calculate credit summaries
  const mandatoryModules = (p.modules || []).filter(m => !m.isElective);
  const electiveModules = (p.modules || []).filter(m => m.isElective === true);
  const mandatoryCredits = mandatoryModules.reduce((acc, m) => acc + (Number(m.credits) || 0), 0);
  const electiveCredits = electiveModules.reduce((acc, m) => acc + (Number(m.credits) || 0), 0);
  const totalModuleCredits = mandatoryCredits + electiveCredits;
  // Sum credits across all definitions (each definition has its own credit value)
  const electiveDefinitionsCredits = (p.electiveDefinitions || []).reduce((acc, def) => acc + (Number(def.credits) || 0), 0);
  const numDefinitions = (p.electiveDefinitions || []).length;

  const moduleRows = (p.modules || []).map((m, idx) => {
    const headingId = `module_${m.id}_heading`;
    const collapseId = `module_${m.id}_collapse`;
    const titlePreview = (m.title || "").trim() || "Module";
    const codePreview = (m.code || "").trim();
    const creditsPreview = Number(m.credits || 0);
    const isElective = m.isElective === true;
    const typeBadge = isElective 
      ? `<span class="badge text-bg-info me-2" title="Elective">E</span>`
      : `<span class="badge text-bg-primary me-2" title="Mandatory">M</span>`;

    const isActive = openCollapseIds.has(collapseId) ? true : (openCollapseIds.size === 0 && idx === 0);
    return `
      <div class="accordion-item bg-body">
        <h2 class="accordion-header" id="${headingId}">
          <button class="accordion-button ${isActive ? "" : "collapsed"} w-100" type="button" data-bs-toggle="collapse" data-bs-target="#${collapseId}" aria-expanded="${isActive}" aria-controls="${collapseId}">
            <div class="d-flex w-100 align-items-center gap-2">
              <div class="flex-grow-1">
                <div class="fw-semibold">${typeBadge}Module ${idx + 1}${codePreview ? `: ${escapeHtml(codePreview)}` : ""}</div>
                <div class="small text-secondary">${escapeHtml(titlePreview)} • ${creditsPreview} cr</div>
              </div>
              <div class="header-actions d-flex align-items-center gap-2 me-2">
                <span class="btn btn-sm btn-outline-danger" data-remove-module="${m.id}" role="button">Remove</span>
              </div>
            </div>
          </button>
        </h2>
        <div id="${collapseId}" class="accordion-collapse collapse ${isActive ? "show" : ""}" aria-labelledby="${headingId}">
          <div class="accordion-body">
            <div class="row g-3">
              <div class="col-md-2">
                <label class="form-label fw-semibold">Type</label>
                <select class="form-select" data-module-field="isElective" data-module-id="${m.id}">
                  <option value="false" ${!isElective ? "selected" : ""}>Mandatory</option>
                  <option value="true" ${isElective ? "selected" : ""}>Elective</option>
                </select>
              </div>
              <div class="col-md-2">
                <label class="form-label fw-semibold">Code (opt.)</label>
                <input class="form-control" data-module-field="code" data-module-id="${m.id}" value="${escapeHtml(m.code || "")}">
              </div>
              <div class="col-md-5">
                <label class="form-label fw-semibold">Title</label>
                <input class="form-control" data-module-field="title" data-module-id="${m.id}" value="${escapeHtml(m.title || "")}">
              </div>
              <div class="col-md-3">
                <label class="form-label fw-semibold">Credits</label>
                <input type="number" class="form-control" data-module-field="credits" data-module-id="${m.id}" value="${Number(m.credits || 0)}">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  content.innerHTML = devModeToggleHtml + `
    <div class="card shadow-sm">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h5 class="card-title mb-0">Credits & modules (QQI-critical)</h5>
          <button class="btn btn-dark btn-sm" id="addModuleBtn">+ Add module</button>
        </div>

        <div class="row g-3 mb-3">
          <div class="col-md-3">
            <label class="form-label fw-semibold">Total programme credits</label>
            <input type="number" class="form-control" id="totalCredits" value="${Number(p.totalCredits || 0)}" disabled>
          </div>
          <div class="col-md-9">
            <label class="form-label fw-semibold">Credit summary</label>
            <div class="d-flex gap-3 flex-wrap align-items-center" style="min-height: 38px;">
              <span class="badge text-bg-primary fs-6"><span class="badge text-bg-light text-primary me-1">M</span> ${mandatoryCredits} cr (${mandatoryModules.length} modules)</span>
              <span class="badge text-bg-info fs-6"><span class="badge text-bg-light text-info me-1">E</span> ${electiveCredits} cr (${electiveModules.length} modules)</span>
              ${numDefinitions > 0 ? `<span class="badge text-bg-secondary fs-6">${numDefinitions} elective def(s) = ${electiveDefinitionsCredits} cr</span>` : ''}
              <span class="badge ${totalModuleCredits === (p.totalCredits || 0) ? 'text-bg-success' : 'text-bg-warning'} fs-6">Sum: ${totalModuleCredits} / ${p.totalCredits || 0}</span>
            </div>
          </div>
        </div>

        <div class="small text-muted mb-3">
          <strong>Tip:</strong> Mark modules as <span class="badge text-bg-primary">M</span> Mandatory or <span class="badge text-bg-info">E</span> Elective. 
          Elective modules are assigned to groups in the "Electives" step.
        </div>

        ${accordionControlsHtml('modulesAccordion')}
        <div class="accordion" id="modulesAccordion">
          ${moduleRows || `<div class="alert alert-info mb-0">No modules added yet.</div>`}
        </div>
      </div>
    </div>
  `;

  wireDevModeToggle(() => window.render?.());
  wireAccordionControls('modulesAccordion');
  wireStructureStep();
}

/**
 * Wire Structure step event handlers
 */
function wireStructureStep() {
  const p = state.programme;
  p.mode = p.mode || 'PROGRAMME_OWNER';

  document.getElementById("addModuleBtn").onclick = () => {
    p.modules.push({ id: uid("mod"), code: "", title: "New module", credits: 0, isElective: false, mimlos: [], assessments: [] });
    saveDebounced();
    window.render?.();
  };

  document.querySelectorAll("[data-remove-module]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-remove-module");
      p.modules = p.modules.filter(m => m.id !== id);
      // remove from mappings too
      for (const ploId of Object.keys(p.ploToModules || {})) {
        p.ploToModules[ploId] = (p.ploToModules[ploId] || []).filter(mid => mid !== id);
      }
      // remove from elective groups (nested in definitions)
      (p.electiveDefinitions || []).forEach(def => {
        (def.groups || []).forEach(g => {
          g.moduleIds = (g.moduleIds || []).filter(mid => mid !== id);
        });
      });
      saveDebounced();
      window.render?.();
    };
  });

  document.querySelectorAll("[data-module-field]").forEach(inp => {
    const handler = (e) => {
      const id = inp.getAttribute("data-module-id");
      const field = inp.getAttribute("data-module-field");
      const m = p.modules.find(x => x.id === id);
      if (!m) return;
      if (field === "credits") {
        m[field] = Number(e.target.value || 0);
      } else if (field === "isElective") {
        m[field] = e.target.value === "true";
      } else {
        m[field] = e.target.value;
      }
      saveDebounced();
      window.render?.();
    };
    if (inp.tagName === "SELECT") {
      inp.addEventListener("change", handler);
    } else {
      inp.addEventListener("input", handler);
    }
  });
}
