import assert from "node:assert/strict";
import * as path from "path";
import { AlembicProject } from "../../src/alembic/AlembicProject";
import { MermaidGenerator } from "../../src/generation/MermaidGenerator";
import { PythonDetector } from "../../src/python/PythonDetector";
import { FakeFileSystem } from "../helpers/FakeFileSystem";
import {
  FakeEnvironment,
  FakeInterpreterPathProvider,
  FakeProcessRunner,
} from "../helpers/fakes";

const EXT = "/ext";
const SCRIPT = path.join(EXT, "scripts", "mermaid_generator.py");
const project = AlembicProject.fromIniPath("/ws/backend/alembic.ini");

const payload = {
  version: 1,
  mermaid: 'graph TD\n  n0["init"]',
  nodes: [
    { nodeId: "n0", revisionId: "abc", label: "init", filePath: "/ws/backend/versions/abc.py" },
  ],
  heads: ["abc"],
  bases: ["abc"],
};

function makeGenerator(runner: FakeProcessRunner): MermaidGenerator {
  // Empty fs + configured interpreter → detect() returns the configured path.
  const detector = new PythonDetector(
    new FakeInterpreterPathProvider("/usr/bin/python3"),
    new FakeFileSystem(),
    new FakeEnvironment(),
  );
  return new MermaidGenerator(EXT, detector, runner);
}

describe("MermaidGenerator", () => {
  it("runs the script with the ini path, recursive flag, and cwd = project.cwd", async () => {
    const runner = new FakeProcessRunner().enqueue({
      stdout: JSON.stringify(payload),
      stderr: "",
      exitCode: 0,
    });
    await makeGenerator(runner).generate(project, {
      recursive: true,
      searchRoots: ["/ws/backend", "/ws"],
    });

    const call = runner.lastCall;
    assert.ok(call);
    assert.equal(call.file, "/usr/bin/python3");
    assert.deepEqual(call.args, [SCRIPT, "/ws/backend/alembic.ini", "true"]);
    assert.equal(call.options.cwd, "/ws/backend");
  });

  it("passes 'false' when recursive is disabled", async () => {
    const runner = new FakeProcessRunner().enqueue({
      stdout: JSON.stringify(payload),
      stderr: "",
      exitCode: 0,
    });
    await makeGenerator(runner).generate(project, {
      recursive: false,
      searchRoots: ["/ws"],
    });
    assert.equal(runner.lastCall?.args[2], "false");
  });

  it("returns a parsed payload on success", async () => {
    const runner = new FakeProcessRunner().enqueue({
      stdout: JSON.stringify(payload),
      stderr: "",
      exitCode: 0,
    });
    const result = await makeGenerator(runner).generate(project, {
      recursive: true,
      searchRoots: ["/ws"],
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.payload.nodes.length, 1);
      assert.equal(result.isEmpty, false);
    }
  });

  it("maps a spawn failure (rejected runner) to a raw failure", async () => {
    const runner = new FakeProcessRunner().enqueue(new Error("spawn python3 ENOENT"));
    const result = await makeGenerator(runner).generate(project, {
      recursive: true,
      searchRoots: ["/ws"],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.failure.message, /ENOENT/);
    }
  });

  it("surfaces a structured python error (exit 1, JSON on stderr)", async () => {
    const runner = new FakeProcessRunner().enqueue({
      stdout: "",
      stderr: JSON.stringify({
        error: { type: "CommandError", message: "Can't locate revision identified by 'x'" },
      }),
      exitCode: 1,
    });
    const result = await makeGenerator(runner).generate(project, {
      recursive: true,
      searchRoots: ["/ws"],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.kind, "python");
      assert.match(result.failure.message, /locate revision/);
    }
  });
});
