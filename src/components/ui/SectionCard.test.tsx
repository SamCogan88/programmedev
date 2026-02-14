import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionCard } from "./SectionCard";

describe("SectionCard", () => {
  it("renders title and children", () => {
    render(
      <SectionCard title="Test Title">
        <p>Test content</p>
      </SectionCard>,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders icon when provided", () => {
    render(
      <SectionCard title="With Icon" icon="plus" data-testid="card">
        <p>Content</p>
      </SectionCard>,
    );

    const card = screen.getByTestId("card");
    const icon = card.querySelector(".ph.ph-plus");
    expect(icon).toBeInTheDocument();
  });

  it("renders actions when provided", () => {
    render(
      <SectionCard title="With Actions" actions={<button data-testid="action-btn">Add</button>}>
        <p>Content</p>
      </SectionCard>,
    );

    expect(screen.getByTestId("action-btn")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <SectionCard title="Test" className="mt-3" data-testid="card">
        <p>Content</p>
      </SectionCard>,
    );

    const card = screen.getByTestId("card");
    expect(card).toHaveClass("shadow-sm", "mt-3");
  });

  it("sets heading id when provided", () => {
    render(
      <SectionCard title="Test" headingId="my-heading">
        <p>Content</p>
      </SectionCard>,
    );

    const heading = screen.getByText("Test");
    expect(heading).toHaveAttribute("id", "my-heading");
  });

  it("applies data-testid", () => {
    render(
      <SectionCard title="Test" data-testid="my-card">
        <p>Content</p>
      </SectionCard>,
    );

    expect(screen.getByTestId("my-card")).toBeInTheDocument();
  });

  it("renders as h5 heading", () => {
    render(
      <SectionCard title="Test Title">
        <p>Content</p>
      </SectionCard>,
    );

    const heading = screen.getByRole("heading", { level: 5 });
    expect(heading).toHaveTextContent("Test Title");
  });
});
