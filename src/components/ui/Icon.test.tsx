import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Icon } from "./Icon";

describe("Icon", () => {
  it("renders with correct class for regular weight", () => {
    render(<Icon name="plus" data-testid="icon" />);
    const icon = screen.getByTestId("icon");
    expect(icon).toHaveClass("ph", "ph-plus");
  });

  it("renders with correct class for bold weight", () => {
    render(<Icon name="trash" weight="bold" data-testid="icon" />);
    const icon = screen.getByTestId("icon");
    expect(icon).toHaveClass("ph-bold", "ph-trash");
  });

  it("renders with correct class for other weights", () => {
    render(<Icon name="warning" weight="fill" data-testid="icon" />);
    const icon = screen.getByTestId("icon");
    expect(icon).toHaveClass("ph-fill", "ph-warning");
  });

  it("is decorative by default (aria-hidden=true)", () => {
    render(<Icon name="plus" data-testid="icon" />);
    const icon = screen.getByTestId("icon");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("supports non-decorative icons with label", () => {
    render(<Icon name="warning" decorative={false} label="Warning icon" data-testid="icon" />);
    const icon = screen.getByTestId("icon");
    expect(icon).toHaveAttribute("aria-hidden", "false");
    expect(icon).toHaveAttribute("aria-label", "Warning icon");
    expect(icon).toHaveAttribute("role", "img");
  });

  it("applies additional className", () => {
    render(<Icon name="plus" className="me-2 text-primary" data-testid="icon" />);
    const icon = screen.getByTestId("icon");
    expect(icon).toHaveClass("ph", "ph-plus", "me-2", "text-primary");
  });

  it("passes through additional HTML attributes", () => {
    render(<Icon name="plus" data-testid="icon" id="my-icon" title="Add item" />);
    const icon = screen.getByTestId("icon");
    expect(icon).toHaveAttribute("id", "my-icon");
    expect(icon).toHaveAttribute("title", "Add item");
  });
});
