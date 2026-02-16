import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Alert, ErrorAlert, InfoAlert, SuccessAlert, WarningAlert } from "./Alert";

describe("Alert", () => {
  describe("base Alert component", () => {
    it("renders children content", () => {
      render(<Alert variant="info">Test message</Alert>);
      expect(screen.getByText("Test message")).toBeInTheDocument();
    });

    it("renders icon when provided", () => {
      render(
        <Alert variant="info" icon="plus" data-testid="alert">
          Content
        </Alert>,
      );
      const alert = screen.getByTestId("alert");
      expect(alert.querySelector(".ph.ph-plus")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(
        <Alert variant="info" className="mb-3" data-testid="alert">
          Content
        </Alert>,
      );
      expect(screen.getByTestId("alert")).toHaveClass("mb-3");
    });

    it("applies data-testid", () => {
      render(
        <Alert variant="info" data-testid="my-alert">
          Content
        </Alert>,
      );
      expect(screen.getByTestId("my-alert")).toBeInTheDocument();
    });
  });

  describe("InfoAlert", () => {
    it("renders with light variant and lightbulb icon", () => {
      render(<InfoAlert data-testid="info">Info message</InfoAlert>);
      const alert = screen.getByTestId("info");
      expect(alert).toHaveClass("alert-light");
      expect(alert.querySelector(".ph.ph-lightbulb")).toBeInTheDocument();
      expect(screen.getByText("Info message")).toBeInTheDocument();
    });
  });

  describe("WarningAlert", () => {
    it("renders with warning variant and warning icon", () => {
      render(<WarningAlert data-testid="warning">Warning message</WarningAlert>);
      const alert = screen.getByTestId("warning");
      expect(alert).toHaveClass("alert-warning");
      expect(alert.querySelector(".ph.ph-warning")).toBeInTheDocument();
      expect(screen.getByText("Warning message")).toBeInTheDocument();
    });
  });

  describe("ErrorAlert", () => {
    it("renders with danger variant and warning-circle icon", () => {
      render(<ErrorAlert data-testid="error">Error message</ErrorAlert>);
      const alert = screen.getByTestId("error");
      expect(alert).toHaveClass("alert-danger");
      expect(alert.querySelector(".ph.ph-warning-circle")).toBeInTheDocument();
      expect(screen.getByText("Error message")).toBeInTheDocument();
    });
  });

  describe("SuccessAlert", () => {
    it("renders with success variant and check-circle icon", () => {
      render(<SuccessAlert data-testid="success">Success message</SuccessAlert>);
      const alert = screen.getByTestId("success");
      expect(alert).toHaveClass("alert-success");
      expect(alert.querySelector(".ph.ph-check-circle")).toBeInTheDocument();
      expect(screen.getByText("Success message")).toBeInTheDocument();
    });
  });
});
