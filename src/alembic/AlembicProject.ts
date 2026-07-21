import * as path from "path";

/**
 * Value object for a resolved Alembic project: the absolute `alembic.ini` path
 * plus the working directory the generator runs in (the ini's own directory).
 * Setting cwd to the ini directory — not the workspace root — is what makes
 * nested / non-root projects work.
 */
export class AlembicProject {
  private constructor(
    readonly iniPath: string,
    readonly cwd: string,
  ) {}

  static fromIniPath(iniPath: string): AlembicProject {
    const abs = path.resolve(iniPath);
    return new AlembicProject(abs, path.dirname(abs));
  }

  /** A short label for the UI, workspace-relative when the ini is under the root. */
  displayPath(workspaceRoot?: string): string {
    if (workspaceRoot) {
      const rel = path.relative(workspaceRoot, this.iniPath);
      if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) {
        return rel.split(path.sep).join("/");
      }
    }
    return this.iniPath;
  }
}
