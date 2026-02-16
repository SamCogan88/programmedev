import { describe, expect, it, vi } from "vitest";

import {
  ASSESSMENT_REPORT_TYPES,
  buildAssessmentReportHtml,
  openReportInNewTab,
  reportByModule,
  reportByStageType,
  reportCoverage,
} from "./assessment-reports";
import type { Programme } from "../types";

/** Minimal programme fixture for testing. */
function makeProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    schemaVersion: 1,
    id: "prg_1",
    title: "Test Programme",
    awardType: "Honours Bachelor Degree",
    awardTypeIsOther: false,
    nfqLevel: 8,
    school: "Computing",
    awardStandardIds: [],
    awardStandardNames: [],
    totalCredits: 60,
    electiveDefinitions: [],
    ...overrides,
  };
}

describe("ASSESSMENT_REPORT_TYPES", () => {
  it("has 3 entries", () => {
    expect(ASSESSMENT_REPORT_TYPES).toHaveLength(3);
  });
});

describe("reportByStageType", () => {
  it("renders stage-grouped assessment table", () => {
    const p = makeProgramme({
      modules: [
        {
          id: "m1",
          title: "Mod A",
          code: "MA",
          credits: 5,
          assessments: [
            { id: "a1", type: "Exam", weighting: 60, mimloIds: [] },
            { id: "a2", type: "CA", weighting: 40, mimloIds: [] },
          ],
        },
      ],
      versions: [
        {
          id: "v1",
          label: "FT",
          code: "FT",
          stages: [
            {
              id: "s1",
              name: "Year 1",
              modules: [{ moduleId: "m1" }],
            },
          ],
        },
      ],
    });

    const html = reportByStageType(p, "v1");
    expect(html).toContain("Year 1");
    expect(html).toContain("Exam");
    expect(html).toContain("CA");
    expect(html).toContain("60%");
    expect(html).toContain("40%");
  });

  it("handles no versions", () => {
    const p = makeProgramme({ versions: [] });
    const html = reportByStageType(p, "v1");
    expect(html).toContain("No versions found");
  });
});

describe("reportByModule", () => {
  it("renders module-grouped table", () => {
    const p = makeProgramme({
      modules: [
        {
          id: "m1",
          title: "Database Systems",
          code: "DB01",
          credits: 10,
          assessments: [
            { id: "a1", type: "Exam", weighting: 50, mimloIds: [] },
            { id: "a2", type: "Project", weighting: 50, mimloIds: [] },
          ],
        },
      ],
    });

    const html = reportByModule(p);
    expect(html).toContain("DB01");
    expect(html).toContain("Database Systems");
    expect(html).toContain("Exam");
    expect(html).toContain("Project");
  });

  it("handles no modules", () => {
    const p = makeProgramme({ modules: [] });
    const html = reportByModule(p);
    expect(html).toContain("No modules.");
  });
});

describe("reportCoverage", () => {
  it("shows unassessed MIMLOs", () => {
    const p = makeProgramme({
      modules: [
        {
          id: "m1",
          title: "Mod A",
          code: "MA",
          credits: 5,
          mimlos: [
            { id: "mi1", text: "Outcome 1" },
            { id: "mi2", text: "Outcome 2" },
          ],
          assessments: [{ id: "a1", type: "Exam", weighting: 100, mimloIds: ["mi1"] }],
        },
      ],
    });

    const html = reportCoverage(p);
    expect(html).toContain("Unassessed MIMLOs (1)");
    expect(html).toContain("Outcome 2");
    expect(html).not.toContain("All MIMLOs assessed");
  });

  it('shows "All MIMLOs assessed" for covered modules', () => {
    const p = makeProgramme({
      modules: [
        {
          id: "m1",
          title: "Mod A",
          code: "MA",
          credits: 5,
          mimlos: [{ id: "mi1", text: "Outcome 1" }],
          assessments: [{ id: "a1", type: "Exam", weighting: 100, mimloIds: ["mi1"] }],
        },
      ],
    });

    const html = reportCoverage(p);
    expect(html).toContain("All MIMLOs assessed");
  });
});

describe("buildAssessmentReportHtml", () => {
  it("dispatches to correct report", () => {
    const p = makeProgramme({
      modules: [
        {
          id: "m1",
          title: "Mod",
          code: "M1",
          credits: 5,
          assessments: [{ id: "a1", type: "Exam", weighting: 100, mimloIds: [] }],
        },
      ],
    });

    const byModule = buildAssessmentReportHtml(p, "byModule", "v1");
    expect(byModule).toContain("By module");

    const coverage = buildAssessmentReportHtml(p, "coverage", "v1");
    expect(coverage).toContain("M1");
  });

  it("returns default for unknown ID", () => {
    const p = makeProgramme();
    const html = buildAssessmentReportHtml(p, "unknown", "v1");
    expect(html).toContain("Select a report.");
  });
});

describe("openReportInNewTab", () => {
  it("opens a new window and writes HTML", () => {
    const mockDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
    };
    const mockWindow = { document: mockDoc };
    vi.spyOn(window, "open").mockReturnValue(mockWindow as unknown as Window);

    openReportInNewTab("<p>Test</p>", "My Report");

    expect(window.open).toHaveBeenCalledWith("", "_blank");
    expect(mockDoc.open).toHaveBeenCalled();
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining("<p>Test</p>"));
    expect(mockDoc.write).toHaveBeenCalledWith(expect.stringContaining("My Report"));
    expect(mockDoc.close).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it("alerts when popup is blocked", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    vi.spyOn(window, "alert").mockImplementation(() => {});

    openReportInNewTab("<p>Test</p>");

    expect(window.alert).toHaveBeenCalledWith(
      "Popup blocked. Allow popups to open report in a new tab.",
    );

    vi.restoreAllMocks();
  });
});
