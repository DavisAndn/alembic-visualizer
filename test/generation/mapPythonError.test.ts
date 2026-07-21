import assert from "node:assert/strict";
import { mapPythonError } from "../../src/generation/mapPythonError";
import type { ParseFailure } from "../../src/generation/types";

function pythonFailure(message: string, raw = ""): ParseFailure {
  return { kind: "python", message, raw };
}

describe("mapPythonError", () => {
  it("maps an unresolved-revision error to a recursion hint", () => {
    const friendly = mapPythonError(
      pythonFailure("Can't locate revision identified by 'abc123'"),
    );
    assert.match(friendly.title, /resolve/i);
    assert.match(friendly.hint ?? "", /recursive|1\.10|version_locations/i);
  });

  it("maps a missing alembic module to an install hint", () => {
    const friendly = mapPythonError(pythonFailure("No module named 'alembic'"));
    assert.match(friendly.title, /not installed/i);
    assert.match(friendly.hint ?? "", /pip install alembic/i);
  });

  it("maps a config/ini problem to a pick-project hint", () => {
    const friendly = mapPythonError(
      pythonFailure("No 'script_location' key found in configuration."),
    );
    assert.match(friendly.title, /configuration/i);
    assert.match(friendly.hint ?? "", /switch project directory/i);
  });

  it("maps invalid-json to a report-a-bug hint", () => {
    const friendly = mapPythonError({
      kind: "invalid-json",
      message: "bad shape",
      raw: "<html>",
    });
    assert.match(friendly.title, /unexpected output/i);
  });

  it("passes a generic failure through with its detail", () => {
    const friendly = mapPythonError({
      kind: "raw",
      message: "something odd",
      raw: "trace",
    });
    assert.match(friendly.title, /failed to generate/i);
    assert.equal(friendly.detail, "something odd");
    assert.equal(friendly.hint, undefined);
  });

  it("detects a missing alembic module even from a raw traceback", () => {
    const friendly = mapPythonError({
      kind: "raw",
      message: "Python script failed",
      raw: "Traceback (most recent call last):\nModuleNotFoundError: No module named 'alembic'",
    });
    assert.match(friendly.title, /not installed/i);
  });
});
