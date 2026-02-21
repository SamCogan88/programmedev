/**
 * Programme-to-template data mapper.
 *
 * Transforms a {@link Programme} object into the flat data structure expected
 * by the tagged QQI Programme Descriptor template (docx-templates).
 *
 * This is a **pure function** — it has no side effects and depends only on
 * the Programme type. When the template gains new tags, add the corresponding
 * fields here and in the DescriptorData type.
 *
 * @module export/descriptor-data
 */

import type { Module, ModuleAssessment, PLO, Programme, ProgrammeVersion, Stage } from "../types";
import { classifyAssessmentType } from "../utils/assessments";

// ============================================================================
// Output Types
// ============================================================================

/** MIMLO data for the {FOR mimlo IN module.mimlos} loop. */
export interface DescriptorMimlo {
  index: number;
  text: string;
  relatedPlos: string;
}

/** Assessment data for the {FOR asmt IN module.assessments} loop. */
export interface DescriptorAssessment {
  mimloText: string;
  type: string;
  weighting: number;
}

/** Module data for the {FOR module IN modules} loop. */
export interface DescriptorModule {
  code: string;
  title: string;
  stage: string;
  semester: string;
  credits: number;
  mandatoryElective: string;

  // Effort hours
  effortOnsite: string;
  effortSyncOnline: string;
  effortSyncHybrid: string;
  effortAsync: string;
  effortIndependent: string;
  effortWorkBased: string;
  effortTotal: string;

  // Assessment percentages
  assessContinuous: string;
  assessExamInPerson: string;
  assessPractical: string;
  assessProject: string;
  assessExamOnline: string;
  assessWorkBased: string;

  // Nested arrays
  mimlos: DescriptorMimlo[];
  assessments: DescriptorAssessment[];
  readingListText: string;
}

/** PLO assessment mapping for the {FOR plo IN ploAssessmentMap} loop. */
export interface DescriptorPloAssessment {
  index: number;
  moduleMimloText: string;
  assessmentTechniques: string;
  weightings: string;
}

/** Full data object passed to docx-templates createReport(). */
export interface DescriptorData {
  // Simple fields
  programme_title: string;
  award_class: string;
  award_type: string;
  nfq_level: string;
  ects: string;
  award_standard_name: string;
  miplos: string;

  // Repeating sections
  modules: DescriptorModule[];
  ploAssessmentMap: DescriptorPloAssessment[];

  // Appendix 1 mapping strands
  mapping_knowledge_breadth_plos: string;
  mapping_knowledge_breadth_evidence: string;
  mapping_knowhow_skill_plos: string;
  mapping_knowhow_skill_evidence: string;
  mapping_competence_context_plos: string;
  mapping_competence_context_evidence: string;
  mapping_competence_role_plos: string;
  mapping_competence_role_evidence: string;
  mapping_competence_learning_plos: string;
  mapping_competence_learning_evidence: string;
  mapping_competence_insight_plos: string;
  mapping_competence_insight_evidence: string;
}

// ============================================================================
// Helpers
// ============================================================================

/** Format a number as a string, returning empty string for 0/undefined. */
function fmtNum(n: number | undefined): string {
  return n ? String(n) : "";
}

/** Format a percentage, returning empty string for 0. */
function fmtPct(n: number): string {
  return n > 0 ? `${n}%` : "";
}

/**
 * Resolve effort hours for a module.
 * Uses the first available version/modality key if present.
 */
function resolveEffort(mod: Module): Record<string, number> {
  const hours = mod.effortHours ?? {};
  const keys = Object.keys(hours);
  if (keys.length === 0) {
    return {};
  }
  return (hours[keys[0]] ?? {}) as Record<string, number>;
}

/**
 * Build the related PLOs text for a MIMLO.
 * Looks up which PLOs reference this MIMLO ID via ploToMimlos mapping.
 */
function getRelatedPlos(
  mimloId: string,
  plos: PLO[],
  ploToMimlos: Record<string, string[]>,
): string {
  const related: string[] = [];
  plos.forEach((plo, i) => {
    const mimloIds = ploToMimlos[plo.id] ?? [];
    if (mimloIds.includes(mimloId)) {
      related.push(`PLO ${i + 1}`);
    }
  });
  return related.join(", ");
}

/**
 * Build the MIMLO text for an assessment (which MIMLOs it assesses).
 */
function getAssessmentMimloText(assessment: ModuleAssessment, mod: Module): string {
  const mimloIds = assessment.mimloIds ?? [];
  if (mimloIds.length === 0) {
    return "";
  }
  const mimlos = mod.mimlos ?? [];
  return mimloIds
    .map((id) => {
      const idx = mimlos.findIndex((m) => m.id === id);
      return idx >= 0 ? `MIMLO ${idx + 1}` : "";
    })
    .filter(Boolean)
    .join(", ");
}

/**
 * Find which stage a module belongs to.
 */
