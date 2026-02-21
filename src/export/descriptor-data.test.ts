/**
 * Unit tests for the programme-to-template data mapper.
 * @module export/descriptor-data.test
 */

import { describe, expect, it } from "vitest";

import type { Module, PLO, Programme, ProgrammeVersion } from "../types";
import { buildDescriptorData } from "./descriptor-data";

// ============================================================================
// Test Helpers
// ============================================================================

function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    schemaVersion: 5,
    id: "prog-1",
    title: "BSc in Computing",
    awardType: "Major",
    awardTypeIsOther: false,
    nfqLevel: 8,
    school: "School of Computing",
    awardStandardIds: ["std-1"],
    awardStandardNames: ["Computing"],
    totalCredits: 240,
    electiveDefinitions: [],
    ...overrides,
  } as Programme;
}

function makeModule(overrides: Partial<Module> = {}): Module {
  return {
    id: "mod-1",
    title: "Software Engineering",
    code: "COMP101",
    credits: 10,
    ...overrides,
  };
}

function makePlo(overrides: Partial<PLO> = {}): PLO {
  return {
    id: "plo-1",
    text: "Analyse computing problems",
    ...overrides,
  };
}

function makeVersion(overrides: Partial<ProgrammeVersion> = {}): ProgrammeVersion {
  return {
    id: "ver-1",
    label: "Full-Time",
    code: "FT",
    ...overrides,
  };
}

// ============================================================================
// Tests: Simple Fields
// ============================================================================

describe("buildDescriptorData — simple fields", () => {
  it("maps programme title", () => {
    const data = buildDescriptorData(makeProgramme({ title: "Higher Diploma" }));
    expect(data.programme_title).toBe("Higher Diploma");
  });

  it("maps award class and type", () => {
    const data = buildDescriptorData(makeProgramme({ awardType: "Minor" }));
    expect(data.award_class).toBe("Minor");
    expect(data.award_type).toBe("Minor");
  });

  it("maps NFQ level as string", () => {
    const data = buildDescriptorData(makeProgramme({ nfqLevel: 9 }));
    expect(data.nfq_level).toBe("9");
  });

  it("handles null NFQ level", () => {
    const data = buildDescriptorData(makeProgramme({ nfqLevel: null }));
    expect(data.nfq_level).toBe("");
  });

  it("maps ECTS credits as string", () => {
    const data = buildDescriptorData(makeProgramme({ totalCredits: 120 }));
    expect(data.ects).toBe("120");
  });

  it("maps first award standard name", () => {
    const data = buildDescriptorData(
      makeProgramme({ awardStandardNames: ["Computing", "Science"] }),
    );
    expect(data.award_standard_name).toBe("Computing");
  });

  it("falls back to award standard ID when name is missing", () => {
    const data = buildDescriptorData(
      makeProgramme({ awardStandardNames: [], awardStandardIds: ["std-computing"] }),
    );
    expect(data.award_standard_name).toBe("std-computing");
  });

  it("returns empty string when no award standard", () => {
    const data = buildDescriptorData(
      makeProgramme({ awardStandardNames: [], awardStandardIds: [] }),
    );
    expect(data.award_standard_name).toBe("");
  });
});

// ============================================================================
// Tests: MIPLOs
// ============================================================================

describe("buildDescriptorData — MIPLOs", () => {
  it("formats PLOs as numbered list", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [
          makePlo({ text: "Analyse problems" }),
          makePlo({ id: "plo-2", text: "Design solutions" }),
        ],
      }),
    );
    expect(data.miplos).toBe("1. Analyse problems\n2. Design solutions");
  });

  it("returns empty string when no PLOs", () => {
    const data = buildDescriptorData(makeProgramme({ plos: [] }));
    expect(data.miplos).toBe("");
  });

  it("handles undefined PLOs", () => {
    const data = buildDescriptorData(makeProgramme({ plos: undefined }));
    expect(data.miplos).toBe("");
  });
});

// ============================================================================
// Tests: Modules
// ============================================================================

