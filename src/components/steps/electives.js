// @ts-check
/**
 * Electives step component.
 * Bridged to React implementation.
 * @module components/steps/electives
 */

import { mountReact } from "../../utils/react-host.js";
import { ElectivesStep } from "./react/ElectivesStep.js";

/**
 * Renders the Electives step UI using React.
 */
export function renderElectivesStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  content.innerHTML = "";
  mountReact(ElectivesStep, {}, content);
}

/**
 * Wire up event handlers for Electives step.
 * With the React implementation, no additional wiring is needed.
 */
export function wireElectivesStep() {
  // Event handling is managed within the React component
}
