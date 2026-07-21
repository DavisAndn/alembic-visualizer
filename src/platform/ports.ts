/**
 * Host-boundary contracts. Every interaction with `vscode`, the filesystem, the
 * environment, and child processes is expressed here as an interface, so the
 * domain and UI logic can be unit-tested against in-memory fakes. Only the
 * adapters in `vscodeAdapters.ts` (and the thin host classes) implement these.
 */

export interface Disposable {
  dispose(): void;
}

// --- Filesystem seam ---------------------------------------------------------

export interface DirEntry {
  readonly name: string;
  isFile(): boolean;
  isDirectory(): boolean;
}

export interface FileSystemPort {
  /** True if the path exists (file or directory). Never throws. */
  exists(path: string): boolean;
  /** Read a UTF-8 text file. Throws on error. */
  readTextFile(path: string): string;
  /** List a directory's entries. Throws on error (callers may catch). */
  readDirectory(path: string): DirEntry[];
}

// --- Environment seam --------------------------------------------------------

export interface EnvironmentPort {
  /** The user's home directory, or undefined if unknown. */
  homeDir(): string | undefined;
}

// --- Process seam ------------------------------------------------------------

export interface ProcessResult {
  stdout: string;
  stderr: string;
  /** Process exit code; null indicates a spawn failure (e.g. interpreter not found). */
  exitCode: number | null;
}

export interface ProcessRunOptions {
  cwd: string;
  maxBuffer?: number;
}

export interface ProcessRunnerPort {
  /**
   * Run a file with args. Resolves with the captured result for ANY exit code
   * (including non-zero). Rejects only if the result cannot be captured at all.
   */
  execFile(
    file: string,
    args: string[],
    options: ProcessRunOptions,
  ): Promise<ProcessResult>;
}

// --- Extension settings seam -------------------------------------------------

export interface WorkspaceSettingsPort {
  /** Configured `alembicViz.alembicIniPath` (may be relative), or undefined/empty. */
  getAlembicIniPath(): string | undefined;
  setAlembicIniPath(value: string): Promise<void>;
  isRecursiveVersionLocations(): boolean;
  getSearchMaxResults(): number;
}

// --- Python interpreter discovery seam --------------------------------------

export interface InterpreterPathProviderPort {
  /** `python.defaultInterpreterPath` from the Python extension, if set. */
  getDefaultInterpreterPath(): string | undefined;
}

// --- User interaction seam ---------------------------------------------------

export interface QuickPickChoice {
  label: string;
  description?: string;
  detail?: string;
  /** Absolute ini path this choice selects, or a sentinel (e.g. browse). */
  value: string;
}

export interface UserDialogsPort {
  showQuickPick(
    items: QuickPickChoice[],
    placeholder: string,
  ): Promise<QuickPickChoice | undefined>;
  /** Native open dialog filtered to `*.ini`; resolves to an absolute path or undefined. */
  showOpenIniDialog(defaultDir?: string): Promise<string | undefined>;
  showErrorMessage(message: string): void;
  showWarningMessage(message: string): void;
  showInformationMessage(message: string): void;
}

// --- Editor seam -------------------------------------------------------------

export interface EditorPort {
  /** Open a file in a column beside the current one. */
  openFileBeside(fsPath: string): Promise<void>;
}

// --- Webview panel seam ------------------------------------------------------

export interface PanelPort {
  setHtml(html: string): void;
  postMessage(message: unknown): void;
  /** Register a message handler; returns a disposable to unregister it. */
  onDidReceiveMessage(handler: (message: unknown) => void): Disposable;
  reveal(): void;
}
