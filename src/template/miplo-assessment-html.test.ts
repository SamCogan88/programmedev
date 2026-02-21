import { describe, expect, it } from "vitest";

import type { Programme } from "../types";
import { renderAllMiploAssessments, renderMiploAssessmentTable } from "./miplo-assessment-html";

function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    schemaVersion: 5,
    id: "prog1",
    title: "Test Programme",
    awardType: "Major",
    awardTypeIsOther: false,
    nfqLevel: 8,
    school: "Computing",
    awardStandardIds: [],
    awardStandardNames: [],
    totalCredits: 60,
    electiveDefinitions: [],
    modules: [],
    plos: [],
    ploToMimlos: {},
    versions: [],
    ...overrides,
  };
}

describe("renderMiploAssessmentTable", () => {
  it("returns a message when no PLOs are defined", () => {
    const html = renderMiploAssessmentTable(makeProgramme({ plos: [] }));
    expect(html).toContain("No MIPLOs");
  });

  it("renders the table header with Section 6.8 title", () => {
    const html = renderMiploAssessmentTable(
      makeProgramme({
        plos: [{ id: "plo1", text: "Analyse data" }],
      }),
    );
    expect(html).toContain("6.8");
    expect(html).toContain("Assessment Strategy aligned to MIPLOs");
    expect(html).toContain("MIPLO #");
    expect(html).toContain("Identify which Modules (M) and MIMLO(s) address this MIPLO");
    expect(html).toContain("Assessment Technique(s)");
    expect(html).toContain("Weighting per Assessment Instrument");
  });

  it("renders a PLO with no linked assessments as a single empty row", () => {
    const html = renderMiploAssessmentTable(
      makeProgramme({
        plos: [{ id: "plo1", text: "Design systems" }],
        ploToMimlos: {},
      }),
    );
    expect(html).toContain("Design systems");
    expect(html).toContain(">1. Design systems</");
  });

  it("renders a PLO linked to a single module/assessment", () => {
    const html = renderMiploAssessmentTable(
      makeProgramme({
        plos: [{ id: "plo1", text: "Analyse data" }],
        modules: [
          {
            id: "mod1",
            code: "CS101",
            title: "Intro CS",
            credits: 10,
            mimlos: [{ id: "mimlo1", text: "Describe algorithms" }],
            assessments: [
              { id: "a1", type: "CA", title: "Assignment 1", weighting: 60, mimloIds: ["mimlo1"] },
            ],
          },
        ],
        ploToMimlos: { plo1: ["mimlo1"] },
      }),
    );
    expect(html).toContain("Analyse data");
    expect(html).toContain("CS101-MIMLO1");
    expect(html).toContain("Assignment 1");
    expect(html).toContain("60%");
  });

  it("combines multiple assessments per module in a single row", () => {
    const html = renderMiploAssessmentTable(
      makeProgramme({
        plos: [{ id: "plo1", text: "Solve problems" }],
        modules: [
          {
            id: "mod1",
            code: "CS101",
            title: "Intro CS",
            credits: 10,
            mimlos: [{ id: "mimlo1", text: "Outcome 1" }],
            assessments: [
              { id: "a1", type: "CA", title: "CA 1", weighting: 40, mimloIds: ["mimlo1"] },
              { id: "a2", type: "Exam", title: "Final Exam", weighting: 60, mimloIds: ["mimlo1"] },
            ],
          },
        ],
        ploToMimlos: { plo1: ["mimlo1"] },
      }),
    );
    // Single module = no rowspan needed
    expect(html).not.toContain("rowspan");
    expect(html).toContain("CS101-MIMLO1");
    // Assessments combined with <br>
    expect(html).toContain("CA 1<br><br>Final Exam");
    expect(html).toContain("40%<br><br>60%");
  });

  it("renders entries from multiple modules for a single MIPLO", () => {
    const html = renderMiploAssessmentTable(
      makeProgramme({
        plos: [{ id: "plo1", text: "Design software" }],
        modules: [
          {
            id: "mod1",
            code: "CS101",
            title: "Intro",
            credits: 10,
            mimlos: [{ id: "m1", text: "Outcome A" }],
            assessments: [
              { id: "a1", type: "Project", title: "Project", weighting: 50, mimloIds: ["m1"] },
            ],
          },
          {
            id: "mod2",
            code: "CS201",
            title: "Advanced",
            credits: 10,
            mimlos: [{ id: "m2", text: "Outcome B" }],
            assessments: [
              { id: "a2", type: "Exam", title: "Exam", weighting: 70, mimloIds: ["m2"] },
            ],
          },
        ],
        ploToMimlos: { plo1: ["m1", "m2"] },
      }),
    );
    expect(html).toContain('rowspan="2"');
    expect(html).toContain("CS101-MIMLO1");
    expect(html).toContain("CS201-MIMLO1");
    expect(html).toContain("50%");
    expect(html).toContain("70%");
  });

  it("shows multiple MIMLO numbers when assessment covers several MIMLOs", () => {
    const html = renderMiploAssessmentTable(
      makeProgramme({
        plos: [{ id: "plo1", text: "Broad outcome" }],
        modules: [
          {
            id: "mod1",
            code: "CS101",
            title: "Mod",
            credits: 10,
            mimlos: [
              { id: "m1", text: "Outcome 1" },
              { id: "m2", text: "Outcome 2" },
            ],
            assessments: [
              {
                id: "a1",
                type: "CA",
                title: "Assignment",
                weighting: 100,
                mimloIds: ["m1", "m2"],
              },
            ],
          },
        ],
        ploToMimlos: { plo1: ["m1", "m2"] },
      }),
    );
    expect(html).toContain("CS101-MIMLO1, MIMLO2");
    expect(html).toContain("100%");
  });

  it("renders multiple PLOs each with their own entries", () => {
    const html = renderMiploAssessmentTable(
      makeProgramme({
        plos: [
          { id: "plo1", text: "PLO One" },
          { id: "plo2", text: "PLO Two" },
        ],
        modules: [
          {
            id: "mod1",
            code: "CS101",
            title: "Module 1",
            credits: 10,
            mimlos: [
              { id: "m1", text: "M1" },
              { id: "m2", text: "M2" },
            ],
            assessments: [
              { id: "a1", type: "CA", title: "CA", weighting: 50, mimloIds: ["m1"] },
              { id: "a2", type: "Exam", title: "Exam", weighting: 50, mimloIds: ["m2"] },
            ],
          },
        ],
        ploToMimlos: { plo1: ["m1"], plo2: ["m2"] },
      }),
    );
    expect(html).toContain("PLO One");
    expect(html).toContain("PLO Two");
    expect(html).toContain(">1. PLO One</");
    expect(html).toContain(">2. PLO Two</");
  });

  it("falls back to module title when code is empty", () => {
    const html = renderMiploAssessmentTable(
      makeProgramme({
        plos: [{ id: "plo1", text: "Outcome" }],
        modules: [
          {
            id: "mod1",
            code: "",
            title: "My Module",
            credits: 10,
            mimlos: [{ id: "m1", text: "O1" }],
            assessments: [
              { id: "a1", type: "CA", title: "Task", weighting: 100, mimloIds: ["m1"] },
            ],
          },
        ],
        ploToMimlos: { plo1: ["m1"] },
      }),
    );
    expect(html).toContain("My Module-MIMLO1");
  });

  it("only includes assessments that assess relevant MIMLOs", () => {
    const html = renderMiploAssessmentTable(
      makeProgramme({
        plos: [{ id: "plo1", text: "Targeted outcome" }],
        modules: [
          {
            id: "mod1",
            code: "CS101",
            title: "Mod",
            credits: 10,
            mimlos: [
              { id: "m1", text: "Relevant" },
              { id: "m2", text: "Unrelated" },
            ],
            assessments: [
              {
                id: "a1",
                type: "CA",
                title: "Relevant Assessment",
                weighting: 40,
                mimloIds: ["m1"],
              },
              {
                id: "a2",
                type: "Exam",
                title: "Unrelated Assessment",
                weighting: 60,
                mimloIds: ["m2"],
              },
            ],
          },
        ],
        ploToMimlos: { plo1: ["m1"] },
      }),
    );
    expect(html).toContain("Relevant Assessment");
    expect(html).not.toContain("Unrelated Assessment");
  });

  it("escapes HTML in PLO text and module names", () => {
    const html = renderMiploAssessmentTable(
      makeProgramme({
        plos: [{ id: "plo1", text: "Outcome with <script>alert(1)</script>" }],
        modules: [
          {
            id: "mod1",
            code: "CS<101>",
            title: "Mod",
            credits: 10,
            mimlos: [{ id: "m1", text: "O1" }],
            assessments: [
              { id: "a1", type: "CA", title: "Test <b>bold</b>", weighting: 100, mimloIds: ["m1"] },
            ],
          },
        ],
        ploToMimlos: { plo1: ["m1"] },
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("CS&lt;101&gt;-MIMLO1");
    expect(html).toContain("Test &lt;b&gt;bold&lt;/b&gt;");
  });
});

describe("renderAllMiploAssessments", () => {
  it("delegates to renderMiploAssessmentTable", () => {
    const prog = makeProgramme({
      plos: [{ id: "plo1", text: "Outcome" }],
    });
    const html = renderAllMiploAssessments(prog);
    expect(html).toContain("6.8");
    expect(html).toContain("Outcome");
  });
});
