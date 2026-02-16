/**
 * Assessment type classification utilities.
 * Centralises the mapping from assessment type strings to standard categories.
 * @module utils/assessments
 */

import type { Module, ModuleAssessment, Programme, Stage } from "../types";

/** Standard assessment categories used in QQI schedules and descriptors. */
export type AssessmentCategory =
  | "continuous"
  | "invigilated"
  | "proctored"
  | "project"
  | "practical"
  | "workBased";

/** Boolean flags indicating which assessment categories appear. */
export type AssessmentFlags = Record<AssessmentCategory, boolean>;

/** Percentage totals per assessment category. */
export type AssessmentPercentages = Record<AssessmentCategory, number>;

/**
 * Classify an assessment type string into a standard category.
 */
export function classifyAssessmentType(typeStr: string): AssessmentCategory {
  const t = typeStr.toLowerCase();
  if (t.includes("exam") && t.includes("campus")) {
    return "invigilated";
  } else if (t.includes("exam") && t.includes("online")) {
    return "proctored";
  } else if (t.includes("project")) {
    return "project";
  } else if (t.includes("practical") || t.includes("lab")) {
    return "practical";
  } else if (t.includes("work")) {
    return "workBased";
  }
  return "continuous";
}

/** Empty flags with all categories set to `false`. */
function emptyFlags(): AssessmentFlags {
  return {
    continuous: false,
    invigilated: false,
    proctored: false,
    project: false,
    practical: false,
    workBased: false,
  };
}

/** Empty percentages with all categories set to `0`. */
function emptyPercentages(): AssessmentPercentages {
  return {
    continuous: 0,
    invigilated: 0,
    proctored: 0,
    project: 0,
    practical: 0,
    workBased: 0,
  };
}

/**
 * Determine which assessment categories are present across all modules
 * assigned to a stage.
 */
export function getAssessmentFlags(
  programme: Programme,
  stageModules: Stage["modules"],
): AssessmentFlags {
  const flags = emptyFlags();
  (stageModules ?? []).forEach((sm) => {
    const mod = (programme.modules ?? []).find((m) => m.id === sm.moduleId);
    if (mod?.assessments) {
      mod.assessments.forEach((a: ModuleAssessment) => {
        flags[classifyAssessmentType(a.type ?? "")] = true;
      });
    }
  });
  return flags;
}

/**
 * Sum assessment weightings by category for a single module.
 */
export function getAssessmentPercentages(mod: Module): AssessmentPercentages {
  const pcts = emptyPercentages();
  (mod.assessments ?? []).forEach((a) => {
    pcts[classifyAssessmentType(a.type ?? "")] += a.weighting ?? 0;
  });
  return pcts;
}
