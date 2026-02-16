/**
 * Module-related type definitions.
 * @module types/module
 */

export interface Module {
  id: string;
  title: string;
  code: string;
  credits: number;
  isElective?: boolean;
  stage?: number;
  semester?: number;
  moduleLeadName?: string;
  moduleLeadEmail?: string;
  mimlos?: MIMLO[];
  assessments?: ModuleAssessment[];
  effortHours?: Record<string, any>;
  readingList?: ReadingListItem[];
  [key: string]: unknown;
}

export interface MIMLO {
  id: string;
  text: string;
  [key: string]: unknown;
}

export interface ModuleAssessment {
  id: string;
  type: string;
  title?: string;
  weighting?: number;
  weight?: number;
  text?: string;
  mode?: string;
  integrity?: Record<string, boolean>;
  mimloIds?: string[];
  notes?: string;
  indicativeWeek?: number;
  [key: string]: unknown;
}

export interface ReadingListItem {
  id: string;
  type?: string;
  citation?: string;
  author?: string;
  title?: string;
  publisher?: string;
  year?: string;
  isbn?: string;
  notes?: string;
  isCore?: boolean;
  [key: string]: unknown;
}

export interface ElectiveDefinition {
  id: string;
  name: string;
  code: string;
  credits: number;
  groups: ElectiveGroup[];
}

export interface ElectiveGroup {
  id: string;
  name: string;
  code: string;
  moduleIds: string[];
}
