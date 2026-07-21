import assert from "node:assert/strict";
import { FakeFileSystem } from "./FakeFileSystem";

describe("FakeFileSystem (test helper)", () => {
  it("infers ancestor directories from file paths", () => {
    const fs = new FakeFileSystem({
      files: { "/ws/services/billing/alembic.ini": "x" },
    });
    assert.equal(fs.exists("/ws"), true);
    assert.equal(fs.exists("/ws/services"), true);
    assert.equal(fs.exists("/ws/services/billing"), true);
    assert.equal(fs.exists("/ws/services/billing/alembic.ini"), true);
    assert.equal(fs.exists("/ws/nope"), false);
  });

  it("lists immediate children with file/dir kinds", () => {
    const fs = new FakeFileSystem({
      files: { "/ws/alembic.ini": "x", "/ws/services/a.py": "y" },
      emptyDirs: ["/ws/node_modules"],
    });
    const names = fs
      .readDirectory("/ws")
      .map((e) => `${e.name}:${e.isDirectory() ? "d" : "f"}`)
      .sort();
    assert.deepEqual(names, ["alembic.ini:f", "node_modules:d", "services:d"]);
  });

  it("readTextFile returns contents and throws for missing files", () => {
    const fs = new FakeFileSystem({ files: { "/a.txt": "hello" } });
    assert.equal(fs.readTextFile("/a.txt"), "hello");
    assert.throws(() => fs.readTextFile("/missing.txt"));
  });

  it("unreadable directories throw on readDirectory", () => {
    const fs = new FakeFileSystem({
      files: { "/ws/x": "1" },
      unreadableDirs: ["/ws"],
    });
    assert.throws(() => fs.readDirectory("/ws"));
  });
});
