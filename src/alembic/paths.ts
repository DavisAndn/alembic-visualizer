import * as path from "path";

/**
 * Convert an absolute path to a workspace-relative path (POSIX separators) for
 * persistence. If the target lies outside the workspace root, the absolute path
 * is returned unchanged.
 */
export function toWorkspaceRelative(absPath: string, workspaceRoot: string): string {
  const rel = path.relative(workspaceRoot, absPath);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) {
    return absPath;
  }
  return rel.split(path.sep).join("/");
}

/** Resolve a stored ini path (relative or absolute) to an absolute path. */
export function toAbsolute(storedPath: string, workspaceRoot: string): string {
  return path.isAbsolute(storedPath)
    ? storedPath
    : path.resolve(workspaceRoot, storedPath);
}

/**
 * The chain of directories from `fromDir` up to and including `uptoRoot`,
 * closest first (e.g. `["/ws/a/b", "/ws/a", "/ws"]`). If `fromDir` is not under
 * `uptoRoot`, returns just `[fromDir]`. Used to search for a Python
 * interpreter/venv from the project directory upward to the workspace root.
 */
export function ancestorChain(fromDir: string, uptoRoot: string): string[] {
  const from = path.resolve(fromDir);
  const root = path.resolve(uptoRoot);
  const chain: string[] = [from];
  if (from === root) {
    return chain;
  }
  const rel = path.relative(root, from);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return chain; // fromDir is not inside uptoRoot
  }
  let current = from;
  while (current !== root) {
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    chain.push(parent);
    current = parent;
  }
  return chain;
}