function findModuleStage(
  moduleId: string,
  versions: ProgrammeVersion[],
): { stageName: string; semester: string } {
  for (const v of versions) {
    for (const stage of v.stages ?? []) {
      const stageModule = (stage.modules ?? []).find((sm) => sm.moduleId === moduleId);
      if (stageModule) {
        return {
          stageName: stage.name ?? String(stage.sequence ?? ""),
          semester: stageModule.semester ?? "",
        };
      }
    }
  }
  return { stageName: "", semester: "" };
}

// ============================================================================
// Strand Mapping
// ============================================================================

/** QQI award standard strands and the thread keywords that map to them. */
const STRAND_THREADS: Record<string, string[]> = {
  knowledge_breadth: ["knowledge", "breadth"],
  knowhow_skill: ["know-how", "skill", "knowhow"],
  competence_context: ["context"],
  competence_role: ["role"],
  competence_learning: ["learning to learn", "learning-to-learn"],
  competence_insight: ["insight"],
};

/**
 * Build the Appendix 1 strand mapping data.
 * For each strand, find PLOs whose standardMappings reference it.
 */
function buildStrandMappings(
  plos: PLO[],
  ploToMimlos: Record<string, string[]>,
  modules: Module[],
): Record<string, { plos: string; evidence: string }> {
  const result: Record<string, { plos: string; evidence: string }> = {};

  for (const [strand, keywords] of Object.entries(STRAND_THREADS)) {
    const matchingPlos: string[] = [];
    const evidenceItems: string[] = [];

    plos.forEach((plo, i) => {
      const mappings = plo.standardMappings ?? [];
      const matches = mappings.some((m) => {
        const thread = (m.thread ?? "").toLowerCase();
        return keywords.some((kw) => thread.includes(kw));
      });

      if (matches) {
        matchingPlos.push(`PLO ${i + 1}: ${plo.text}`);

        // Find modules that address this PLO via MIMLOs
        const mimloIds = ploToMimlos[plo.id] ?? [];
        const modNames = modules
          .filter((mod) => (mod.mimlos ?? []).some((mimlo) => mimloIds.includes(mimlo.id)))
          .map((mod) => mod.code || mod.title);
        if (modNames.length > 0) {
          evidenceItems.push(`PLO ${i + 1}: ${modNames.join(", ")}`);
        }
      }
    });

    result[strand] = {
      plos: matchingPlos.join("\n"),
      evidence: evidenceItems.join("\n"),
    };
  }

  return result;
}

// ============================================================================
// Main Builder
// ============================================================================

/**
 * Transform a Programme into the data object expected by the tagged template.
 *
 * @param p - The full programme state
 * @returns DescriptorData ready for docx-templates createReport()
 */
