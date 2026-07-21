import type { DirEntry, FileSystemPort } from "../../src/platform/ports";

export interface FakeFsSpec {
  /** Absolute POSIX file paths → contents. Ancestor directories are inferred. */
  files?: Record<string, string>;
  /** Directories that exist but contain no files. */
  emptyDirs?: string[];
  /** Directories whose `readDirectory` throws (simulates EACCES). */
  unreadableDirs?: string[];
}

/**
 * In-memory {@link FileSystemPort} built from a tree literal. Deterministic and
 * sub-millisecond — no temp directories. Paths use POSIX separators.
 */
export class FakeFileSystem implements FileSystemPort {
  private readonly fileContents = new Map<string, string>();
  private readonly dirs = new Set<string>();
  private readonly children = new Map<string, Map<string, "file" | "dir">>();
  private readonly unreadable = new Set<string>();

  constructor(spec: FakeFsSpec = {}) {
    for (const [p, content] of Object.entries(spec.files ?? {})) {
      this.addFile(p, content);
    }
    for (const d of spec.emptyDirs ?? []) {
      this.addDir(d);
    }
    for (const d of spec.unreadableDirs ?? []) {
      this.addDir(d);
      this.unreadable.add(this.norm(d));
    }
  }

  addFile(path: string, content: string): void {
    const file = this.norm(path);
    this.fileContents.set(file, content);
    const parent = this.parent(file);
    if (parent !== undefined) {
      this.addDir(parent);
      this.childrenOf(parent).set(this.base(file), "file");
    }
  }

  exists(path: string): boolean {
    const p = this.norm(path);
    return this.fileContents.has(p) || this.dirs.has(p);
  }

  readTextFile(path: string): string {
    const content = this.fileContents.get(this.norm(path));
    if (content === undefined) {
      throw new Error(`ENOENT: no such file, open '${path}'`);
    }
    return content;
  }

  readDirectory(path: string): DirEntry[] {
    const p = this.norm(path);
    if (this.unreadable.has(p)) {
      throw new Error(`EACCES: permission denied, scandir '${path}'`);
    }
    if (!this.dirs.has(p)) {
      throw new Error(`ENOENT: no such directory, scandir '${path}'`);
    }
    const entries = this.children.get(p) ?? new Map<string, "file" | "dir">();
    return [...entries.entries()].map(([name, kind]) => ({
      name,
      isFile: () => kind === "file",
      isDirectory: () => kind === "dir",
    }));
  }

  private addDir(dir: string): void {
    let current = this.norm(dir);
    for (;;) {
      this.dirs.add(current);
      const parent = this.parent(current);
      if (parent === undefined || parent === current) {
        break;
      }
      this.childrenOf(parent).set(this.base(current), "dir");
      current = parent;
    }
  }

  private childrenOf(dir: string): Map<string, "file" | "dir"> {
    const key = this.norm(dir);
    let map = this.children.get(key);
    if (!map) {
      map = new Map();
      this.children.set(key, map);
    }
    return map;
  }

  private norm(p: string): string {
    return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
  }

  private parent(p: string): string | undefined {
    const n = this.norm(p);
    const idx = n.lastIndexOf("/");
    if (idx < 0) {
      return undefined;
    }
    return idx === 0 ? "/" : n.slice(0, idx);
  }

  private base(p: string): string {
    const n = this.norm(p);
    const idx = n.lastIndexOf("/");
    return idx < 0 ? n : n.slice(idx + 1);
  }
}
