import assert from "node:assert/strict";
import { GraphPanelController } from "../../src/ui/GraphPanelController";
import type { GraphNode, GraphPayload } from "../../src/generation/types";
import { FakeEditor, FakePanel, FakeUserDialogs } from "../helpers/fakes";

function payload(nodes: GraphNode[], mermaid = "graph TD"): GraphPayload {
  return { version: 1, mermaid, nodes, heads: [], bases: [] };
}

function node(nodeId: string, filePath: string | null, revisionId = "rev"): GraphNode {
  return { nodeId, revisionId, label: "L", filePath };
}

function setup() {
  const panel = new FakePanel();
  const editor = new FakeEditor();
  const dialogs = new FakeUserDialogs();
  let switches = 0;
  const controller = new GraphPanelController(panel, editor, dialogs, () => {
    switches += 1;
  });
  return { panel, editor, dialogs, controller, switchCount: () => switches };
}

describe("GraphPanelController", () => {
  it("registers the message handler exactly once, even across updates", () => {
    const { panel, controller } = setup();
    controller.update(payload([node("n0", "/a.py")]));
    controller.update(payload([node("n0", "/a.py")]));
    assert.equal(panel.handlerCount, 1);
  });

  it("opens the migration file once per click", async () => {
    const { panel, editor, controller } = setup();
    controller.update(payload([node("n0", "/a.py")]));
    controller.update(payload([node("n0", "/a.py")])); // would stack under the old bug
    await panel.emit({ type: "openMigration", nodeId: "n0" });
    assert.deepEqual(editor.opened, ["/a.py"]);
  });

  it("uses the latest graph after an update (no stale closure)", async () => {
    const { panel, editor, controller } = setup();
    controller.update(payload([node("n0", "/old.py")]));
    controller.update(payload([node("n0", "/new.py")]));
    await panel.emit({ type: "openMigration", nodeId: "n0" });
    assert.deepEqual(editor.opened, ["/new.py"]);
  });

  it("warns (no throw) for an unknown node id", async () => {
    const { panel, editor, dialogs, controller } = setup();
    controller.update(payload([node("n0", "/a.py")]));
    await panel.emit({ type: "openMigration", nodeId: "n9" });
    assert.equal(editor.opened.length, 0);
    assert.equal(dialogs.warnings.length, 1);
  });

  it("warns when a node has no associated file path", async () => {
    const { panel, editor, dialogs, controller } = setup();
    controller.update(payload([node("n0", null)]));
    await panel.emit({ type: "openMigration", nodeId: "n0" });
    assert.equal(editor.opened.length, 0);
    assert.equal(dialogs.warnings.length, 1);
  });

  it("reports an error (no unhandled rejection) when the editor throws", async () => {
    const { panel, editor, dialogs, controller } = setup();
    editor.failure = new Error("boom");
    controller.update(payload([node("n0", "/a.py")]));
    await panel.emit({ type: "openMigration", nodeId: "n0" });
    assert.equal(dialogs.errors.length, 1);
    assert.match(dialogs.errors[0], /boom/);
  });

  it("forwards a switchDirectory message to the callback", async () => {
    const { panel, switchCount } = setup();
    await panel.emit({ type: "switchDirectory" });
    assert.equal(switchCount(), 1);
  });

  it("posts a render when the webview reports ready", async () => {
    const { panel, controller } = setup();
    controller.update(payload([node("n0", "/a.py")], "graph TD\n n0"));
    panel.posted.length = 0; // drop the render emitted by update()
    await panel.emit({ type: "ready" });
    const renders = panel.postedOfType("render");
    assert.equal(renders.length, 1);
    assert.equal((renders[0] as { mermaid: string }).mermaid, "graph TD\n n0");
  });

  it("ignores malformed messages", async () => {
    const { panel, editor, dialogs, controller } = setup();
    controller.update(payload([node("n0", "/a.py")]));
    await panel.emit({ type: "bogus" });
    await panel.emit(null);
    assert.equal(editor.opened.length, 0);
    assert.equal(dialogs.warnings.length, 0);
    assert.equal(dialogs.errors.length, 0);
  });
});
