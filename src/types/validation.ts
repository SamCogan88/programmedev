/**
 * Validation-related type definitions.
 * @module types/validation
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AwardStandard {
  id: string;
  name: string;
}
