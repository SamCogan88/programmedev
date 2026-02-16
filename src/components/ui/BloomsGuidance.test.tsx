import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BloomsGuidance } from "./BloomsGuidance";

describe("BloomsGuidance", () => {
  it("shows default verbs when nfqLevel is null", () => {
    render(<BloomsGuidance nfqLevel={null} contextLabel="PLOs" />);
    expect(screen.getByText(/choose NFQ level first/)).toBeInTheDocument();
    expect(screen.getByText("describe")).toBeInTheDocument();
    expect(screen.getByText("evaluate")).toBeInTheDocument();
  });

  it("shows level 6 verbs for NFQ levels 1–6", () => {
    render(<BloomsGuidance nfqLevel={6} contextLabel="PLOs" />);
    expect(screen.getByText(/NFQ level 6/)).toBeInTheDocument();
    expect(screen.getByText("identify")).toBeInTheDocument();
    expect(screen.getByText(/foundational knowledge/)).toBeInTheDocument();
  });

  it("shows level 7 verbs", () => {
    render(<BloomsGuidance nfqLevel={7} contextLabel="MIMLOs" />);
    expect(screen.getByText(/NFQ level 7/)).toBeInTheDocument();
    expect(screen.getByText("justify")).toBeInTheDocument();
    expect(screen.getByText(/problem-solving/)).toBeInTheDocument();
  });

  it("shows level 8 verbs", () => {
    render(<BloomsGuidance nfqLevel={8} contextLabel="PLOs" />);
    expect(screen.getByText(/NFQ level 8/)).toBeInTheDocument();
    expect(screen.getByText("synthesise")).toBeInTheDocument();
    expect(screen.getByText("critique")).toBeInTheDocument();
  });

  it("shows level 9+ verbs", () => {
    render(<BloomsGuidance nfqLevel={9} contextLabel="PLOs" />);
    expect(screen.getByText(/NFQ level 9/)).toBeInTheDocument();
    expect(screen.getByText("originate")).toBeInTheDocument();
    expect(screen.getByText(/original contribution/)).toBeInTheDocument();
  });

  it("includes the context label in the title", () => {
    render(<BloomsGuidance nfqLevel={8} contextLabel="Module Outcomes" />);
    expect(screen.getByText(/Module Outcomes/)).toBeInTheDocument();
  });

  it("shows the tip text", () => {
    render(<BloomsGuidance nfqLevel={8} contextLabel="PLOs" />);
    expect(screen.getByText(/start outcomes with a verb/)).toBeInTheDocument();
  });
});
