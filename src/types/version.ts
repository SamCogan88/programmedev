/**
 * Programme version and stage type definitions.
 * @module types/version
 */

export interface ProgrammeVersion {
  id: string;
  label: string;
  code: string;
  deliveryModality?: string;
  targetAudience?: string;
  deliveryPatterns?: Record<string, any>;
  stages?: Stage[];
  effortConfig?: Record<string, any>;
  intakes?: string[];
  startMonth?: string;
  durationWeeks?: number;
  admissionsDeadline?: string;
  duration?: string;
  targetCohortSize?: number;
  numberOfGroups?: number;
  deliveryNotes?: string;
  onlineProctoredExams?: string;
  onlineProctoredExamsNotes?: string;
  [key: string]: unknown;
}

export interface Stage {
  id: string;
  name?: string;
  sequence?: number;
  creditsTarget?: number;
  modules?: Array<{ moduleId: string; semester?: string }>;
  moduleIds?: string[];
  exitAward?: {
    enabled?: boolean;
    awardTitle?: string;
  };
  [key: string]: unknown;
}
