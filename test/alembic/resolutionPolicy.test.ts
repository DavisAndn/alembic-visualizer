import assert from "node:assert/strict";
import { decideResolution } from "../../src/alembic/resolutionPolicy";

describe("decideResolution", () => {
  it("uses the persisted path when it still exists", () => {
    assert.deepEqual(
      decideResolution({
        persistedPath: "/ws/alembic.ini",
        persistedExists: true,
        discovered: ["/ws/alembic.ini", "/x/alembic.ini"],
      }),
      { kind: "use", iniPath: "/ws/alembic.ini", source: "persisted" },
    );
  });

  it("ignores a persisted path that no longer exists", () => {
    assert.deepEqual(
      decideResolution({
        persistedPath: "/gone/alembic.ini",
        persistedExists: false,
        discovered: ["/ws/alembic.ini"],
      }),
      { kind: "use", iniPath: "/ws/alembic.ini", source: "auto" },
    );
  });

  it("auto-selects when exactly one project is discovered", () => {
    assert.deepEqual(
      decideResolution({ persistedExists: false, discovered: ["/ws/alembic.ini"] }),
      { kind: "use", iniPath: "/ws/alembic.ini", source: "auto" },
    );
  });

  it("prompts a pick when several are discovered", () => {
    assert.deepEqual(
      decideResolution({
        persistedExists: false,
        discovered: ["/a/alembic.ini", "/b/alembic.ini"],
      }),
      { kind: "pick", candidates: ["/a/alembic.ini", "/b/alembic.ini"] },
    );
  });

  it("browses when nothing is discovered", () => {
    assert.deepEqual(
      decideResolution({ persistedExists: false, discovered: [] }),
      { kind: "browse" },
    );
  });

  it("forceSwitch prompts even when a valid persisted path exists", () => {
    assert.deepEqual(
      decideResolution({
        persistedPath: "/ws/alembic.ini",
        persistedExists: true,
        discovered: ["/ws/alembic.ini", "/b/alembic.ini"],
        forceSwitch: true,
      }),
      { kind: "pick", candidates: ["/ws/alembic.ini", "/b/alembic.ini"] },
    );
  });

  it("forceSwitch browses when nothing is discovered", () => {
    assert.deepEqual(
      decideResolution({
        persistedPath: "/ws/alembic.ini",
        persistedExists: true,
        discovered: [],
        forceSwitch: true,
      }),
      { kind: "browse" },
    );
  });
});
