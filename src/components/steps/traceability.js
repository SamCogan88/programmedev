// @ts-check
/**
 * Traceability step component.
 * Displays the full alignment chain from award standards through PLOs to MIMLOs
 * with coverage analysis and gap warnings.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/traceability
 */

import { mountReact } from "../../utils/react-host.js";
import { TraceabilityStep } from "./react/TraceabilityStep.js";

/**
 * Renders the Traceability step UI by mounting the React component.
 */
export function renderTraceabilityStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(TraceabilityStep, {}, content);
}

/**
 * Wires up event handlers for the Traceability step.
 * No-op since React handles its own events internally.
 */
export function wireTraceabilityStep() {
  // React component handles its own events
}
