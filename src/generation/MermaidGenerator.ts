import * as path from "path";
import { AlembicProject } from "../alembic/AlembicProject";
import { PythonDetector } from "../python/PythonDetector";
import type { ProcessResult, ProcessRunnerPort } from "../platform/ports";
import { parseGeneratorOutput } from "./parseGeneratorOutput";
import type { ParseResult } from "./types";

const MAX_BUFFER = 10 * 1024 * 1024;

export interface GenerateOptions {
  /** Pass `recursive_version_locations = true` to Alembic. */
  recursive: boolean;
  /** Directories to search for an interpreter, closest first. */
  searchRoots: string[];
}

/**
 * Runs `scripts/mermaid_generator.py` for a resolved project and returns the
 * parsed result. The subprocess cwd is the project's own directory (so nested /
 * non-root projects resolve), and the ini path + recursive flag are passed as
 * arguments. All process interaction is behind {@link ProcessRunnerPort}.
 */
export class MermaidGenerator {
  constructor(
    private readonly extensionPath: string,
    private readonly pythonDetector: PythonDetector,
    private readonly processRunner: ProcessRunnerPort,
  ) {}

  async generate(
    project: AlembicProject,
    options: GenerateOptions,
  ): Promise<ParseResult> {
    const python = this.pythonDetector.detect(options.searchRoots);
    const scriptPath = path.join(
      this.extensionPath,
      "scripts",
      "mermaid_generator.py",
    );
    const args = [scriptPath, project.iniPath, options.recursive ? "true" : "false"];

    let result: ProcessResult;
    try {
      result = await this.processRunner.execFile(python, args, {
        cwd: project.cwd,
        maxBuffer: MAX_BUFFER,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        failure: {
          kind: "raw",
          message: `Failed to run Python (${python}): ${message}`,
          raw: message,
        },
      };
    }

    return parseGeneratorOutput(result.stdout, result.stderr, result.exitCode);
  }
}
