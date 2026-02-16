import { describe, expect, it } from "vitest";

import { renderAllModuleDescriptors, renderModuleDescriptor } from "./module-descriptors-html";

function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    schemaVersion: 1,
    id: "prog1",
    title: "BSc Computing",
    awardType: "Honours Bachelor Degree",
    awardTypeIsOther: false,
    nfqLevel: 8,
    school: "School of Computing",
    awardStandardIds: [],
    awardStandardNames: [],
    totalCredits: 60,
    electiveDefinitions: [],
    ...overrides,
  } as Programme;
}

function makeVersion(overrides: Partial<ProgrammeVersion> = {}): ProgrammeVersion {
  return {
    id: "v1",
    label: "Full-Time",
    code: "FT",
    deliveryModality: "F2F",
    ...overrides,
  } as ProgrammeVersion;
}

function makeStage(overrides: Partial<Stage> = {}): Stage {
  return {
    id: "s1",
    name: "Year 1",
    creditsTarget: 60,
    modules: [],
    ...overrides,
  } as Stage;
}

function makeModule(overrides: Partial<Module> = {}): Module {
  return {
    id: "mod1",
    title: "Intro to Programming",
    code: "COMP101",
    credits: 5,
    ...overrides,
  } as Module;
}

describe("renderModuleDescriptor", () => {
  it("produces HTML with module code and title", () => {
    const mod = makeModule({ code: "COMP201", title: "Data Structures" });
    const html = renderModuleDescriptor(makeProgramme(), mod, makeVersion(), makeStage(), {});
    expect(html).toContain("COMP201");
    expect(html).toContain("Data Structures");
  });

  it("includes MIMLO table with learning outcomes", () => {
    const mod = makeModule({
      mimlos: [
        { id: "m1", text: "Explain algorithms" },
        { id: "m2", text: "Implement sorting" },
      ],
    });
    const html = renderModuleDescriptor(makeProgramme(), mod, makeVersion(), makeStage(), {});
    expect(html).toContain("Explain algorithms");
    expect(html).toContain("Implement sorting");
    expect(html).toContain("mimlo-table");
    expect(html).toContain("1. Explain algorithms");
    expect(html).toContain("2. Implement sorting");
  });

  it("includes assessment techniques table", () => {
    const mod = makeModule({
      assessments: [
        { id: "a1", type: "Exam (On-Campus)", weighting: 40 },
        { id: "a2", type: "Essay", weighting: 30 },
        { id: "a3", type: "Project Submission", weighting: 30 },
      ],
    });
    const html = renderModuleDescriptor(makeProgramme(), mod, makeVersion(), makeStage(), {});
    expect(html).toContain("assessment-table");
    // Invigilated exam 40%, continuous 30%, project 30%
    expect(html).toContain("Continuous Assessment");
    expect(html).toContain("Proctored Exam");
  });

  it("renders effort hours correctly", () => {
    const mod = makeModule({
      effortHours: {
        v1_F2F: {
          classroomHours: 24,
          mentoringHours: 6,
          otherContactHours: 0,
          directedElearningHours: 10,
          independentLearningHours: 80,
          workBasedHours: 0,
          otherHours: 5,
        },
      },
    });
    const html = renderModuleDescriptor(
      makeProgramme(),
      mod,
      makeVersion({ id: "v1", deliveryModality: "F2F" }),
      makeStage(),
      {},
    );
    expect(html).toContain("24"); // classroom hours
    expect(html).toContain("80"); // independent hours
    expect(html).toContain("125"); // total = 24+6+0+10+80+0+5
  });

  it("renders summative assessment table with MIMLO mapping", () => {
    const mod = makeModule({
      mimlos: [
        { id: "m1", text: "LO1" },
        { id: "m2", text: "LO2" },
      ],
      assessments: [
        { id: "a1", type: "Essay", title: "Essay 1", weighting: 50, mimloIds: ["m1", "m2"] },
        {
          id: "a2",
          type: "Exam (On-Campus)",
          title: "Final Exam",
          weighting: 50,
          mimloIds: ["m1"],
        },
      ],
    });
    const html = renderModuleDescriptor(makeProgramme(), mod, makeVersion(), makeStage(), {});
    expect(html).toContain("summative-table");
    expect(html).toContain("Essay 1");
    expect(html).toContain("Final Exam");
    expect(html).toContain("50%");
    // MIMLO nums for Essay 1: mapped to m1 (1) and m2 (2)
    expect(html).toContain("1, 2");
  });

  it("renders reading list", () => {
    const mod = makeModule({
      readingList: [
        { id: "r1", citation: "Smith, J. (2020). Algorithms. Publisher." },
        { id: "r2", author: "Doe", year: "2021", title: "Data Science", publisher: "Pub" },
      ],
    });
    const html = renderModuleDescriptor(makeProgramme(), mod, makeVersion(), makeStage(), {});
    expect(html).toContain("Smith, J. (2020). Algorithms. Publisher.");
    expect(html).toContain("Doe (2021). Data Science. Pub.");
    expect(html).toContain("Indicative reading lists");
  });

  it("renders PLO-to-MIMLO mapping in descriptor", () => {
    const mod = makeModule({
      mimlos: [
        { id: "m1", text: "Understand basics" },
        { id: "m2", text: "Apply concepts" },
      ],
    });
    const programme = makeProgramme({
      plos: [
        { id: "plo1", text: "PLO One" },
        { id: "plo2", text: "PLO Two" },
      ],
      ploToMimlos: {
        plo1: ["m1"],
        plo2: ["m1", "m2"],
      },
    });
    const html = renderModuleDescriptor(programme, mod, makeVersion(), makeStage(), {});
    // MIMLO m1 is mapped to plo1 (pos 1) and plo2 (pos 2)
    expect(html).toContain("1, 2");
    // MIMLO m2 is mapped to plo2 (pos 2) only
    expect(html).toMatch(/<td>2<\/td>/);
  });

  it("renders semester from stageModule", () => {
    const html = renderModuleDescriptor(makeProgramme(), makeModule(), makeVersion(), makeStage(), {
      semester: "S2",
    });
    expect(html).toContain("S2");
  });

  it("marks elective modules with E", () => {
    const mod = makeModule({ isElective: true });
    const html = renderModuleDescriptor(makeProgramme(), mod, makeVersion(), makeStage(), {});
    expect(html).toContain(">E<");
  });

  it("marks mandatory modules with M", () => {
    const mod = makeModule({ isElective: false });
    const html = renderModuleDescriptor(makeProgramme(), mod, makeVersion(), makeStage(), {});
    expect(html).toContain(">M<");
  });
});

