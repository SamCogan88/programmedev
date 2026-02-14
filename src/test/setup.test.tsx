import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// Simple test component
function TestComponent({ message }: { message: string }) {
  return <div role="alert">{message}</div>;
}

describe("Vitest Setup", () => {
  it("renders React components correctly", () => {
    render(<TestComponent message="Hello, Vitest!" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Hello, Vitest!");
  });

  it("supports jest-dom matchers", () => {
    render(<TestComponent message="Testing matchers" />);
    const element = screen.getByRole("alert");
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
  });
});
