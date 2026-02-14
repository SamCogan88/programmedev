// @ts-check
/**
 * Effort Hours step component.
 * Manages detailed student effort hour breakdowns per module and delivery modality.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/effort-hours
 */

import { mountReact } from "../../utils/react-host.js";
import { EffortHoursStep } from "./react/EffortHoursStep.js";

/**
 * Renders the Effort Hours step UI by mounting the React component.
 */
export function renderEffortHoursStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(EffortHoursStep, {}, content);
}

/**
 * Wires up event handlers for the Effort Hours step.
 * No-op since React handles its own events internally.
 */
export function wireEffortHoursStep() {
  // React component handles its own events
}
