import { describe, expect, it } from "vitest";

import type { Module, Programme, Stage } from "../types";

import {
  classifyAssessmentType,
  getAssessmentFlags,
  getAssessmentPercentages,
} from "./assessments";

describe("classifyAssessmentType", () => {
  it("classifies campus exam as invigilated", () => {
    expect(classifyAssessmentType("Exam (Campus)")).toBe("invigilated");
  });

  it("classifies online exam as proctored", () => {
    expect(classifyAssessmentType("Online Exam")).toBe("proctored");
  });

  it("classifies project types", () => {
    expect(classifyAssessmentType("Project")).toBe("project");
    expect(classifyAssessmentType("Capstone Project")).toBe("project");
  });

  it("classifies practical and lab types", () => {
    expect(classifyAssessmentType("Practical")).toBe("practical");
    expect(classifyAssessmentType("Lab Report")).toBe("practical");
  });

  it("classifies work-based types", () => {
    expect(classifyAssessmentType("Work Placement")).toBe("workBased");
  });

  it("defaults to continuous for unrecognised types", () => {
    expect(classifyAssessmentType("Essay")).toBe("continuous");
    expect(classifyAssessmentType("")).toBe("continuous");
    expect(classifyAssessmentType("Assignment")).toBe("continuous");
  });

  it("is case-insensitive", () => {
    expect(classifyAssessmentType("EXAM (CAMPUS)")).toBe("invigilated");
    expect(classifyAssessmentType("online exam")).toBe("proctored");
  });
});

describe("getAssessmentFlags", () => {
  const makeModule = (id: string, types: string[]): Module =>
    ({
      id,
      title: id,
      code: id,
      credits: 5,
      assessments: types.map((t, i) => ({
        id: `a${i}`,
        title: t,
        type: t,
        weighting: 50,
      })),
    }) as Module;

  const makeProgramme = (modules: Module[]): Programme => ({ modules }) as Programme;

  it("returns all false when no modules", () => {
    const p = makeProgramme([]);
    const flags = getAssessmentFlags(p, []);
    expect(Object.values(flags).every((v) => v === false)).toBe(true);
  });

  it("sets flags for assessment types present in stage modules", () => {
    const m1 = makeModule("m1", ["Essay", "Exam (Campus)"]);
    const p = makeProgramme([m1]);
    const stageModules: Stage["modules"] = [{ moduleId: "m1" }];
    const flags = getAssessmentFlags(p, stageModules);
    expect(flags.continuous).toBe(true);
    expect(flags.invigilated).toBe(true);
    expect(flags.proctored).toBe(false);
  });

  it("handles undefined stageModules", () => {
    const p = makeProgramme([]);
    const flags = getAssessmentFlags(p, undefined);
    expect(Object.values(flags).every((v) => v === false)).toBe(true);
  });

  it("handles modules without assessments", () => {
    const m1 = { id: "m1", title: "m1", code: "m1", credits: 5 } as Module;
    const p = makeProgramme([m1]);
    const stageModules: Stage["modules"] = [{ moduleId: "m1" }];
    const flags = getAssessmentFlags(p, stageModules);
    expect(Object.values(flags).every((v) => v === false)).toBe(true);
  });
});

describe("getAssessmentPercentages", () => {
  it("returns zeros for module without assessments", () => {
    const mod = { id: "m1", title: "m1", code: "m1", credits: 5 } as Module;
    const pcts = getAssessmentPercentages(mod);
    expect(Object.values(pcts).every((v) => v === 0)).toBe(true);
  });

  it("sums weightings by category", () => {
    const mod = {
      id: "m1",
      title: "m1",
      code: "m1",
      credits: 5,
      assessments: [
        { id: "a1", title: "Essay", type: "Essay", weighting: 40 },
        { id: "a2", title: "Exam", type: "Exam (Campus)", weighting: 60 },
      ],
    } as Module;
    const pcts = getAssessmentPercentages(mod);
    expect(pcts.continuous).toBe(40);
    expect(pcts.invigilated).toBe(60);
    expect(pcts.proctored).toBe(0);
  });

  it("handles missing weighting as zero", () => {
    const mod = {
      id: "m1",
      title: "m1",
      code: "m1",
      credits: 5,
      assessments: [{ id: "a1", title: "Essay", type: "Essay" }],
    } as Module;
    const pcts = getAssessmentPercentages(mod);
    expect(pcts.continuous).toBe(0);
  });
});
