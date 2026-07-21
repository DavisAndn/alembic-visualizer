/**
 * Data-transfer types shared between the Python generator, the parsing layer,
 * and the UI. Pure declarations — no imports, no `vscode`.
 */

/** A single migration revision, as rendered in the graph. */
export interface GraphNode {
  /** Synthetic, Mermaid-safe id used as the graph node id: `n0`, `n1`, ... */
  nodeId: string;
  /** The real Alembic revision id (may contain hyphens, dots, etc.). */
  revisionId: string;
  /** Short human label (the migration's docstring, sanitized/truncated). */
  label: string;
  /** Absolute path to the migration `.py` file, or null if unknown. */
  filePath: string | null;
}

/** The full payload emitted by `scripts/mermaid_generator.py` on success. */
export interface GraphPayload {
  version: number;
  /** The `graph TD ...` Mermaid source (uses synthetic node ids). */
  mermaid: string;
  nodes: GraphNode[];
  /** Head revision ids. */
  heads: string[];
  /** Base revision ids. */
  bases: string[];
}

/** Normalized failure produced when the generator cannot return a payload. */
export interface ParseFailure {
  /** Coarse cause used to shape hints and detail rendering. */
  kind: "python" | "invalid-json" | "raw";
  /** Best single-line message for display. */
  message: string;
  /** Python exception class name, when the script emitted a structured error. */
  pythonType?: string;
  /** Full raw text (stderr or stdout) for the detail panel. */
  raw: string;
}

/** Result of parsing the generator's stdout/stderr/exit code. */
export type ParseResult =
  | { ok: true; payload: GraphPayload; isEmpty: boolean }
  | { ok: false; failure: ParseFailure };

/** A friendly, actionable error for the webview error panel. */
export interface FriendlyError {
  title: string;
  detail: string;
  hint?: string;
}