describe("buildDescriptorData — modules", () => {
  it("maps basic module fields", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [makeModule({ code: "CS101", title: "Intro to CS", credits: 5 })],
      }),
    );
    expect(data.modules).toHaveLength(1);
    expect(data.modules[0].code).toBe("CS101");
    expect(data.modules[0].title).toBe("Intro to CS");
    expect(data.modules[0].credits).toBe(5);
  });

  it("maps mandatory/elective correctly", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [makeModule({ isElective: false }), makeModule({ id: "mod-2", isElective: true })],
      }),
    );
    expect(data.modules[0].mandatoryElective).toBe("M");
    expect(data.modules[1].mandatoryElective).toBe("E");
  });

  it("resolves stage and semester from version structure", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [makeModule()],
        versions: [
          makeVersion({
            stages: [
              {
                id: "stage-1",
                name: "Year 1",
                modules: [{ moduleId: "mod-1", semester: "1" }],
              },
            ],
          }),
        ],
      }),
    );
    expect(data.modules[0].stage).toBe("Year 1");
    expect(data.modules[0].semester).toBe("1");
  });

  it("uses module-level stage/semester when set", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [makeModule({ stage: 2, semester: 1 })],
      }),
    );
    expect(data.modules[0].stage).toBe("2");
    expect(data.modules[0].semester).toBe("1");
  });

  it("returns empty modules array when no modules", () => {
    const data = buildDescriptorData(makeProgramme({ modules: [] }));
    expect(data.modules).toEqual([]);
  });
});

// ============================================================================
// Tests: Effort Hours
// ============================================================================

describe("buildDescriptorData — effort hours", () => {
  it("maps effort hours from first version key", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [
          makeModule({
            effortHours: {
              "ver-1_On-site": {
                classroomHours: 24,
                directedElearningHours: 10,
                independentLearningHours: 50,
                workBasedHours: 0,
                mentoringHours: 2,
                otherContactHours: 0,
                otherHours: 0,
              },
            },
          }),
        ],
      }),
    );
    const mod = data.modules[0];
    expect(mod.effortOnsite).toBe("24");
    expect(mod.effortAsync).toBe("10");
    expect(mod.effortIndependent).toBe("50");
    expect(mod.effortWorkBased).toBe("");
    expect(mod.effortTotal).toBe("86");
  });

  it("handles missing effort hours", () => {
    const data = buildDescriptorData(
      makeProgramme({ modules: [makeModule({ effortHours: undefined })] }),
    );
    const mod = data.modules[0];
    expect(mod.effortOnsite).toBe("");
    expect(mod.effortTotal).toBe("");
  });
});

// ============================================================================
// Tests: Assessment Percentages
// ============================================================================

describe("buildDescriptorData — assessment percentages", () => {
  it("classifies and sums assessment percentages", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [
          makeModule({
            assessments: [
              { id: "a1", type: "Continuous Assessment", weighting: 40 },
              { id: "a2", type: "Exam (On-Campus)", weighting: 60 },
            ],
          }),
        ],
      }),
    );
    const mod = data.modules[0];
    expect(mod.assessContinuous).toBe("40%");
    expect(mod.assessExamInPerson).toBe("60%");
    expect(mod.assessProject).toBe("");
  });

  it("handles modules with no assessments", () => {
    const data = buildDescriptorData(makeProgramme({ modules: [makeModule({ assessments: [] })] }));
    const mod = data.modules[0];
    expect(mod.assessContinuous).toBe("");
    expect(mod.assessExamInPerson).toBe("");
  });
});

// ============================================================================
// Tests: Nested MIMLOs
// ============================================================================

describe("buildDescriptorData — nested MIMLOs", () => {
  it("maps MIMLOs with index and text", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [
          makeModule({
            mimlos: [
              { id: "mimlo-1", text: "Describe algorithms" },
              { id: "mimlo-2", text: "Implement solutions" },
            ],
          }),
        ],
      }),
    );
    expect(data.modules[0].mimlos).toHaveLength(2);
    expect(data.modules[0].mimlos[0]).toEqual({
      index: 1,
      text: "Describe algorithms",
      relatedPlos: "",
    });
    expect(data.modules[0].mimlos[1].index).toBe(2);
  });

  it("includes related PLOs for MIMLOs", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [makePlo({ id: "plo-1" }), makePlo({ id: "plo-2", text: "Design solutions" })],
        modules: [
          makeModule({
            mimlos: [{ id: "mimlo-1", text: "Describe algorithms" }],
          }),
        ],
        ploToMimlos: {
          "plo-1": ["mimlo-1"],
          "plo-2": ["mimlo-1"],
        },
      }),
    );
    expect(data.modules[0].mimlos[0].relatedPlos).toBe("PLO 1, PLO 2");
  });
});

