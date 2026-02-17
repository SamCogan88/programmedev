/**
 * Accessibility tests for step components.
 * Uses vitest-axe (axe-core) to check for ARIA violations,
 * colour contrast issues, and structural accessibility problems
 * in both light and dark mode.
 *
 * Note: heading-order is excluded because step components are rendered
 * in isolation without the full app shell heading hierarchy.
 */

import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import * as vitestAxeMatchers from "vitest-axe/matchers";

// Augment Vitest's Assertion interface with axe matchers
declare module "vitest" {
  interface Assertion {
    toHaveNoViolations(): void;
  }
}

expect.extend(vitestAxeMatchers);

const AXE_OPTIONS = {
  rules: {
    "heading-order": { enabled: false },
  },
};

import { state } from "../../../state/store";
import type { Programme } from "../../../types";
import { IdentityStep } from "./IdentityStep";
import { OutcomesStep } from "./OutcomesStep";
import { StructureStep } from "./StructureStep";
import { VersionsStep } from "./VersionsStep";

// Mock the store module
vi.mock("../../../state/store", async () => {
  const actual = await vi.importActual("../../../state/store");
  return {
    ...actual,
    saveNow: vi.fn(),
    saveDebounced: vi.fn(),
    getAwardStandards: vi.fn().mockResolvedValue([
      { id: "qqi-computing", name: "Computing" },
      { id: "qqi-business", name: "Business" },
    ]),
    getAwardStandard: vi.fn().mockImplementation((id: string) =>
      Promise.resolve({
        id,
        name: id === "qqi-computing" ? "Computing" : "Business",
      }),
    ),
  };
});

vi.mock("../../../utils/uid", () => ({
  uid: vi.fn((prefix: string) => `${prefix}_a11y_${Math.random().toString(36).slice(2, 8)}`),
}));

const baseProgramme: Programme = {
  schemaVersion: 5,
  id: "a11y-test",
  title: "BSc in Computing",
  awardType: "Honours Bachelor Degree",
  awardTypeIsOther: false,
  nfqLevel: 8,
  school: "School of Computing",
  awardStandardIds: [],
  awardStandardNames: [],
  totalCredits: 240,
  intakeMonths: ["September"],
  electiveDefinitions: [],
  modules: [
    {
      id: "mod_a11y_1",
      code: "COMP001",
      title: "Introduction to Programming",
      credits: 10,
      nfqLevel: 8,
      mimlos: [
        {
          id: "mim_a11y_1",
          text: "Demonstrate understanding of programming concepts",
          bloomLevel: "understand",
        },
      ],
      assessments: [
        {
          id: "asm_a11y_1",
          title: "Final Exam",
          type: "Written Examination",
          weighting: 60,
          academicIntegrity: [],
        },
        {
          id: "asm_a11y_2",
          title: "Coursework",
          type: "Assignment",
          weighting: 40,
          academicIntegrity: [],
        },
      ],
      readingList: [],
      effortHours: {},
    },
  ],
  plos: [
    {
      id: "plo_a11y_1",
      text: "Apply computational thinking to solve problems",
      standardMappings: [],
    },
  ],
  ploToMimlos: {},
  versions: [
    {
      id: "ver_a11y_1",
      label: "Full-time",
      code: "FT",
      deliveryModality: "Full-time",
      deliveryPatterns: {},
      durationWeeks: 36,
      teachingWeeks: 12,
      stages: [
        {
          id: "stg_a11y_1",
          title: "Year 1",
          moduleIds: ["mod_a11y_1"],
        },
      ],
    },
  ],
} as Programme;

function setTheme(mode: "light" | "dark") {
  document.documentElement.setAttribute("data-bs-theme", mode);
}

describe("Accessibility (axe)", () => {
  beforeEach(() => {
    state.programme = { ...baseProgramme };
    state.selectedVersionId = "ver_a11y_1";
  });

  describe.each(["light", "dark"] as const)("%s mode", (theme) => {
    beforeEach(() => {
      setTheme(theme);
    });

    it("IdentityStep has no accessibility violations", async () => {
      const { container } = render(<IdentityStep />);
      const results = await axe(container, AXE_OPTIONS);
      expect(results).toHaveNoViolations();
    });

    it("OutcomesStep has no accessibility violations", async () => {
      const { container } = render(<OutcomesStep />);
      const results = await axe(container, AXE_OPTIONS);
      expect(results).toHaveNoViolations();
    });

    it("VersionsStep has no accessibility violations", async () => {
      const { container } = render(<VersionsStep />);
      const results = await axe(container, AXE_OPTIONS);
      expect(results).toHaveNoViolations();
    });

    it("StructureStep has no accessibility violations", async () => {
      const { container } = render(<StructureStep />);
      const results = await axe(container, AXE_OPTIONS);
      expect(results).toHaveNoViolations();
    });
  });
});
