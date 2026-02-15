/**
 * QQI Programme Design Studio - Root App Component.
 * Orchestrates the application layout with Header, Sidebar, and step content.
 * @module App
 */

import React, { useCallback, useEffect, useState } from "react";

import { Header, Sidebar, Flags } from "./components/react";
import { useProgramme } from "./hooks/useStore";
import { activeSteps, state } from "./state/store.js";
import { validateProgramme } from "./utils/validation.js";

// Import step components
import { IdentityStep } from "./components/steps/react/IdentityStep";
import { OutcomesStep } from "./components/steps/react/OutcomesStep";
import { VersionsStep } from "./components/steps/react/VersionsStep";
import { StagesStep } from "./components/steps/react/StagesStep";
import { SnapshotStep } from "./components/steps/react/SnapshotStep";
import { StructureStep } from "./components/steps/react/StructureStep";
import { ElectivesStep } from "./components/steps/react/ElectivesStep";
import { MimlosStep } from "./components/steps/react/MimlosStep";
import { EffortHoursStep } from "./components/steps/react/EffortHoursStep";
import { ReadingListsStep } from "./components/steps/react/ReadingListsStep";
import { ScheduleStep } from "./components/steps/react/ScheduleStep";
import { AssessmentsStep } from "./components/steps/react/AssessmentsStep";
import { MappingStep } from "./components/steps/react/MappingStep";
import { TraceabilityStep } from "./components/steps/react/TraceabilityStep";

/**
 * Step component registry mapping step keys to React components.
 */
const STEP_COMPONENTS: Record<string, React.ComponentType<StepComponentProps | object>> = {
  identity: IdentityStep,
  outcomes: OutcomesStep,
  versions: VersionsStep,
  stages: StagesStep,
  structure: StructureStep,
  electives: ElectivesStep,
  mimlos: MimlosStep,
  "effort-hours": EffortHoursStep,
  assessments: AssessmentsStep,
  "reading-lists": ReadingListsStep,
  schedule: ScheduleStep,
  mapping: MappingStep,
  traceability: TraceabilityStep,
  snapshot: SnapshotStep,
};

/**
 * Props passed to each step component.
 */
export interface StepComponentProps {
  /** Callback to trigger header and flags update after changes */
  updateFlagsAndHeader?: () => void;
}

/**
 * Step definition from store.
 */
interface StepDef {
  key: string;
  title: string;
}

/**
 * Root App component for the Programme Design Studio.
 * Handles application layout and step navigation.
 */
export function App(): React.JSX.Element {
  const { programme } = useProgramme();
  
  // Step navigation state
  const [stepIndex, setStepIndex] = useState(() => state.stepIndex);
  
  // Force re-render counter for flags/header updates
  const [, setUpdateCounter] = useState(0);
  
  // Get active steps based on current mode
  const steps = activeSteps() as StepDef[];
  const currentStep = steps[stepIndex];
  
  // Sync step index to global state for legacy compatibility
  useEffect(() => {
    state.stepIndex = stepIndex;
  }, [stepIndex]);
  
  // Navigation handlers
  const handleStepChange = useCallback((stepKey: string) => {
    const idx = steps.findIndex((s: StepDef) => s.key === stepKey);
    if (idx >= 0) {
      setStepIndex(idx);
    }
  }, [steps]);
  
  const handleGoToStep = useCallback((stepKey: string) => {
    handleStepChange(stepKey);
  }, [handleStepChange]);
  
  // Update flags and header callback
  const updateFlagsAndHeader = useCallback(() => {
    setUpdateCounter((c) => c + 1);
  }, []);
  
  // Get current step component
  const StepComponent = currentStep ? STEP_COMPONENTS[currentStep.key] : null;
  
  // Validation flags for sidebar display
  const flags = validateProgramme(programme);
  
  return (
    <>
      {/* Header */}
      <Header onNavigateToStep={handleGoToStep} />
      
      {/* Main Content Area */}
      <main className="container-fluid py-3" id="main-content">
        <div className="row g-3">
          {/* Sidebar */}
          <aside className="col-12 col-lg-3" aria-label="Workflow navigation">
            {/* Workflow Card */}
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="fw-semibold mb-2" id="workflow-heading">Workflow</div>
                <Sidebar
                  currentStep={currentStep?.key ?? "identity"}
                  onStepChange={handleStepChange}
                />
              </div>
            </div>
            
            {/* QQI Flags Card */}
            <div className="card shadow-sm mt-3">
              <div className="card-body">
                <div className="fw-semibold mb-2" id="flags-heading">QQI Flags</div>
                <Flags onGoToStep={handleGoToStep} />
              </div>
            </div>
          </aside>
          
          {/* Content Panel */}
          <section className="col-12 col-lg-9" aria-label="Step content">
            <div id="content" role="tabpanel" data-testid="content-panel">
              {StepComponent ? (
                <StepComponent updateFlagsAndHeader={updateFlagsAndHeader} />
              ) : (
                <div className="alert alert-warning">
                  Step not found: {currentStep?.key ?? "unknown"}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

export default App;
