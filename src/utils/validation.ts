/**
 * Programme validation and completion tracking utilities.
 * Provides validation rules and progress calculation for programme design.
 * @module utils/validation
 */

import type {
  ElectiveDefinition,
  ElectiveGroup,
  MIMLO,
  Module,
  ModuleAssessment,
  PLO,
  Programme,
  ProgrammeVersion,
  Stage,
} from "../types";

export interface ValidationFlag {
  type: "error" | "warn";
  msg: string;
  step: string;
}

/**
 * Validates a programme and returns an array of validation flags.
 * Checks identity fields, credit totals, versions, stages, PLOs, and mappings.
 */
export function validateProgramme(p: Programme): ValidationFlag[] {
  const flags: ValidationFlag[] = [];
  const sumCredits = (p.modules ?? []).reduce(
    (acc: number, m: Module) => acc + (Number(m.credits) ?? 0),
    0,
  );

  if (!p.title.trim()) {
    flags.push({
      type: "error",
      msg: "Programme title is missing.",
      step: "identity",
    });
  }
  if (!p.nfqLevel) {
    flags.push({
      type: "error",
      msg: "NFQ level is missing.",
      step: "identity",
    });
  }
  if (p.nfqLevel && (Number(p.nfqLevel) < 6 || Number(p.nfqLevel) > 9)) {
    flags.push({
      type: "error",
      msg: "NFQ level must be between 6 and 9.",
      step: "identity",
    });
  }
  if (!p.awardType.trim()) {
    flags.push({
      type: "warn",
      msg: "Award type is missing.",
      step: "identity",
    });
  }

  if ((p.totalCredits ?? 0) <= 0) {
    flags.push({
      type: "error",
      msg: "Total programme credits are missing/zero.",
      step: "structure",
    });
  }

  // Calculate mandatory vs elective credits
  const mandatoryModules = (p.modules ?? []).filter((m: Module) => !m.isElective);
  const mandatoryCredits = mandatoryModules.reduce(
    (acc: number, m: Module) => acc + (Number(m.credits) ?? 0),
    0,
  );

  const electiveDefinitions = p.electiveDefinitions ?? [];

  // If no electives configured, use traditional credit check
  if (electiveDefinitions.length === 0) {
    if ((p.totalCredits ?? 0) > 0 && sumCredits !== p.totalCredits) {
      flags.push({
        type: "error",
        msg: `Credits mismatch: totalCredits=${p.totalCredits} but modules sum to ${sumCredits}.`,
        step: "structure",
      });
    }
  } else {
    // Electives are configured - validate elective structure
    // Students complete every definition (choosing one group per definition)

    // Check each definition and its groups
    const moduleGroupAssignments = new Map<string, Array<{ groupId: string; groupName: string }>>();

    electiveDefinitions.forEach((def: ElectiveDefinition, defIdx: number) => {
      const defDisplayName = def.name ?? `Definition ${defIdx + 1}`;
      const defCode = def.code ?? "";
      const defLabel = defCode ? `[${defCode}] ${defDisplayName}` : defDisplayName;
      const defCredits = def.credits ?? 0;
      const groups = def.groups ?? [];

      // Check: Definition has no groups (students need at least one option)
      if (groups.length === 0) {
        flags.push({
          type: "warn",
          msg: `${defLabel}: no groups defined (students need at least one option).`,
          step: "identity",
        });
      }

      // Check: Definition has no credits set
      if (defCredits === 0 && groups.length > 0) {
        flags.push({
          type: "warn",
          msg: `${defLabel}: has groups but no credit value set.`,
          step: "identity",
        });
      }

      // Check each group within this definition
      groups.forEach((g: ElectiveGroup, grpIdx: number) => {
        const groupDisplayName = g.name ?? `Group ${grpIdx + 1}`;
        const groupCode = g.code ?? "";
        const groupLabel = groupCode ? `[${groupCode}] ${groupDisplayName}` : groupDisplayName;
        const fullGroupName = `${defLabel} → ${groupLabel}`;

        // Check: Group has no modules assigned
        if (!g.moduleIds || g.moduleIds.length === 0) {
          flags.push({
            type: "warn",
            msg: `${fullGroupName}: no modules assigned.`,
            step: "electives",
          });
        } else {
          // Track module-to-group assignments
          g.moduleIds.forEach((mId: string) => {
            if (!moduleGroupAssignments.has(mId)) {
              moduleGroupAssignments.set(mId, []);
            }
            moduleGroupAssignments.get(mId)?.push({ groupId: g.id, groupName: fullGroupName });
          });

          // Check: Group includes a non-elective module
          const groupModules = (p.modules ?? []).filter((m: Module) => g.moduleIds.includes(m.id));
          const nonElectiveInGroup = groupModules.filter((m: Module) => !m.isElective);
          if (nonElectiveInGroup.length > 0) {
            flags.push({
              type: "warn",
              msg: `${fullGroupName}: contains ${nonElectiveInGroup.length} mandatory module(s).`,
              step: "electives",
            });
          }

          // Check: Module ECTS totals don't align with the definition's credit value
          const groupCreditsSum = groupModules.reduce(
            (acc: number, m: Module) => acc + (Number(m.credits) ?? 0),
            0,
          );
          if (groupCreditsSum !== defCredits) {
            flags.push({
              type: "warn",
              msg: `${fullGroupName}: module credits (${groupCreditsSum}) don't match definition requirement (${defCredits}).`,
              step: "electives",
            });
          }
        }
      });
    });

    // Check: A module appears in multiple groups
    moduleGroupAssignments.forEach((assignments, moduleId) => {
      if (assignments.length > 1) {
        const mod = (p.modules ?? []).find((m: Module) => m.id === moduleId);
        const modName = mod ? (mod.code ?? mod.title ?? moduleId) : moduleId;
        const groupNames = assignments.map((a) => a.groupName).join(", ");
        flags.push({
          type: "warn",
          msg: `Module "${modName}" is assigned to ${assignments.length} groups: ${groupNames}.`,
          step: "electives",
        });
      }
    });

    // Credit check: mandatory + sum of all definition credits should = totalCredits
    // (Students complete every definition by choosing one group per definition)
    const definitionCreditsSum = electiveDefinitions.reduce(
      (acc: number, def: ElectiveDefinition) => acc + (Number(def.credits) ?? 0),
      0,
    );
    const expectedTotal = mandatoryCredits + definitionCreditsSum;
    if (expectedTotal !== (p.totalCredits ?? 0) && definitionCreditsSum > 0) {
      flags.push({
        type: "warn",
        msg: `Credit check: mandatory (${mandatoryCredits}) + elective definitions (${definitionCreditsSum}) = ${expectedTotal}, but programme total is ${p.totalCredits ?? 0}.`,
        step: "structure",
      });
    }
  }

  // Versions
  if (!Array.isArray(p.versions) || p.versions.length === 0) {
    flags.push({
      type: "error",
      msg: "At least one Programme Version is required (e.g., FT/PT/Online).",
      step: "versions",
    });
  } else {
    const labels = new Set<string>();
    p.versions.forEach((v: ProgrammeVersion, idx: number) => {
      const prefix = `Version ${idx + 1}`;
      if (!v.label || !v.label.trim()) {
        flags.push({
          type: "warn",
          msg: `${prefix}: label is missing.`,
          step: "versions",
        });
      } else {
        const norm = v.label.trim().toLowerCase();
        if (labels.has(norm)) {
          flags.push({
            type: "warn",
            msg: `${prefix}: duplicate label ("${v.label}").`,
            step: "versions",
          });
        }
        labels.add(norm);
      }

      // Delivery pattern for selected modality must sum to 100
      if (v.deliveryModality) {
        const mod = v.deliveryModality;
        const pat = (v.deliveryPatterns ?? ({} as Record<string, any>))[mod];
        if (!pat) {
          flags.push({
            type: "error",
            msg: `${prefix}: missing delivery pattern for ${mod}.`,
            step: "versions",
          });
        } else {
          const total =
            Number(pat.syncOnlinePct ?? 0) +
            Number(pat.asyncDirectedPct ?? 0) +
            Number(pat.onCampusPct ?? 0);
          if (total !== 100) {
            flags.push({
              type: "error",
              msg: `${prefix}: ${mod} delivery pattern must total 100% (currently ${total}%).`,
              step: "versions",
            });
          }
        }
      }

      if (
        (v.onlineProctoredExams ?? "TBC") === "YES" &&
        !(v.onlineProctoredExamsNotes ?? "").trim()
      ) {
        flags.push({
          type: "warn",
          msg: `${prefix}: online proctored exams marked YES but notes are empty.`,
          step: "versions",
        });
      }

      if ((v.targetCohortSize ?? 0) <= 0) {
        flags.push({
          type: "warn",
          msg: `${prefix}: cohort size is missing/zero.`,
          step: "versions",
        });
      }

      // Stage structure
      if (!Array.isArray(v.stages) || v.stages.length === 0) {
        flags.push({
          type: "warn",
          msg: `${prefix}: no stages defined yet.`,
          step: "stages",
        });
      } else {
        const stageTargetSum = (v.stages ?? []).reduce(
          (acc: number, s: Stage) => acc + Number(s.creditsTarget ?? 0),
          0,
        );
        if (
          (p.totalCredits ?? 0) > 0 &&
          stageTargetSum > 0 &&
          stageTargetSum !== Number(p.totalCredits ?? 0)
        ) {
          flags.push({
            type: "warn",
            msg: `${prefix}: sum of stage credit targets (${stageTargetSum}) does not match programme total credits (${p.totalCredits}).`,
            step: "stages",
          });
        }

        (v.stages ?? []).forEach((s: Stage) => {
          const stageMods = (s.modules ?? []).map((x) => x.moduleId);
          const creditSum = (p.modules ?? [])
            .filter((m: Module) => stageMods.includes(m.id))
            .reduce((acc: number, m: Module) => acc + Number(m.credits ?? 0), 0);

          if ((s.creditsTarget ?? 0) > 0 && creditSum !== Number(s.creditsTarget ?? 0)) {
            flags.push({
              type: "warn",
              msg: `${prefix}: ${s.name ?? "stage"} module credits sum to ${creditSum} but target is ${s.creditsTarget}.`,
              step: "stages",
            });
          }

          if (s.exitAward && s.exitAward.enabled && !(s.exitAward.awardTitle ?? "").trim()) {
            flags.push({
              type: "warn",
              msg: `${prefix}: ${s.name ?? "stage"} has an exit award enabled but no award title entered.`,
              step: "stages",
            });
          }
        });
      }
    });
  }

  // Outcomes & mapping
  if ((p.plos ?? []).length < 6) {
    flags.push({
      type: "warn",
      msg: "PLOs: fewer than 6 (usually aim for ~6–12).",
      step: "outcomes",
    });
  }
  if ((p.plos ?? []).length > 12) {
    flags.push({
      type: "warn",
      msg: "PLOs: more than 12 (consider tightening).",
      step: "outcomes",
    });
  }

  const modulesMissingMimlos = (p.modules ?? []).filter(
    (m: Module) => !m.mimlos || m.mimlos.length === 0,
  );
  if (modulesMissingMimlos.length > 0) {
    flags.push({
      type: "warn",
      msg: `Some modules have no MIMLOs yet (${modulesMissingMimlos.length}).`,
      step: "mimlos",
    });
  }

  // Assessment week validation
  const minTeachingWeeks = (p.versions ?? []).reduce((min, v) => {
    const weeks = v.teachingWeeks ?? 12;
    return weeks < min ? weeks : min;
  }, 12);

  (p.modules ?? []).forEach((m: Module) => {
    (m.assessments ?? []).forEach((a: ModuleAssessment) => {
      if (a.indicativeWeek && a.indicativeWeek > minTeachingWeeks) {
        flags.push({
          type: "warn",
          msg: `[${m.code || "Module"}] Assessment '${a.title || "Untitled"}': indicative week (${a.indicativeWeek}) exceeds teaching weeks (${minTeachingWeeks}).`,
          step: "assessments",
        });
      }
    });
  });

  const unmappedPLOs = (p.plos ?? []).filter(
    (o: PLO) => !(p.ploToMimlos ?? {})[o.id] || ((p.ploToMimlos ?? {})[o.id] ?? []).length === 0,
  );
  if (unmappedPLOs.length > 0) {
    flags.push({
      type: "error",
      msg: `Some PLOs are not mapped to any MIMLO (${unmappedPLOs.length}).`,
      step: "mapping",
    });
  }

  return flags;
}

