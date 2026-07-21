import { buildNodeIndex } from "./buildNodeIndex";
import { asClientMessage } from "./messages";
import type { HostMessage } from "./messages";
import type { GraphNode, GraphPayload } from "../generation/types";
import type {
  Disposable,
  EditorPort,
  PanelPort,
  UserDialogsPort,
} from "../platform/ports";

/**
 * Owns the message conversation with the webview for a single panel. This is
 * where the two click-to-open bugs are fixed:
 *
 *  - The message handler is registered **exactly once** (in the constructor),
 *    not per command invocation, so listeners never stack.
 *  - The node index is **mutable state** re-assigned by {@link update}, so the
 *    handler always resolves against the latest graph (no stale closures).
 *  - The open path is wrapped in try/catch, so a missing/failed file surfaces a
 *    friendly message instead of an unhandled rejection.
 */
export class GraphPanelController {
  private nodeIndex = new Map<string, GraphNode>();
  private currentMermaid: string | undefined;
  private readonly subscription: Disposable;

  constructor(
    private readonly panel: PanelPort,
    private readonly editor: EditorPort,
    private readonly dialogs: UserDialogsPort,
    private readonly onSwitchDirectory: () => void,
  ) {
    this.subscription = this.panel.onDidReceiveMessage((raw) => this.handle(raw));
  }

  /** Replace the current graph and (re)render it. */
  update(payload: GraphPayload): void {
    this.nodeIndex = buildNodeIndex(payload);
    this.currentMermaid = payload.mermaid;
    this.render();
  }

  dispose(): void {
    this.subscription.dispose();
  }

  private render(): void {
    if (this.currentMermaid !== undefined) {
      const message: HostMessage = { type: "render", mermaid: this.currentMermaid };
      this.panel.postMessage(message);
    }
  }

  private async handle(raw: unknown): Promise<void> {
    const message = asClientMessage(raw);
    if (!message) {
      return;
    }
    switch (message.type) {
      case "ready":
        // The webview finished loading; (re)send the graph so it can render.
        this.render();
        return;
      case "switchDirectory":
        this.onSwitchDirectory();
        return;
      case "openMigration":
        await this.openMigration(message.nodeId);
        return;
    }
  }

  private async openMigration(nodeId: string): Promise<void> {
    const node = this.nodeIndex.get(nodeId);
    if (!node) {
      this.dialogs.showWarningMessage(`Unknown graph node: ${nodeId}.`);
      return;
    }
    if (!node.filePath) {
      this.dialogs.showWarningMessage(
        `No migration file is associated with revision ${node.revisionId}.`,
      );
      return;
    }
    try {
      await this.editor.openFileBeside(node.filePath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.dialogs.showErrorMessage(`Could not open migration file: ${message}`);
    }
  }
}