// ============================================================================
// Tests: Nested Assessments
// ============================================================================

describe("buildDescriptorData — nested assessments", () => {
  it("maps assessment type and weighting", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [
          makeModule({
            assessments: [
              { id: "a1", type: "Continuous Assessment", weighting: 60 },
              { id: "a2", type: "Project", weighting: 40 },
            ],
          }),
        ],
      }),
    );
    expect(data.modules[0].assessments).toHaveLength(2);
    expect(data.modules[0].assessments[0]).toEqual({
      mimloText: "",
      type: "Continuous Assessment",
      weighting: 60,
    });
  });

  it("includes MIMLO text for assessments linked to MIMLOs", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [
          makeModule({
            mimlos: [
              { id: "mimlo-1", text: "Outcome 1" },
              { id: "mimlo-2", text: "Outcome 2" },
            ],
            assessments: [
              { id: "a1", type: "CA", weighting: 50, mimloIds: ["mimlo-1", "mimlo-2"] },
            ],
          }),
        ],
      }),
    );
    expect(data.modules[0].assessments[0].mimloText).toBe("MIMLO 1, MIMLO 2");
  });
});

// ============================================================================
// Tests: Reading List
// ============================================================================

describe("buildDescriptorData — reading list", () => {
  it("formats reading list as text", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [
          makeModule({
            readingList: [
              { id: "r1", citation: "Smith, J. (2020). Book Title.", isCore: true },
              { id: "r2", citation: "Jones, A. (2019). Another Book.", isCore: false },
            ],
          }),
        ],
      }),
    );
    expect(data.modules[0].readingListText).toBe(
      "[Core] Smith, J. (2020). Book Title.\nJones, A. (2019). Another Book.",
    );
  });

  it("falls back to title when citation is missing", () => {
    const data = buildDescriptorData(
      makeProgramme({
        modules: [
          makeModule({
            readingList: [{ id: "r1", title: "My Book" }],
          }),
        ],
      }),
    );
    expect(data.modules[0].readingListText).toBe("My Book");
  });

  it("handles empty reading list", () => {
    const data = buildDescriptorData(makeProgramme({ modules: [makeModule({ readingList: [] })] }));
    expect(data.modules[0].readingListText).toBe("");
  });
});

// ============================================================================
// Tests: PLO Assessment Map (Section 6.8)
// ============================================================================

