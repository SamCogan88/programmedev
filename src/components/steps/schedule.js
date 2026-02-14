// @ts-check
/**
 * Programme Schedule step component.
 * Displays a QQI-style timetable view showing module placement across stages.
 *
 * This file bridges the legacy vanilla JS system to the new React component.
 * @module components/steps/schedule
 */

import { mountReact } from "../../utils/react-host.js";
import { ScheduleStep } from "./react/ScheduleStep.js";

/**
 * Renders the Schedule step UI by mounting the React component.
 */
export function renderScheduleStep() {
  const content = document.getElementById("content");
  if (!content) {
    return;
  }

  // Clear the content and mount the React component
  mountReact(ScheduleStep, {}, content);
}

/**
 * Wire Schedule step event handlers.
 * No-op since React handles its own events internally.
 */
export function wireScheduleStep() {
  // React component handles its own events
}