describe("renderAllModuleDescriptors", () => {
  it("renders descriptors for modules with versions", () => {
    const mod = makeModule({ id: "mod1", code: "COMP101", title: "Intro" });
    const stage = makeStage({ modules: [{ moduleId: "mod1", semester: "S1" }] });
    const version = makeVersion({ stages: [stage] });
    const programme = makeProgramme({ modules: [mod], versions: [version] });
    const html = renderAllModuleDescriptors(programme);
    expect(html).toContain("COMP101");
    expect(html).toContain("Intro");
    expect(html).toContain("module-table");
  });

  it("returns no modules message when modules is empty", () => {
    const html = renderAllModuleDescriptors(makeProgramme({ modules: [] }));
    expect(html).toBe("<p>No modules available.</p>");
  });

  it("returns no modules message when modules is undefined", () => {
    const html = renderAllModuleDescriptors(makeProgramme({ modules: undefined }));
    expect(html).toBe("<p>No modules available.</p>");
  });

  it("returns no versions message when versions is empty", () => {
    const mod = makeModule();
    const html = renderAllModuleDescriptors(makeProgramme({ modules: [mod], versions: [] }));
    expect(html).toBe("<p>No programme versions available.</p>");
  });

  it("returns no versions message when versions is undefined", () => {
    const mod = makeModule();
    const html = renderAllModuleDescriptors(makeProgramme({ modules: [mod], versions: undefined }));
    expect(html).toBe("<p>No programme versions available.</p>");
  });

  it("adds page breaks between multiple modules", () => {
    const mod1 = makeModule({ id: "mod1", title: "Module A" });
    const mod2 = makeModule({ id: "mod2", title: "Module B" });
    const stage = makeStage({
      modules: [{ moduleId: "mod1" }, { moduleId: "mod2" }],
    });
    const version = makeVersion({ stages: [stage] });
    const programme = makeProgramme({ modules: [mod1, mod2], versions: [version] });
    const html = renderAllModuleDescriptors(programme);
    expect(html).toContain('class="page-break"');
    expect(html).toContain("Module A");
    expect(html).toContain("Module B");
  });

  it("handles modules not assigned to any stage", () => {
    const mod = makeModule({ id: "mod1", title: "Unassigned Module" });
    const version = makeVersion({ stages: [makeStage({ modules: [] })] });
    const programme = makeProgramme({ modules: [mod], versions: [version] });
    const html = renderAllModuleDescriptors(programme);
    expect(html).toContain("Unassigned Module");
    expect(html).toContain("module-table");
  });
});
