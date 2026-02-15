/**
 * Unit tests for TraceabilityStep React component.
 */

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { state } from "../../../state/store.js";
import { TraceabilityStep } from "./TraceabilityStep";

// Mock the store module
vi.mock("../../../state/store.js", async () => {
  const actual = await vi.importActual("../../../state/store.js");
  return {
    ...actual,
    saveNow: vi.fn(),
    getAwardStandard: vi.fn().mockResolvedValue({
      levels: {
        8: [{ criteria: "Knowledge", thread: "Breadth", descriptor: "Advanced" }],
      },
    }),
    getStandardIndicators: vi.fn().mockReturnValue([]),
  };
});

vi.mock("../../../utils/validation.js", () => ({
  validateProgramme: vi.fn(() => []),
}));

describe("TraceabilityStep", () => {
  beforeEach(() => {
    state.programme = {
      schemaVersion: 3,
      id: "test",
      title: "Test Programme",
      awardType: "Honours Bachelor Degree",
      nfqLevel: 8,
      school: "Computing",
      awardStandardIds: ["computing"],
      awardStandardNames: ["Computing"],
      totalCredits: 180,
      electiveDefinitions: [],
      intakeMonths: ["Sep"],
      modules: [],
      plos: [],
      ploToMimlos: {},
      versions: [],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the traceability card", () => {
      render(<TraceabilityStep />);
      expect(screen.getByTestId("traceability-card")).toBeInTheDocument();
    });

    it("displays loading state while fetching standards", () => {
      render(<TraceabilityStep />);
      expect(screen.getByText(/Loading award standards/)).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("renders without crashing when no PLOs", () => {
      render(<TraceabilityStep />);
      expect(screen.getByText("Traceability Matrix")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has accessible title", () => {
      render(<TraceabilityStep />);
      expect(screen.getByText("Traceability Matrix")).toBeInTheDocument();
    });
  });
});
