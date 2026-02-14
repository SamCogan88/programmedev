/**
 * React NavButtons component.
 * Back/Next navigation buttons for step navigation.
 * @module components/react/NavButtons
 */

import React from "react";
import { Button } from "react-bootstrap";

import { Icon } from "../ui";

export interface NavButtonsProps {
  /** Whether back button should be disabled */
  isBackDisabled: boolean;
  /** Whether next button should be disabled */
  isNextDisabled: boolean;
  /** Callback when back is clicked */
  onBack: () => void;
  /** Callback when next is clicked */
  onNext: () => void;
  /** Button size variant */
  size?: "sm" | "lg";
  /** Back button variant (default: "outline-secondary") */
  backVariant?: string;
  /** Next button variant (default: "primary") */
  nextVariant?: string;
  /** Back button icon name (default: "arrow-left") */
  backIcon?: string;
  /** Next button icon name (default: "arrow-right") */
  nextIcon?: string;
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** Test ID for the wrapper */
  "data-testid"?: string;
}

/**
 * Navigation buttons component for step-by-step workflow.
 * Displays Back and Next buttons with appropriate disabled states.
 */
export function NavButtons({
  isBackDisabled,
  isNextDisabled,
  onBack,
  onNext,
  size,
  backVariant = "outline-secondary",
  nextVariant = "primary",
  backIcon = "arrow-left",
  nextIcon = "arrow-right",
  className = "nav-buttons p-3 border-top d-flex gap-2",
  "data-testid": testId = "nav-buttons",
}: NavButtonsProps): React.JSX.Element {
  return (
    <div className={className} data-testid={testId}>
      <Button
        variant={backVariant}
        size={size}
        id="backBtn"
        className="flex-fill"
        disabled={isBackDisabled}
        onClick={onBack}
        data-testid="back-btn"
        aria-label="Go to previous step"
      >
        <Icon name={backIcon} className="me-1" /> Back
      </Button>
      <Button
        variant={nextVariant}
        size={size}
        id="nextBtn"
        className="flex-fill"
        disabled={isNextDisabled}
        onClick={onNext}
        data-testid="next-btn"
        aria-label="Go to next step"
      >
        Next <Icon name={nextIcon} className="ms-1" />
      </Button>
    </div>
  );
}

export default NavButtons;
