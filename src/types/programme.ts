/**
 * Programme data structure type definition.
 * @module types/programme
 */

import type { ElectiveDefinition, Module } from "./module";
import type { PLO } from "./plo";
import type { ProgrammeVersion } from "./version";

export interface Programme {
  schemaVersion: number;
  id: string;
  title: string;
  awardType: string;
  awardTypeIsOther: boolean;
  nfqLevel: number | null;
  school: string;
  awardStandardIds: string[];
  awardStandardNames: string[];
  totalCredits: number;
  electiveDefinitions: ElectiveDefinition[];
  intakeMonths?: string[];
  modules?: Module[];
  plos?: PLO[];
  /** @deprecated Use ploToMimlos instead. Kept for migration compatibility. */
  ploToModules?: Record<string, string[]>;
  /** Mapping of PLO IDs to arrays of MIMLO IDs */
  ploToMimlos?: Record<string, string[]>;
  versions?: ProgrammeVersion[];
  updatedAt?: string | null;
  mode?: string;
  moduleEditor?: { assignedModuleIds?: string[] };
  [key: string]: unknown;
}
