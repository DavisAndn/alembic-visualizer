import assert from "node:assert/strict";
import { parseGeneratorOutput } from "../../src/generation/parseGeneratorOutput";

const payload = {
  version: 1,
  mermaid: "graph TD",
  nodes: [{ nodeId: "n0", revisionId: "r0", label: "x", filePath: null }],
  heads: [],
  bases: [],
};

describe("parseGeneratorOutput", () => {
  it("parses a valid, non-empty payload", () => {
    const result = parseGeneratorOutput(JSON.stringify(payload), "", 0);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.isEmpty, false);
      assert.equal(result.payload.nodes[0].nodeId, "n0");
    }
  });

  it("flags an empty graph", () => {
    const result = parseGeneratorOutput(
      JSON.stringify({ ...payload, nodes: [] }),
      "",
      0,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.isEmpty, true);
    }
  });

  it("normalizes a missing label/filePath/heads/bases", () => {
    const result = parseGeneratorOutput(
      JSON.stringify({ mermaid: "graph TD", nodes: [{ nodeId: "n0", revisionId: "r0" }] }),
      "",
      0,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.payload.nodes[0].label, "r0");
      assert.equal(result.payload.nodes[0].filePath, null);
      assert.deepEqual(result.payload.heads, []);
    }
  });

  it("rejects non-JSON stdout on a success exit", () => {
    const result = parseGeneratorOutput("not json", "", 0);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.kind, "invalid-json");
    }
  });

  it("rejects a wrong-shape payload", () => {
    const result = parseGeneratorOutput(JSON.stringify({ foo: 1 }), "", 0);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.kind, "invalid-json");
    }
  });

  it("reads a structured error from stderr on a non-zero exit", () => {
    const result = parseGeneratorOutput(
      "",
      JSON.stringify({ error: { type: "CommandError", message: "boom" } }),
      1,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.kind, "python");
      assert.equal(result.failure.pythonType, "CommandError");
      assert.equal(result.failure.message, "boom");
    }
  });

  it("falls back to raw stderr when it is not JSON", () => {
    const result = parseGeneratorOutput("", "Traceback...\nValueError: x", 1);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.failure.kind, "raw");
      assert.match(result.failure.raw, /Traceback/);
    }
  });

  it("treats a null exit code (spawn failure) as a failure", () => {
    const result = parseGeneratorOutput("", "spawn ENOENT", null);
    assert.equal(result.ok, false);
  });
});
