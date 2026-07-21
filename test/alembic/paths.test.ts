import assert from "node:assert/strict";
import * as path from "path";
import {
  ancestorChain,
  toAbsolute,
  toWorkspaceRelative,
} from "../../src/alembic/paths";

describe("paths", () => {
  const root = "/home/me/proj";

  it("toWorkspaceRelative makes a relative POSIX path under the root", () => {
    assert.equal(toWorkspaceRelative("/home/me/proj/alembic.ini", root), "alembic.ini");
    assert.equal(
      toWorkspaceRelative("/home/me/proj/backend/alembic.ini", root),
      "backend/alembic.ini",
    );
  });

  it("toWorkspaceRelative keeps the absolute path when outside the root", () => {
    assert.equal(
      toWorkspaceRelative("/other/place/alembic.ini", root),
      "/other/place/alembic.ini",
    );
  });

  it("toAbsolute resolves relative against the root and passes absolute through", () => {
    assert.equal(
      toAbsolute("backend/alembic.ini", root),
      path.resolve(root, "backend/alembic.ini"),
    );
    assert.equal(toAbsolute("/abs/alembic.ini", root), "/abs/alembic.ini");
  });

  it("round-trips a path under the root", () => {
    const abs = path.resolve(root, "svc/api/alembic.ini");
    assert.equal(toAbsolute(toWorkspaceRelative(abs, root), root), abs);
  });

  it("ancestorChain lists dirs closest-first up to the root", () => {
    assert.deepEqual(ancestorChain("/ws/a/b", "/ws"), ["/ws/a/b", "/ws/a", "/ws"]);
    assert.deepEqual(ancestorChain("/ws", "/ws"), ["/ws"]);
  });

  it("ancestorChain returns just the dir when it is outside the root", () => {
    assert.deepEqual(ancestorChain("/other/place", "/ws"), ["/other/place"]);
  });
});
