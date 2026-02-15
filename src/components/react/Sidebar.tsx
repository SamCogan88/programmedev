/**
 * React Sidebar component.
 * Renders workflow step navigation tabs with icons and back/next buttons.
 * @module components/react/Sidebar
 */

import React from "react";

import { useProgramme } from "../../hooks/useStore";
import { activeSteps, state } from "../../state/store.js";

/**
 * Icon mapping for each step key.
 */
const STEP_ICONS: Record<string, string> = {
  identity: "ph-identification-card",
  outcomes: "ph-list-checks",
  versions: "ph-git-branch",
  stages: "ph-stairs",
  structure: "ph-cube",
  electives: "ph-path",
  mimlos: "ph-graduation-cap",
  "effort-hours": "ph-clock",
  assessments: "ph-exam",
  "reading-lists": "ph-books",
  schedule: "ph-calendar",
  mapping: "ph-graph",
  traceability: "ph-flow-arrow",
  snapshot: "ph-file-doc",
};

export interface SidebarProps {
  /** The currently active step key */
  currentStep: string;
  /** Callback when step changes */
  onStepChange: (stepKey: string) => void;
}

/**
 * Sidebar component for workflow step navigation.
 * Displays step tabs with icons and handles navigation.
 */
export function Sidebar({ currentStep, onStepChange }: SidebarProps): React.JSX.Element {
  // Subscribe to programme state for mode-dependent steps
  const { programme } = useProgramme();

  // Get active steps based on current mode
  const steps = activeSteps();

  // Find current step index
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  // Navigation handlers
  const handleBack = () => {
    if (currentIndex > 0) {
      const prevStep = steps[currentIndex - 1];
      onStepChange(prevStep.key);
    }
  };

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      const nextStep = steps[currentIndex + 1];
      onStepChange(nextStep.key);
    }
  };

  const handleStepClick = (stepKey: string) => {
    onStepChange(stepKey);
  };

  const isBackDisabled = currentIndex <= 0;
  const isNextDisabled = currentIndex >= steps.length - 1;

  return (
    <nav aria-labelledby="workflow-heading">
      {/* Step list */}
      <div
        className="list-group"
        id="stepList"
        role="tablist"
        aria-label="Programme design steps"
        data-testid="step-list"
      >
        {steps.map((step, idx) => {
          const isActive = step.key === currentStep;
          const iconClass = STEP_ICONS[step.key] ?? "ph-circle";

          return (
            <button
              key={step.key}
              type="button"
              className={`list-group-item list-group-item-action ${isActive ? "active" : ""}`}
              role="tab"
              aria-selected={isActive}
              aria-controls="content"
              aria-current={isActive ? "step" : undefined}
              data-testid={`step-${step.key}`}
              onClick={() => handleStepClick(step.key)}
            >
              <i className={`ph ${iconClass} me-2`} aria-hidden="true" />
              {idx + 1}. {step.title}
            </button>
          );
        })}
      </div>

      {/* Navigation buttons */}
      <div
        className="d-flex justify-content-between mt-3"
        role="group"
        aria-label="Step navigation"
        data-testid="sidebar-nav"
      >
        <button
          type="button"
          id="backBtn"
          className="btn btn-outline-secondary btn-sm"
          disabled={isBackDisabled}
          onClick={handleBack}
          aria-label="Go to previous step"
          data-testid="back-btn"
        >
          <i className="ph ph-caret-left" aria-hidden="true" /> Back
        </button>
        <button
          type="button"
          id="nextBtn"
          className="btn btn-dark btn-sm"
          disabled={isNextDisabled}
          onClick={handleNext}
          aria-label="Go to next step"
          data-testid="next-btn"
        >
          Next <i className="ph ph-caret-right" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export default Sidebar;
