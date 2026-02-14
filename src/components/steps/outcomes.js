// @ts-check
/**
 * Programme Learning Outcomes (PLOs) step component.
 * Bridged to React implementation.
 * @module components/steps/outcomes
 */

import { mountReact } from "../../utils/react-host.js";
import { OutcomesStep } from "./react/OutcomesStep.js";

/**
 * Renders the Programme Learning Outcomes step UI using React.
 */
export function renderOutcomesStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  content.innerHTML = "";
  mountReact(OutcomesStep, {}, content);
}

/**
 * Wire up event handlers for PLO step.
 * With the React implementation, no additional wiring is needed.
 */
export function wireOutcomesStep() {
  // Event handling is managed within the React component
}
