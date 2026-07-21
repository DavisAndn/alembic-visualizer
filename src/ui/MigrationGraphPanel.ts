import * as vscode from "vscode";
import { GraphPanelController } from "./GraphPanelController";
import { makeNonce } from "./nonce";
import {
  getEmptyHtml,
  getErrorHtml,
  getGraphHtml,
  getLoadingHtml,
} from "./webviewHtml";
import { VscodePanel } from "../platform/vscodeAdapters";
import type { EditorPort, UserDialogsPort } from "../platform/ports";
import type { FriendlyError, GraphPayload } from "../generation/types";

const MERMAID_ASSET = "mermaid.esm.min.mjs";

/**
 * Thin host wrapper around a single {@link vscode.WebviewPanel}. Owns the
 * {@link GraphPanelController} (message handling) and renders the loading /
 * graph / empty / error states. Bundled Mermaid is loaded from the extension's
 * `media/` folder via `asWebviewUri` — no CDN.
 */
export class MigrationGraphPanel {
  private readonly controller: GraphPanelController;
  private readonly mermaidAsset: vscode.Uri;
  private disposed = false;

  constructor(
    private readonly panel: vscode.WebviewPanel,
    mediaRoot: vscode.Uri,
    editor: EditorPort,
    dialogs: UserDialogsPort,
    onSwitchDirectory: () => void,
    onDispose: () => void,
  ) {
    this.mermaidAsset = vscode.Uri.joinPath(mediaRoot, MERMAID_ASSET);
    this.controller = new GraphPanelController(
      new VscodePanel(panel),
      editor,
      dialogs,
      onSwitchDirectory,
    );
    panel.onDidDispose(() => {
      this.disposed = true;
      this.controller.dispose();
      onDispose();
    });
  }

  reveal(): void {
    if (!this.disposed) {
      this.panel.reveal(vscode.ViewColumn.One);
    }
  }

  showLoading(): void {
    this.setHtml(getLoadingHtml());
  }

  showError(error: FriendlyError): void {
    this.setHtml(getErrorHtml(error));
  }

  showEmpty(projectLabel: string): void {
    this.setHtml(getEmptyHtml(projectLabel));
  }

  showGraph(payload: GraphPayload, projectLabel: string): void {
    if (this.disposed) {
      return;
    }
    const mermaidUri = this.panel.webview.asWebviewUri(this.mermaidAsset).toString();
    this.setHtml(
      getGraphHtml({
        nonce: makeNonce(),
        mermaidUri,
        cspSource: this.panel.webview.cspSource,
        projectLabel,
      }),
    );
    this.controller.update(payload);
  }

  private setHtml(html: string): void {
    if (!this.disposed) {
      this.panel.webview.html = html;
    }
  }
}
