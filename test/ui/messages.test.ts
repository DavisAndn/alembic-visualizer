import assert from "node:assert/strict";
import { asClientMessage } from "../../src/ui/messages";

describe("asClientMessage", () => {
  it("accepts ready and switchDirectory", () => {
    assert.deepEqual(asClientMessage({ type: "ready" }), { type: "ready" });
    assert.deepEqual(asClientMessage({ type: "switchDirectory" }), {
      type: "switchDirectory",
    });
  });

  it("accepts openMigration with a string nodeId", () => {
    assert.deepEqual(asClientMessage({ type: "openMigration", nodeId: "n3" }), {
      type: "openMigration",
      nodeId: "n3",
    });
  });

  it("rejects openMigration without a string nodeId", () => {
    assert.equal(asClientMessage({ type: "openMigration" }), undefined);
    assert.equal(asClientMessage({ type: "openMigration", nodeId: 3 }), undefined);
  });

  it("rejects unknown or malformed messages", () => {
    assert.equal(asClientMessage(null), undefined);
    assert.equal(asClientMessage("ready"), undefined);
    assert.equal(asClientMessage({ type: "nope" }), undefined);
  });
});
