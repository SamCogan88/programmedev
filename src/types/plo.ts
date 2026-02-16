/**
 * Programme Learning Outcome type definitions.
 * @module types/plo
 */

export interface PLO {
  id: string;
  code?: string;
  text: string;
  standardMappings?: Array<{
    standardId?: string;
    criteria: string;
    thread: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}
