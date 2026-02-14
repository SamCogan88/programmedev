// @ts-check
/**
 * Credits & Modules step component.
 * Manages the programme's module list including mandatory and elective modules.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/structure
 */

import { mountReact } from "../../utils/react-host.js";
import { StructureStep } from "./react/StructureStep.js";

/**
 * Renders the Credits & Modules step UI by mounting the React component.
 */
export function renderStructureStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(StructureStep, {}, content);
}

/**
 * Wires up event handlers for the Structure step.
 * No-op since React handles its own events internally.
 *
 * @param {(() => void)=} _onUpdate - Unused callback (kept for API compatibility)
 */
export function wireStructureStep(_onUpdate) {
  // React component handles its own events
}
