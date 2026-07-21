import assert from "node:assert/strict";
import { buildNodeIndex } from "../../src/ui/buildNodeIndex";
import type { GraphNode, GraphPayload } from "../../src/generation/types";

function payload(nodes: GraphNode[]): GraphPayload {
  return { version: 1, mermaid: "graph TD", nodes, heads: [], bases: [] };
}

describe("buildNodeIndex", () => {
  it("maps node id to node, keeping null file paths", () => {
    const index = buildNodeIndex(
      payload([
        { nodeId: "n0", revisionId: "a", label: "A", filePath: "/a.py" },
        { nodeId: "n1", revisionId: "b", label: "B", filePath: null },
      ]),
    );
    assert.equal(index.size, 2);
    assert.equal(index.get("n0")?.filePath, "/a.py");
    assert.equal(index.get("n1")?.filePath, null);
    assert.equal(index.get("n1")?.revisionId, "b");
  });

  it("is empty for an empty graph", () => {
    assert.equal(buildNodeIndex(payload([])).size, 0);
  });
});
