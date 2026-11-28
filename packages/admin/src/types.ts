/**
 * Contracts shared by the shell and the app's server runtime.
 *
 * The components never import server code: the page passes these actions down
 * as props. They are plain function types, so the same component works with
 * Next server actions or with a test double.
 */

export interface FormOption {
  value: string;
  label: string;
}

export interface FieldErrors {
  [field: string]: string[];
}

export interface SaveResult {
  ok: boolean;
  fieldErrors?: FieldErrors;
  message?: string;
}

export interface RunActionInput {
  slug: string;
  name: string;
  id?: string;
  values?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface RunActionResult extends SaveResult {
  href?: string;
}

export interface SaveInput {
  slug: string;
  id?: string;
  values: Record<string, unknown>;
}

export type SaveAction = (input: SaveInput) => Promise<SaveResult>;
export type DeleteAction = (input: { slug: string; id: string }) => Promise<SaveResult>;
export type RunAction = (input: RunActionInput) => Promise<RunActionResult>;

export type RelationAction = (
  input: import("@dashild/core/server").RelationActionInput,
) => Promise<SaveResult>;

export interface ExportResult {
  ok: boolean;
  csv?: string;
  filename?: string;
  rows?: number;
  truncated?: boolean;
  message?: string;
}

export type ExportAction = (input: {
  slug: string;
  params?: Record<string, string | string[] | undefined>;
}) => Promise<ExportResult>;

export interface ImportResult {
  ok: boolean;
  imported?: number;
  failed?: number;
  errors?: { row: number; message: string }[];
  message?: string;
}

export type ImportAction = (input: {
  slug: string;
  csv: string;
}) => Promise<ImportResult>;
