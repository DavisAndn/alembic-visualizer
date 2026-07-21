import assert from "node:assert/strict";
import { AlembicIniLocator } from "../../src/alembic/AlembicIniLocator";
import { FakeFileSystem } from "../helpers/FakeFileSystem";

describe("AlembicIniLocator", () => {
  it("finds a root-level alembic.ini", () => {
    const fs = new FakeFileSystem({ files: { "/ws/alembic.ini": "" } });
    const locator = new AlembicIniLocator(["/ws"], fs);
    assert.deepEqual(locator.findCandidates(), ["/ws/alembic.ini"]);
  });

  it("discovers nested alembic.ini files (shallowest-first, then alpha)", () => {
    const fs = new FakeFileSystem({
      files: {
        "/ws/alembic.ini": "",
        "/ws/services/billing/alembic.ini": "",
        "/ws/services/auth/alembic.ini": "",
      },
    });
    const locator = new AlembicIniLocator(["/ws"], fs);
    assert.deepEqual(locator.findCandidates(), [
      "/ws/alembic.ini",
      "/ws/services/auth/alembic.ini",
      "/ws/services/billing/alembic.ini",
    ]);
  });

  it("skips node_modules, dot-dirs, and venv* dirs", () => {
    const fs = new FakeFileSystem({
      files: {
        "/ws/alembic.ini": "",
        "/ws/node_modules/pkg/alembic.ini": "",
        "/ws/.venv/lib/alembic.ini": "",
        "/ws/venv311/lib/alembic.ini": "",
        "/ws/.git/alembic.ini": "",
      },
    });
    const locator = new AlembicIniLocator(["/ws"], fs);
    assert.deepEqual(locator.findCandidates(), ["/ws/alembic.ini"]);
  });

  it("respects maxDepth", () => {
    const fs = new FakeFileSystem({
      files: { "/ws/a/b/c/d/alembic.ini": "" },
    });
    const locator = new AlembicIniLocator(["/ws"], fs, { maxDepth: 2 });
    assert.deepEqual(locator.findCandidates(), []);
  });

  it("caps results at maxResults, keeping the shallowest", () => {
    const fs = new FakeFileSystem({
      files: {
        "/ws/alembic.ini": "",
        "/ws/a/alembic.ini": "",
        "/ws/b/alembic.ini": "",
      },
    });
    const locator = new AlembicIniLocator(["/ws"], fs, { maxResults: 2 });
    assert.deepEqual(locator.findCandidates(), [
      "/ws/alembic.ini",
      "/ws/a/alembic.ini",
    ]);
  });

  it("does not throw when a directory is unreadable", () => {
    const fs = new FakeFileSystem({
      files: { "/ws/ok/alembic.ini": "" },
      unreadableDirs: ["/ws/secret"],
    });
    const locator = new AlembicIniLocator(["/ws"], fs);
    assert.deepEqual(locator.findCandidates(), ["/ws/ok/alembic.ini"]);
  });

  it("merges and dedupes across multiple workspace roots", () => {
    const fs = new FakeFileSystem({
      files: { "/a/alembic.ini": "", "/b/svc/alembic.ini": "" },
    });
    const locator = new AlembicIniLocator(["/a", "/b"], fs);
    assert.deepEqual(locator.findCandidates(), [
      "/a/alembic.ini",
      "/b/svc/alembic.ini",
    ]);
  });

  it("returns [] when nothing is found", () => {
    const fs = new FakeFileSystem({ files: { "/ws/readme.md": "" } });
    const locator = new AlembicIniLocator(["/ws"], fs);
    assert.deepEqual(locator.findCandidates(), []);
  });
});
