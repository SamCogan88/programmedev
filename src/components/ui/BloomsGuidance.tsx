/**
 * Bloom's Taxonomy guidance panel for learning outcome authoring.
 * Shows NFQ-level-appropriate action verbs and tips.
 * @module components/ui/BloomsGuidance
 */

import React from "react";

import { Badge } from "react-bootstrap";

import { Alert } from "./Alert";

interface BloomsGuidanceProps {
  nfqLevel: number | null;
  contextLabel: string;
}

/**
 * Bloom's guidance helper showing NFQ-level appropriate verbs.
 */
export const BloomsGuidance: React.FC<BloomsGuidanceProps> = ({ nfqLevel, contextLabel }) => {
  const lvl = Number(nfqLevel ?? 0);
  const title = lvl
    ? `Bloom helper (aligned to NFQ level ${lvl})`
    : "Bloom helper (choose NFQ level first)";

  let focus: string;
  let verbs: string[];

  if (!lvl) {
    focus =
      "Pick the programme NFQ level in Identity, then come back here for tailored verb suggestions.";
    verbs = ["describe", "explain", "apply", "analyse", "evaluate", "design"];
  } else if (lvl <= 6) {
    focus =
      "Emphasise foundational knowledge and applied skills (remember/understand/apply), with some analysis.";
    verbs = [
      "identify",
      "describe",
      "explain",
      "apply",
      "demonstrate",
      "use",
      "outline",
      "compare",
    ];
  } else if (lvl === 7) {
    focus = "Balance application and analysis. Show problem-solving and autonomy.";
    verbs = [
      "apply",
      "analyse",
      "evaluate",
      "compare",
      "develop",
      "justify",
      "implement",
      "design",
    ];
  } else if (lvl === 8) {
    focus = "Push beyond application: critical analysis, evaluation, and creation/design.";
    verbs = [
      "analyse",
      "evaluate",
      "synthesise",
      "design",
      "develop",
      "critique",
      "justify",
      "implement",
    ];
  } else {
    focus = "Focus on creation, research, and leadership. Expect original contribution.";
    verbs = [
      "design",
      "develop",
      "evaluate",
      "create",
      "synthesise",
      "lead",
      "formulate",
      "originate",
    ];
  }

  return (
    <Alert variant="secondary" className="mb-3 small">
      <div className="fw-semibold mb-1">
        {title} — for {contextLabel}
      </div>
      <div className="mb-2">{focus}</div>
      <div className="d-flex flex-wrap gap-1">
        {verbs.map((v) => (
          <Badge key={v} bg="light" text="dark">
            {v}
          </Badge>
        ))}
      </div>
      <div className="mt-2 text-secondary">
        Tip: start outcomes with a verb + object + standard (e.g., &quot;Analyse X using Y to
        produce Z&quot;).
      </div>
    </Alert>
  );
};
