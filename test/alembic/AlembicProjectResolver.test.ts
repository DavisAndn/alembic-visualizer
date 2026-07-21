import assert from "node:assert/strict";
import { AlembicIniLocator } from "../../src/alembic/AlembicIniLocator";
import {
  AlembicProjectResolver,
  BROWSE_SENTINEL,
} from "../../src/alembic/AlembicProjectResolver";
import { FakeFileSystem } from "../helpers/FakeFileSystem";
import { FakeUserDialogs, FakeWorkspaceSettings } from "../helpers/fakes";

const ROOT = "/ws";

function build(opts: {
  fs: FakeFileSystem;
  settings?: FakeWorkspaceSettings;
  dialogs?: FakeUserDialogs;
}) {
  const settings = opts.settings ?? new FakeWorkspaceSettings();
  const dialogs = opts.dialogs ?? new FakeUserDialogs();
  const locator = new AlembicIniLocator([ROOT], opts.fs);
  const resolver = new AlembicProjectResolver(
    ROOT,
    settings,
    dialogs,
    opts.fs,
    locator,
  );
  return { resolver, settings, dialogs };
}

describe("AlembicProjectResolver", () => {
  it("resolveForShow uses a valid persisted path without prompting or re-persisting", async () => {
    const fs = new FakeFileSystem({
      files: { "/ws/backend/alembic.ini": "", "/ws/other/alembic.ini": "" },
    });
    const settings = new FakeWorkspaceSettings({ iniPath: "backend/alembic.ini" });
    const { resolver, dialogs } = build({ fs, settings });

    const project = await resolver.resolveForShow();

    assert.equal(project?.iniPath, "/ws/backend/alembic.ini");
    assert.equal(project?.cwd, "/ws/backend");
    assert.equal(dialogs.quickPickCalls.length, 0);
    assert.equal(dialogs.openDialogCalls.length, 0);
    assert.deepEqual(settings.setCalls, []);
  });

  it("auto-selects and persists when exactly one project is discovered", async () => {
    const fs = new FakeFileSystem({ files: { "/ws/backend/alembic.ini": "" } });
    const { resolver, dialogs, settings } = build({ fs });

    const project = await resolver.resolveForShow();

    assert.equal(project?.iniPath, "/ws/backend/alembic.ini");
    assert.equal(dialogs.quickPickCalls.length, 0);
    assert.deepEqual(settings.setCalls, ["backend/alembic.ini"]);
  });

  it("prompts a QuickPick (with a Browse entry) and persists the choice", async () => {
    const fs = new FakeFileSystem({
      files: { "/ws/a/alembic.ini": "", "/ws/b/alembic.ini": "" },
    });
    const dialogs = new FakeUserDialogs();
    dialogs.quickPickResponse = (items) =>
      items.find((i) => i.value === "/ws/b/alembic.ini");
    const { resolver, settings } = build({ fs, dialogs });

    const project = await resolver.resolveForShow();

    assert.equal(project?.iniPath, "/ws/b/alembic.ini");
    assert.equal(dialogs.quickPickCalls.length, 1);
    assert.ok(
      dialogs.quickPickCalls[0].items.some((i) => i.value === BROWSE_SENTINEL),
      "QuickPick should include a Browse entry",
    );
    assert.deepEqual(settings.setCalls, ["b/alembic.ini"]);
  });

  it("opens the browse dialog when nothing is discovered and persists (absolute when outside root)", async () => {
    const fs = new FakeFileSystem({ files: { "/ws/readme.md": "" } });
    const dialogs = new FakeUserDialogs();
    dialogs.openDialogResponse = "/elsewhere/alembic.ini";
    const { resolver, settings } = build({ fs, dialogs });

    const project = await resolver.resolveForShow();

    assert.equal(project?.iniPath, "/elsewhere/alembic.ini");
    assert.equal(dialogs.openDialogCalls.length, 1);
    assert.deepEqual(settings.setCalls, ["/elsewhere/alembic.ini"]);
  });

  it("returns undefined (quiet abort) when the browse dialog is cancelled", async () => {
    const fs = new FakeFileSystem({ files: { "/ws/readme.md": "" } });
    const dialogs = new FakeUserDialogs(); // openDialogResponse stays undefined
    const { resolver, settings } = build({ fs, dialogs });

    const project = await resolver.resolveForShow();

    assert.equal(project, undefined);
    assert.deepEqual(settings.setCalls, []);
    assert.equal(dialogs.errors.length, 0);
  });

  it("resolveForSwitch prompts even when a valid persisted path exists", async () => {
    const fs = new FakeFileSystem({
      files: { "/ws/a/alembic.ini": "", "/ws/b/alembic.ini": "" },
    });
    const settings = new FakeWorkspaceSettings({ iniPath: "a/alembic.ini" });
    const dialogs = new FakeUserDialogs();
    dialogs.quickPickResponse = (items) =>
      items.find((i) => i.value === "/ws/b/alembic.ini");
    const { resolver } = build({ fs, settings, dialogs });

    const project = await resolver.resolveForSwitch();

    assert.equal(project?.iniPath, "/ws/b/alembic.ini");
    assert.equal(dialogs.quickPickCalls.length, 1);
    assert.deepEqual(settings.setCalls, ["b/alembic.ini"]);
  });

  it("falls back to browse from the QuickPick when Browse is chosen", async () => {
    const fs = new FakeFileSystem({
      files: { "/ws/a/alembic.ini": "", "/ws/b/alembic.ini": "" },
    });
    const dialogs = new FakeUserDialogs();
    dialogs.quickPickResponse = (items) =>
      items.find((i) => i.value === BROWSE_SENTINEL);
    dialogs.openDialogResponse = "/ws/a/alembic.ini";
    const { resolver, settings } = build({ fs, dialogs });

    const project = await resolver.resolveForSwitch();

    assert.equal(project?.iniPath, "/ws/a/alembic.ini");
    assert.equal(dialogs.openDialogCalls.length, 1);
    assert.deepEqual(settings.setCalls, ["a/alembic.ini"]);
  });
});
