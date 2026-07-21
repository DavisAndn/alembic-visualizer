import assert from "node:assert/strict";
import * as path from "path";
import { AlembicProject } from "../../src/alembic/AlembicProject";

describe("AlembicProject", () => {
  it("fromIniPath sets an absolute ini path and cwd = its directory", () => {
    const project = AlembicProject.fromIniPath("/ws/backend/alembic.ini");
    assert.equal(project.iniPath, "/ws/backend/alembic.ini");
    assert.equal(project.cwd, "/ws/backend");
  });

  it("fromIniPath resolves a relative path against process cwd", () => {
    const project = AlembicProject.fromIniPath("rel/alembic.ini");
    assert.equal(project.iniPath, path.resolve("rel/alembic.ini"));
    assert.equal(project.cwd, path.dirname(path.resolve("rel/alembic.ini")));
  });

  it("displayPath is workspace-relative when under the root, else absolute", () => {
    const project = AlembicProject.fromIniPath("/ws/backend/alembic.ini");
    assert.equal(project.displayPath("/ws"), "backend/alembic.ini");
    assert.equal(project.displayPath("/other"), "/ws/backend/alembic.ini");
  });
});