export function buildDescriptorData(p: Programme): DescriptorData {
  const plos: PLO[] = p.plos ?? [];
  const modules: Module[] = p.modules ?? [];
  const versions: ProgrammeVersion[] = p.versions ?? [];
  const ploToMimlos: Record<string, string[]> = p.ploToMimlos ?? {};

  // --- Simple fields ---
  const miplosText = plos.length ? plos.map((o, i) => `${i + 1}. ${o.text ?? ""}`).join("\n") : "";

  const awardStandardName = (p.awardStandardNames ?? [])[0] ?? (p.awardStandardIds ?? [])[0] ?? "";

  // --- Modules ---
  const descriptorModules: DescriptorModule[] = modules.map((mod) => {
    const effort = resolveEffort(mod);
    const { stageName, semester } = findModuleStage(mod.id, versions);
    const mimlos = mod.mimlos ?? [];
    const assessments = mod.assessments ?? [];

    // Assessment percentages by category
    const pcts: Record<string, number> = {
      continuous: 0,
      invigilated: 0,
      proctored: 0,
      project: 0,
      practical: 0,
      workBased: 0,
    };
    assessments.forEach((a) => {
      const cat = classifyAssessmentType(a.type ?? "");
      pcts[cat] += a.weighting ?? 0;
    });

    // Effort field mapping
    const effortOnsite = (effort.classroomHours ?? 0) as number;
    const effortSyncOnline = 0; // Not separately tracked in current schema
    const effortSyncHybrid = 0; // Not separately tracked in current schema
    const effortAsync = (effort.directedElearningHours ?? 0) as number;
    const effortIndependent = (effort.independentLearningHours ?? 0) as number;
    const effortWorkBased = (effort.workBasedHours ?? 0) as number;
    const effortTotal =
      effortOnsite +
      effortSyncOnline +
      effortSyncHybrid +
      effortAsync +
      effortIndependent +
      effortWorkBased +
      ((effort.mentoringHours ?? 0) as number) +
      ((effort.otherContactHours ?? 0) as number) +
      ((effort.otherHours ?? 0) as number);

    // Reading list
    const readingItems = mod.readingList ?? [];
    const readingListText = readingItems
      .map((item) => {
        const core = item.isCore ? "[Core] " : "";
        return `${core}${item.citation ?? item.title ?? ""}`;
      })
      .filter((s) => s.trim())
      .join("\n");

    return {
      code: mod.code ?? "",
      title: mod.title ?? "",
      stage: mod.stage != null ? String(mod.stage) : stageName,
      semester: mod.semester != null ? String(mod.semester) : semester,
      credits: mod.credits ?? 0,
      mandatoryElective: mod.isElective ? "E" : "M",

      effortOnsite: fmtNum(effortOnsite),
      effortSyncOnline: fmtNum(effortSyncOnline),
      effortSyncHybrid: fmtNum(effortSyncHybrid),
      effortAsync: fmtNum(effortAsync),
      effortIndependent: fmtNum(effortIndependent),
      effortWorkBased: fmtNum(effortWorkBased),
      effortTotal: fmtNum(effortTotal),

      assessContinuous: fmtPct(pcts.continuous),
      assessExamInPerson: fmtPct(pcts.invigilated),
      assessPractical: fmtPct(pcts.practical),
      assessProject: fmtPct(pcts.project),
      assessExamOnline: fmtPct(pcts.proctored),
      assessWorkBased: fmtPct(pcts.workBased),

      mimlos: mimlos.map((mimlo, i) => ({
        index: i + 1,
        text: mimlo.text ?? "",
        relatedPlos: getRelatedPlos(mimlo.id, plos, ploToMimlos),
      })),

      assessments: assessments.map((a) => ({
        mimloText: getAssessmentMimloText(a, mod),
        type: a.type ?? "",
        weighting: a.weighting ?? 0,
      })),

      readingListText,
    };
  });

  // --- PLO Assessment Map (Section 6.8) ---
  const ploAssessmentMap: DescriptorPloAssessment[] = plos.map((plo, i) => {
    const mimloIds = ploToMimlos[plo.id] ?? [];

    // Find modules and their MIMLOs that address this PLO
    const moduleMimlos: string[] = [];
    const techniques: Set<string> = new Set();
    const weightings: string[] = [];

    modules.forEach((mod) => {
      const modMimlos = mod.mimlos ?? [];
      const matchingMimlos = modMimlos.filter((m) => mimloIds.includes(m.id));
      if (matchingMimlos.length > 0) {
        const mimloNums = matchingMimlos.map((m) => {
          const idx = modMimlos.indexOf(m);
          return `MIMLO ${idx + 1}`;
        });
        moduleMimlos.push(`${mod.code || mod.title} (${mimloNums.join(", ")})`);

        // Find assessments that assess these MIMLOs
        (mod.assessments ?? []).forEach((a) => {
          const asmtMimloIds = a.mimloIds ?? [];
          if (matchingMimlos.some((m) => asmtMimloIds.includes(m.id))) {
            techniques.add(a.type ?? "");
            weightings.push(`${mod.code || mod.title}: ${a.type ?? ""} ${a.weighting ?? 0}%`);
          }
        });
      }
    });

    return {
      index: i + 1,
      moduleMimloText: moduleMimlos.join("; "),
      assessmentTechniques: [...techniques].join(", "),
      weightings: weightings.join("\n"),
    };
  });

  // --- Appendix 1 Strand Mappings ---
  const strandMappings = buildStrandMappings(plos, ploToMimlos, modules);

  return {
    programme_title: p.title ?? "",
    award_class: p.awardType ?? "",
    award_type: p.awardType ?? "",
    nfq_level: p.nfqLevel != null ? String(p.nfqLevel) : "",
    ects: String(p.totalCredits ?? ""),
    award_standard_name: awardStandardName,
    miplos: miplosText,

    modules: descriptorModules,
    ploAssessmentMap,

    mapping_knowledge_breadth_plos: strandMappings.knowledge_breadth?.plos ?? "",
    mapping_knowledge_breadth_evidence: strandMappings.knowledge_breadth?.evidence ?? "",
    mapping_knowhow_skill_plos: strandMappings.knowhow_skill?.plos ?? "",
    mapping_knowhow_skill_evidence: strandMappings.knowhow_skill?.evidence ?? "",
    mapping_competence_context_plos: strandMappings.competence_context?.plos ?? "",
    mapping_competence_context_evidence: strandMappings.competence_context?.evidence ?? "",
    mapping_competence_role_plos: strandMappings.competence_role?.plos ?? "",
    mapping_competence_role_evidence: strandMappings.competence_role?.evidence ?? "",
    mapping_competence_learning_plos: strandMappings.competence_learning?.plos ?? "",
    mapping_competence_learning_evidence: strandMappings.competence_learning?.evidence ?? "",
    mapping_competence_insight_plos: strandMappings.competence_insight?.plos ?? "",
    mapping_competence_insight_evidence: strandMappings.competence_insight?.evidence ?? "",
  };
}
