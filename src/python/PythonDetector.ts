import * as path from "path";
import type {
  EnvironmentPort,
  FileSystemPort,
  InterpreterPathProviderPort,
} from "../platform/ports";

/**
 * Chooses a Python interpreter, mirroring what a developer's shell would use but
 * without relying on shell init (which does not run for a spawned child).
 *
 * For each search root (closest first): a pyenv interpreter named by
 * `.python-version`, else a `.venv` / `venv` / `venv*` interpreter. Failing all
 * roots: the configured `python.defaultInterpreterPath`, else `"python3"`.
 */
export class PythonDetector {
  constructor(
    private readonly interpreterPaths: InterpreterPathProviderPort,
    private readonly fs: FileSystemPort,
    private readonly env: EnvironmentPort,
  ) {}

  detect(searchRoots: string[]): string {
    for (const root of searchRoots) {
      const fromPyenv = this.fromPyenv(root);
      if (fromPyenv) {
        return fromPyenv;
      }
      const fromVenv = this.fromVenv(root);
      if (fromVenv) {
        return fromVenv;
      }
    }
    const configured = this.interpreterPaths.getDefaultInterpreterPath();
    if (configured) {
      return configured;
    }
    return "python3";
  }

  private fromPyenv(root: string): string | undefined {
    const pvFile = path.join(root, ".python-version");
    if (!this.fs.exists(pvFile)) {
      return undefined;
    }
    let version: string;
    try {
      version = this.fs.readTextFile(pvFile).trim();
    } catch {
      return undefined;
    }
    if (!version) {
      return undefined;
    }
    const home = this.env.homeDir();
    if (!home) {
      return undefined;
    }
    const candidate = path.join(
      home,
      ".pyenv",
      "versions",
      version,
      "bin",
      "python",
    );
    return this.fs.exists(candidate) ? candidate : undefined;
  }

  private fromVenv(root: string): string | undefined {
    for (const dir of [".venv", "venv"]) {
      const candidate = path.join(root, dir, "bin", "python");
      if (this.fs.exists(candidate)) {
        return candidate;
      }
    }
    let venvDirs: string[];
    try {
      venvDirs = this.fs
        .readDirectory(root)
        .filter((e) => e.isDirectory() && e.name.startsWith("venv"))
        .map((e) => e.name)
        .sort();
    } catch {
      return undefined;
    }
    for (const dir of venvDirs) {
      const candidate = path.join(root, dir, "bin", "python");
      if (this.fs.exists(candidate)) {
        return candidate;
      }
    }
    return undefined;
  }
}
