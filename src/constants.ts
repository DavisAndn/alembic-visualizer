/**
 * Central, dependency-free constants. Nothing here imports `vscode`, so every
 * module can share these without coupling to the host.
 */

/** Command ids (must match `contributes.commands` in package.json). */
export const COMMANDS = {
  showGraph: "alembic-viz.showGraph",
  switchDirectory: "alembic-viz.switchDirectory",
} as const;

/** Configuration section + keys (must match `contributes.configuration`). */
export const CONFIG = {
  section: "alembicViz",
  alembicIniPath: "alembicIniPath",
  recursiveVersionLocations: "recursiveVersionLocations",
  searchMaxResults: "search.maxResults",
} as const;

/** User-facing brand strings. */
export const BRAND = {
  displayName: "Alembic Visualizer",
  panelTitle: "Alembic Visualizer",
  webviewViewType: "alembicVizGraph",
} as const;

export const ALEMBIC_INI_FILENAME = "alembic.ini";

/**
 * Directory names skipped during workspace discovery, by exact match. The
 * locator additionally skips any dot-prefixed directory (`.git`, `.venv`,
 * `.tox`, ...) and any `venv`-prefixed directory (`venv`, `venv311`, ...), so
 * those variants need not be enumerated here.
 */
export const SEARCH_SKIP_DIRS: ReadonlySet<string> = new Set([
  "node_modules",
  "env",
  "__pycache__",
  "site-packages",
  "dist",
  "build",
]);

export const DEFAULT_MAX_INI_SEARCH_RESULTS = 50;
export const DEFAULT_MAX_SEARCH_DEPTH = 8;
