/**
 * Tests for the NavButtons component.
 * @module components/react/NavButtons.test
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NavButtons, NavButtonsProps } from "./NavButtons";

describe("NavButtons", () => {
  const defaultProps: NavButtonsProps = {
    isBackDisabled: false,
    isNextDisabled: false,
    onBack: vi.fn(),
    onNext: vi.fn(),
  };

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("renders back and next buttons", () => {
    render(<NavButtons {...defaultProps} />);

    expect(screen.getByTestId("back-btn")).toBeInTheDocument();
    expect(screen.getByTestId("next-btn")).toBeInTheDocument();
  });

  it("back button calls onBack when clicked", () => {
    const onBack = vi.fn();
    render(<NavButtons {...defaultProps} onBack={onBack} />);

    fireEvent.click(screen.getByTestId("back-btn"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("next button calls onNext when clicked", () => {
    const onNext = vi.fn();
    render(<NavButtons {...defaultProps} onNext={onNext} />);

    fireEvent.click(screen.getByTestId("next-btn"));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("disables back button when isBackDisabled is true", () => {
    render(<NavButtons {...defaultProps} isBackDisabled={true} />);

    const backBtn = screen.getByTestId("back-btn") as HTMLButtonElement;
    expect(backBtn.disabled).toBe(true);
  });

  it("disables next button when isNextDisabled is true", () => {
    render(<NavButtons {...defaultProps} isNextDisabled={true} />);

    const nextBtn = screen.getByTestId("next-btn") as HTMLButtonElement;
    expect(nextBtn.disabled).toBe(true);
  });

  it("does not call onBack when button is disabled", () => {
    const onBack = vi.fn();
    render(<NavButtons {...defaultProps} isBackDisabled={true} onBack={onBack} />);

    const backBtn = screen.getByTestId("back-btn");
    fireEvent.click(backBtn);
    expect(onBack).not.toHaveBeenCalled();
  });

  it("does not call onNext when button is disabled", () => {
    const onNext = vi.fn();
    render(<NavButtons {...defaultProps} isNextDisabled={true} onNext={onNext} />);

    const nextBtn = screen.getByTestId("next-btn");
    fireEvent.click(nextBtn);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("has correct aria labels", () => {
    render(<NavButtons {...defaultProps} />);

    expect(screen.getByTestId("back-btn")).toHaveAttribute("aria-label", "Go to previous step");
    expect(screen.getByTestId("next-btn")).toHaveAttribute("aria-label", "Go to next step");
  });

  it("displays icon elements", () => {
    render(<NavButtons {...defaultProps} />);

    const backBtn = screen.getByTestId("back-btn");
    const nextBtn = screen.getByTestId("next-btn");

    expect(backBtn.querySelector("i")).toBeInTheDocument();
    expect(nextBtn.querySelector("i")).toBeInTheDocument();
  });
});