describe("buildDescriptorData — PLO assessment map", () => {
  it("maps PLO to modules and assessment techniques", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [makePlo({ id: "plo-1" })],
        modules: [
          makeModule({
            mimlos: [{ id: "mimlo-1", text: "Describe" }],
            assessments: [{ id: "a1", type: "CA", weighting: 60, mimloIds: ["mimlo-1"] }],
          }),
        ],
        ploToMimlos: { "plo-1": ["mimlo-1"] },
      }),
    );
    expect(data.ploAssessmentMap).toHaveLength(1);
    const plo = data.ploAssessmentMap[0];
    expect(plo.index).toBe(1);
    expect(plo.moduleMimloText).toContain("COMP101");
    expect(plo.moduleMimloText).toContain("MIMLO 1");
    expect(plo.assessmentTechniques).toBe("CA");
    expect(plo.weightings).toContain("60%");
  });

  it("returns empty PLO map when no PLOs", () => {
    const data = buildDescriptorData(makeProgramme({ plos: [] }));
    expect(data.ploAssessmentMap).toEqual([]);
  });

  it("includes weightings with module code and assessment details", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [makePlo({ id: "plo-1" })],
        modules: [
          makeModule({
            code: "CS200",
            mimlos: [{ id: "mimlo-1", text: "Outcome" }],
            assessments: [
              { id: "a1", type: "Exam", weighting: 70, mimloIds: ["mimlo-1"] },
              { id: "a2", type: "CA", weighting: 30, mimloIds: ["mimlo-1"] },
            ],
          }),
        ],
        ploToMimlos: { "plo-1": ["mimlo-1"] },
      }),
    );
    const plo = data.ploAssessmentMap[0];
    expect(plo.assessmentTechniques).toContain("Exam");
    expect(plo.assessmentTechniques).toContain("CA");
    expect(plo.weightings).toContain("CS200: Exam 70%");
    expect(plo.weightings).toContain("CS200: CA 30%");
  });

  it("falls back to module title when code is empty", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [makePlo({ id: "plo-1" })],
        modules: [
          makeModule({
            code: "",
            title: "Databases",
            mimlos: [{ id: "mimlo-1", text: "Outcome" }],
            assessments: [{ id: "a1", type: "CA", weighting: 100, mimloIds: ["mimlo-1"] }],
          }),
        ],
        ploToMimlos: { "plo-1": ["mimlo-1"] },
      }),
    );
    const plo = data.ploAssessmentMap[0];
    expect(plo.moduleMimloText).toContain("Databases");
    expect(plo.weightings).toContain("Databases:");
  });

  it("skips assessments with no matching mimloIds", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [makePlo({ id: "plo-1" })],
        modules: [
          makeModule({
            mimlos: [{ id: "mimlo-1", text: "Outcome" }],
            assessments: [
              { id: "a1", type: "CA", weighting: 50 },
              { id: "a2", type: "Exam", weighting: 50, mimloIds: ["mimlo-other"] },
            ],
          }),
        ],
        ploToMimlos: { "plo-1": ["mimlo-1"] },
      }),
    );
    const plo = data.ploAssessmentMap[0];
    expect(plo.assessmentTechniques).toBe("");
    expect(plo.weightings).toBe("");
  });

  it("handles null assessment type and weighting", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [makePlo({ id: "plo-1" })],
        modules: [
          makeModule({
            mimlos: [{ id: "mimlo-1", text: "Outcome" }],
            assessments: [{ id: "a1", mimloIds: ["mimlo-1"] } as never],
          }),
        ],
        ploToMimlos: { "plo-1": ["mimlo-1"] },
      }),
    );
    const plo = data.ploAssessmentMap[0];
    expect(plo.assessmentTechniques).toBe("");
    expect(plo.weightings).toContain("0%");
  });
});

// ============================================================================
// Tests: Appendix 1 Strand Mappings
// ============================================================================

describe("buildDescriptorData — strand mappings", () => {
  it("maps PLOs to knowledge strand", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [
          makePlo({
            id: "plo-1",
            text: "Knowledge outcome",
            standardMappings: [{ thread: "Knowledge: Breadth", criteria: "C1" }],
          }),
        ],
        modules: [
          makeModule({
            mimlos: [{ id: "mimlo-1", text: "Learn stuff" }],
          }),
        ],
        ploToMimlos: { "plo-1": ["mimlo-1"] },
      }),
    );
    expect(data.mapping_knowledge_breadth_plos).toContain("PLO 1: Knowledge outcome");
    expect(data.mapping_knowledge_breadth_evidence).toContain("COMP101");
  });

  it("maps PLOs to competence-insight strand", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [
          makePlo({
            id: "plo-1",
            standardMappings: [{ thread: "Insight", criteria: "C1" }],
          }),
        ],
      }),
    );
    expect(data.mapping_competence_insight_plos).toContain("PLO 1");
  });

  it("returns empty strings for unmatched strands", () => {
    const data = buildDescriptorData(makeProgramme({ plos: [] }));
    expect(data.mapping_knowledge_breadth_plos).toBe("");
    expect(data.mapping_competence_role_evidence).toBe("");
  });

  it("maps PLOs to multiple strands simultaneously", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [
          makePlo({
            id: "plo-1",
            text: "Multi-strand PLO",
            standardMappings: [
              { thread: "Knowledge: Breadth", criteria: "C1" },
              { thread: "Competence: Role", criteria: "C2" },
            ],
          }),
        ],
        modules: [
          makeModule({
            mimlos: [{ id: "mimlo-1", text: "Outcome" }],
          }),
        ],
        ploToMimlos: { "plo-1": ["mimlo-1"] },
      }),
    );
    expect(data.mapping_knowledge_breadth_plos).toContain("PLO 1");
    expect(data.mapping_competence_role_plos).toContain("PLO 1");
    expect(data.mapping_knowledge_breadth_evidence).toContain("COMP101");
    expect(data.mapping_competence_role_evidence).toContain("COMP101");
  });

  it("maps Know-how & Skill strand", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [
          makePlo({
            id: "plo-1",
            text: "Skill outcome",
            standardMappings: [{ thread: "Know-How & Skill", criteria: "C1" }],
          }),
        ],
      }),
    );
    expect(data.mapping_knowhow_skill_plos).toContain("PLO 1");
  });

  it("maps Context, Learning-to-Learn strands", () => {
    const data = buildDescriptorData(
      makeProgramme({
        plos: [
          makePlo({
            id: "plo-1",
            text: "Context outcome",
            standardMappings: [{ thread: "Competence: Context", criteria: "C1" }],
          }),
          makePlo({
            id: "plo-2",
            text: "Learning outcome",
            standardMappings: [{ thread: "Competence: Learning to Learn", criteria: "C1" }],
          }),
        ],
      }),
    );
    expect(data.mapping_competence_context_plos).toContain("PLO 1");
    expect(data.mapping_competence_learning_plos).toContain("PLO 2");
  });
});

