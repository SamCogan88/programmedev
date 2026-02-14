import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormField } from "./FormField";
import { FormInput } from "./FormInput";
import { FormSelect } from "./FormSelect";

describe("Form components", () => {
  describe("FormField", () => {
    it("renders label and children", () => {
      render(
        <FormField label="Test Label" htmlFor="test-input">
          <input id="test-input" />
        </FormField>,
      );

      expect(screen.getByText("Test Label")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("associates label with input via htmlFor", () => {
      render(
        <FormField label="Username" htmlFor="username">
          <input id="username" />
        </FormField>,
      );

      const label = screen.getByText("Username");
      expect(label).toHaveAttribute("for", "username");
    });

    it("shows required indicator when required", () => {
      render(
        <FormField label="Required Field" htmlFor="required" required>
          <input id="required" />
        </FormField>,
      );

      expect(screen.getByText("*")).toBeInTheDocument();
    });

    it("renders help text when provided", () => {
      render(
        <FormField label="Email" htmlFor="email" helpText="Enter a valid email">
          <input id="email" />
        </FormField>,
      );

      expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
    });
  });

  describe("FormInput", () => {
    it("renders text input with value", () => {
      render(<FormInput id="test" value="Hello" onChange={() => {}} />);
      expect(screen.getByRole("textbox")).toHaveValue("Hello");
    });

    it("calls onChange when value changes", () => {
      const handleChange = vi.fn();
      render(<FormInput id="test" value="" onChange={handleChange} />);

      fireEvent.change(screen.getByRole("textbox"), { target: { value: "New value" } });
      expect(handleChange).toHaveBeenCalledWith("New value");
    });

    it("renders number input with min/max/step", () => {
      render(
        <FormInput
          id="credits"
          type="number"
          value={10}
          onChange={() => {}}
          min={0}
          max={100}
          step={5}
          data-testid="credits-input"
        />,
      );

      const input = screen.getByTestId("credits-input");
      expect(input).toHaveAttribute("type", "number");
      expect(input).toHaveAttribute("min", "0");
      expect(input).toHaveAttribute("max", "100");
      expect(input).toHaveAttribute("step", "5");
    });

    it("renders with suffix", () => {
      render(<FormInput id="credits" type="number" value={10} onChange={() => {}} suffix="cr" />);

      expect(screen.getByText("cr")).toBeInTheDocument();
    });

    it("renders with prefix", () => {
      render(<FormInput id="price" type="number" value={100} onChange={() => {}} prefix="€" />);

      expect(screen.getByText("€")).toBeInTheDocument();
    });

    it("applies disabled state", () => {
      render(<FormInput id="test" value="" onChange={() => {}} disabled />);
      expect(screen.getByRole("textbox")).toBeDisabled();
    });

    it("applies placeholder", () => {
      render(<FormInput id="test" value="" onChange={() => {}} placeholder="Enter value" />);
      expect(screen.getByPlaceholderText("Enter value")).toBeInTheDocument();
    });
  });

  describe("FormSelect", () => {
    const options = [
      { value: "opt1", label: "Option 1" },
      { value: "opt2", label: "Option 2" },
      { value: "opt3", label: "Option 3", disabled: true },
    ];

    it("renders options", () => {
      render(<FormSelect id="test" value="" onChange={() => {}} options={options} />);

      expect(screen.getByRole("combobox")).toBeInTheDocument();
      expect(screen.getByText("Option 1")).toBeInTheDocument();
      expect(screen.getByText("Option 2")).toBeInTheDocument();
    });

    it("renders placeholder option", () => {
      render(
        <FormSelect
          id="test"
          value=""
          onChange={() => {}}
          options={options}
          placeholder="Select an option"
        />,
      );

      expect(screen.getByText("Select an option")).toBeInTheDocument();
    });

    it("calls onChange with selected value", () => {
      const handleChange = vi.fn();
      render(<FormSelect id="test" value="" onChange={handleChange} options={options} />);

      fireEvent.change(screen.getByRole("combobox"), { target: { value: "opt2" } });
      expect(handleChange).toHaveBeenCalledWith("opt2");
    });

    it("shows correct selected value", () => {
      render(<FormSelect id="test" value="opt2" onChange={() => {}} options={options} />);

      expect(screen.getByRole("combobox")).toHaveValue("opt2");
    });

    it("renders disabled options", () => {
      render(<FormSelect id="test" value="" onChange={() => {}} options={options} />);

      const disabledOption = screen.getByText("Option 3");
      expect(disabledOption).toHaveAttribute("disabled");
    });

    it("applies disabled state to select", () => {
      render(<FormSelect id="test" value="" onChange={() => {}} options={options} disabled />);

      expect(screen.getByRole("combobox")).toBeDisabled();
    });
  });
});
