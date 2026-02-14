/**
 * React NavButtons component.
 * Back/Next navigation buttons for step navigation.
 * @module components/react/NavButtons
 */

import React from "react";

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
}: NavButtonsProps): React.JSX.Element {
  return (
    <div className="nav-buttons p-3 border-top d-flex gap-2" data-testid="nav-buttons">
      <button
        type="button"
        id="backBtn"
        className="btn btn-outline-secondary flex-fill"
        disabled={isBackDisabled}
        onClick={onBack}
        data-testid="back-btn"
        aria-label="Go to previous step"
      >
        <Icon name="ph-arrow-left" className="me-1" />
        Back
      </button>
      <button
        type="button"
        id="nextBtn"
        className="btn btn-primary flex-fill"
        disabled={isNextDisabled}
        onClick={onNext}
        data-testid="next-btn"
        aria-label="Go to next step"
      >
        Next
        <Icon name="ph-arrow-right" className="ms-1" />
      </button>
    </div>
  );
}

export default NavButtons;
