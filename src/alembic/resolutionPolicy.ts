/**
 * Pure decision for how to resolve which Alembic project to visualize. No I/O —
 * it takes a snapshot of the world and returns what the orchestrator should do.
 */

export type Decision =
  | { kind: "use"; iniPath: string; source: "persisted" | "auto" }
  | { kind: "pick"; candidates: string[] }
  | { kind: "browse" };

export interface ResolutionInput {
  /** Persisted ini path, resolved to absolute (only meaningful if it exists). */
  persistedPath?: string;
  persistedExists: boolean;
  /** Absolute paths discovered in the workspace. */
  discovered: string[];
  /** True for the "switch directory" command: always prompt. */
  forceSwitch?: boolean;
}

export function decideResolution(input: ResolutionInput): Decision {
  const { persistedPath, persistedExists, discovered, forceSwitch } = input;

  if (forceSwitch) {
    return discovered.length > 0
      ? { kind: "pick", candidates: discovered }
      : { kind: "browse" };
  }
  if (persistedPath && persistedExists) {
    return { kind: "use", iniPath: persistedPath, source: "persisted" };
  }
  if (discovered.length === 1) {
    return { kind: "use", iniPath: discovered[0], source: "auto" };
  }
  if (discovered.length > 1) {
    return { kind: "pick", candidates: discovered };
  }
  return { kind: "browse" };
}
