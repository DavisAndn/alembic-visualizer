import assert from "node:assert/strict";
import { extractSyntheticNodeId, NODE_ID_EXTRACTOR_JS } from "../../src/ui/nodeId";

describe("extractSyntheticNodeId", () => {
  it("strips the flowchart- prefix and the -<counter> suffix", () => {
    assert.equal(extractSyntheticNodeId("flowchart-n0-1"), "n0");
    assert.equal(extractSyntheticNodeId("flowchart-n12-3"), "n12");
  });

  it("handles multi-digit counters", () => {
    assert.equal(extractSyntheticNodeId("flowchart-n0-10"), "n0");
  });

  it("handles ids with no counter suffix", () => {
    assert.equal(extractSyntheticNodeId("flowchart-n5"), "n5");
  });

  it("recovers a bare synthetic id with no prefix (drift-resistant)", () => {
    assert.equal(extractSyntheticNodeId("n7"), "n7");
  });

  it("returns null for junk / non-synthetic ids", () => {
    assert.equal(extractSyntheticNodeId(""), null);
    assert.equal(extractSyntheticNodeId("flowchart--1"), null);
    assert.equal(extractSyntheticNodeId("flowchart-node"), null);
    assert.equal(extractSyntheticNodeId("garbage"), null);
  });

  it("the embedded webview snippet behaves identically to the TS function", () => {
    const browserFn = new Function(
      "domId",
      `${NODE_ID_EXTRACTOR_JS}\nreturn extractSyntheticNodeId(domId);`,
    ) as (domId: string) => string | null;

    const cases = [
      "flowchart-n0-1",
      "flowchart-n12-3",
      "flowchart-n0-10",
      "flowchart-n5",
      "n7",
      "",
      "flowchart--1",
      "flowchart-node",
      "garbage",
    ];
    for (const input of cases) {
      assert.equal(
        browserFn(input),
        extractSyntheticNodeId(input),
        `snippet/TS mismatch for "${input}"`,
      );
    }
  });
});