/**
 * Calculates the overall completion percentage of a programme.
 * Checks identity fields, structure, outcomes, and versions for completion.
 */
export function completionPercent(p: Programme): number {
  let total = 0,
    done = 0;

  // Identity (4 items)
  total++;
  if (p.title && p.title.trim()) {
    done++;
  }
  total++;
  if (p.nfqLevel) {
    done++;
  }
  total++;
  if (p.awardType && p.awardType.trim()) {
    done++;
  }
  total++;
  if (p.school && p.school.trim()) {
    done++;
  }

  // Structure (2 items)
  total++;
  if ((p.totalCredits ?? 0) > 0) {
    done++;
  }
  total++;
  if ((p.modules ?? []).length > 0) {
    done++;
  }

  // Outcomes (2 items)
  total++;
  if ((p.plos ?? []).length >= 6) {
    done++;
  }
  total++;
  if (Object.keys(p.ploToMimlos ?? {}).length > 0) {
    done++;
  }

  // Versions (2 items)
  total++;
  if (Array.isArray(p.versions) && p.versions.length > 0) {
    done++;
  }
  const v0 = (p.versions ?? [])[0];
  total++;
  if (v0 && Array.isArray(v0.stages) && v0.stages.length > 0) {
    done++;
  }

  return Math.round((done / total) * 100);
}