// ============================================================================
// Tests: Full Integration
// ============================================================================

describe("buildDescriptorData — full programme", () => {
  it("produces complete data for a fully populated programme", () => {
    const data = buildDescriptorData(
      makeProgramme({
        title: "BSc Computing",
        awardType: "Major",
        nfqLevel: 8,
        totalCredits: 240,
        awardStandardNames: ["Computing"],
        plos: [
          makePlo({
            id: "plo-1",
            text: "Analyse computing problems",
            standardMappings: [{ thread: "Knowledge: Breadth", criteria: "C1" }],
          }),
        ],
        modules: [
          makeModule({
            id: "mod-1",
            code: "COMP101",
            title: "Software Engineering",
            credits: 10,
            isElective: false,
            mimlos: [{ id: "mimlo-1", text: "Describe algorithms" }],
            assessments: [
              { id: "a1", type: "Continuous Assessment", weighting: 60, mimloIds: ["mimlo-1"] },
              { id: "a2", type: "Project", weighting: 40 },
            ],
            readingList: [
              { id: "r1", citation: "Pressman, R. Software Engineering.", isCore: true },
            ],
            effortHours: {
              "ver-1_On-site": {
                classroomHours: 24,
                independentLearningHours: 76,
              },
            },
          }),
        ],
        versions: [
          makeVersion({
            stages: [
              {
                id: "s1",
                name: "Year 1",
                modules: [{ moduleId: "mod-1", semester: "1" }],
              },
            ],
          }),
        ],
        ploToMimlos: { "plo-1": ["mimlo-1"] },
      }),
    );

    // Simple fields
    expect(data.programme_title).toBe("BSc Computing");
    expect(data.nfq_level).toBe("8");
    expect(data.ects).toBe("240");

    // Module
    expect(data.modules).toHaveLength(1);
    const mod = data.modules[0];
    expect(mod.code).toBe("COMP101");
    expect(mod.stage).toBe("Year 1");
    expect(mod.semester).toBe("1");
    expect(mod.mandatoryElective).toBe("M");
    expect(mod.effortOnsite).toBe("24");
    expect(mod.effortIndependent).toBe("76");
    expect(mod.assessContinuous).toBe("60%");
    expect(mod.assessProject).toBe("40%");
    expect(mod.mimlos).toHaveLength(1);
    expect(mod.mimlos[0].relatedPlos).toBe("PLO 1");
    expect(mod.assessments).toHaveLength(2);
    expect(mod.readingListText).toContain("[Core] Pressman");

    // PLO assessment map
    expect(data.ploAssessmentMap).toHaveLength(1);
    expect(data.ploAssessmentMap[0].moduleMimloText).toContain("COMP101");

    // Strand mappings
    expect(data.mapping_knowledge_breadth_plos).toContain("PLO 1");
  });

  it("handles minimal/empty programme", () => {
    const data = buildDescriptorData(makeProgramme());
    expect(data.programme_title).toBe("BSc in Computing");
    expect(data.modules).toEqual([]);
    expect(data.ploAssessmentMap).toEqual([]);
    expect(data.miplos).toBe("");
  });
});
