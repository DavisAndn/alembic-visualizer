import assert from "node:assert/strict";
import { PythonDetector } from "../../src/python/PythonDetector";
import { FakeFileSystem } from "../helpers/FakeFileSystem";
import { FakeEnvironment, FakeInterpreterPathProvider } from "../helpers/fakes";

const HOME = "/home/me";

function detector(fs: FakeFileSystem, configured?: string): PythonDetector {
  return new PythonDetector(
    new FakeInterpreterPathProvider(configured),
    fs,
    new FakeEnvironment(HOME),
  );
}

describe("PythonDetector", () => {
  it("prefers a pyenv interpreter from .python-version when the binary exists", () => {
    const fs = new FakeFileSystem({
      files: {
        "/proj/.python-version": "3.11.4\n",
        "/home/me/.pyenv/versions/3.11.4/bin/python": "",
      },
    });
    assert.equal(
      detector(fs).detect(["/proj"]),
      "/home/me/.pyenv/versions/3.11.4/bin/python",
    );
  });

  it("ignores .python-version when the pyenv binary is absent, falling through", () => {
    const fs = new FakeFileSystem({
      files: { "/proj/.python-version": "3.11.4\n", "/proj/.venv/bin/python": "" },
    });
    assert.equal(detector(fs).detect(["/proj"]), "/proj/.venv/bin/python");
  });

  it("finds .venv/bin/python", () => {
    const fs = new FakeFileSystem({ files: { "/proj/.venv/bin/python": "" } });
    assert.equal(detector(fs).detect(["/proj"]), "/proj/.venv/bin/python");
  });

  it("finds an arbitrary venv* directory", () => {
    const fs = new FakeFileSystem({ files: { "/proj/venv311/bin/python": "" } });
    assert.equal(detector(fs).detect(["/proj"]), "/proj/venv311/bin/python");
  });

  it("prefers a closer search root over a farther one", () => {
    const fs = new FakeFileSystem({
      files: { "/ws/.venv/bin/python": "", "/ws/proj/.venv/bin/python": "" },
    });
    assert.equal(
      detector(fs).detect(["/ws/proj", "/ws"]),
      "/ws/proj/.venv/bin/python",
    );
  });

  it("falls back to the configured interpreter", () => {
    const fs = new FakeFileSystem({ files: { "/proj/readme": "" } });
    assert.equal(
      detector(fs, "/usr/bin/python3.12").detect(["/proj"]),
      "/usr/bin/python3.12",
    );
  });

  it("falls back to python3 when nothing resolves", () => {
    const fs = new FakeFileSystem({ files: { "/proj/readme": "" } });
    assert.equal(detector(fs).detect(["/proj"]), "python3");
  });

  it("skips non-existent search roots without throwing", () => {
    const fs = new FakeFileSystem({ files: { "/ws/.venv/bin/python": "" } });
    assert.equal(detector(fs).detect(["/ghost", "/ws"]), "/ws/.venv/bin/python");
  });
});
