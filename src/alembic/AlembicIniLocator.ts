import * as path from "path";
import {
  ALEMBIC_INI_FILENAME,
  DEFAULT_MAX_INI_SEARCH_RESULTS,
  DEFAULT_MAX_SEARCH_DEPTH,
  SEARCH_SKIP_DIRS,
} from "../constants";
import type { DirEntry, FileSystemPort } from "../platform/ports";

export interface LocatorOptions {
  maxResults?: number;
  maxDepth?: number;
  skipDirs?: ReadonlySet<string>;
}

/**
 * Recursively discovers `alembic.ini` files across one or more workspace roots.
 * Pure over a {@link FileSystemPort}, so it is fully unit-tested with an
 * in-memory tree. Results are deduped, ordered shallowest-first then
 * alphabetically (deterministic), and capped.
 */
export class AlembicIniLocator {
  private readonly maxResults: number;
  private readonly maxDepth: number;
  private readonly skipDirs: ReadonlySet<string>;

  constructor(
    private readonly workspaceRoots: string[],
    private readonly fs: FileSystemPort,
    options: LocatorOptions = {},
  ) {
    this.maxResults = options.maxResults ?? DEFAULT_MAX_INI_SEARCH_RESULTS;
    this.maxDepth = options.maxDepth ?? DEFAULT_MAX_SEARCH_DEPTH;
    this.skipDirs = options.skipDirs ?? SEARCH_SKIP_DIRS;
  }

  findCandidates(): string[] {
    const matches: string[] = [];
    const visited = new Set<string>();
    for (const root of this.workspaceRoots) {
      this.walk(root, 0, matches, visited);
    }
    matches.sort(
      (a, b) => pathDepth(a) - pathDepth(b) || compareStrings(a, b),
    );
    return dedupe(matches).slice(0, this.maxResults);
  }

  private walk(
    dir: string,
    depth: number,
    matches: string[],
    visited: Set<string>,
  ): void {
    if (depth > this.maxDepth) {
      return;
    }
    const key = path.resolve(dir);
    if (visited.has(key)) {
      return;
    }
    visited.add(key);

    let entries: DirEntry[];
    try {
      entries = this.fs.readDirectory(dir);
    } catch {
      return; // unreadable directory → skip quietly, never throw
    }

    for (const entry of entries) {
      if (entry.isFile() && entry.name === ALEMBIC_INI_FILENAME) {
        matches.push(path.join(dir, entry.name));
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !this.shouldSkip(entry.name)) {
        this.walk(path.join(dir, entry.name), depth + 1, matches, visited);
      }
    }
  }

  /** Skip dot-dirs, `venv*` dirs, and the exact-match skip set. */
  private shouldSkip(name: string): boolean {
    return (
      name.startsWith(".") || name.startsWith("venv") || this.skipDirs.has(name)
    );
  }
}

function pathDepth(p: string): number {
  return p.split("/").length;
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}
