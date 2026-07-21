import { NODE_ID_EXTRACTOR_JS } from "./nodeId";
import { BRAND } from "../constants";
import type { FriendlyError } from "../generation/types";

export interface GraphHtmlOptions {
  /** Per-load random nonce that authorizes the inline module script. */
  nonce: string;
  /** `webview.asWebviewUri(...)` for the bundled Mermaid ESM module. */
  mermaidUri: string;
  /** `webview.cspSource` for the panel. */
  cspSource: string;
  /** Short label of the resolved project, shown in the toolbar. */
  projectLabel: string;
}

const BASE_STYLE = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: var(--vscode-font-family, system-ui, sans-serif);
    color: var(--vscode-editor-foreground);
    background: var(--vscode-editor-background);
  }
  #toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; align-items: center; gap: 10px;
    padding: 8px 14px;
    background: var(--vscode-editorWidget-background, var(--vscode-editor-background));
    border-bottom: 1px solid var(--vscode-editorWidget-border, rgba(128,128,128,0.35));
    font-size: 12px;
  }
  #toolbar button {
    font: inherit;
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    background: var(--vscode-button-secondaryBackground, rgba(128,128,128,0.2));
    border: none; border-radius: 4px; padding: 3px 10px; cursor: pointer;
  }
  #toolbar button:hover { background: var(--vscode-button-secondaryHoverBackground, rgba(128,128,128,0.35)); }
  #toolbar .spacer { margin-left: auto; color: var(--vscode-descriptionForeground); }
  .project-label { color: var(--vscode-descriptionForeground); }
  #graph-container { padding: 20px; transform-origin: top center; }
  #graph-container .node { cursor: pointer; }
`;

/** Simple spinner while the graph is generated. */
export function getLoadingHtml(): string {
  return page(
    `<style>
      ${BASE_STYLE}
      .center { display: flex; align-items: center; justify-content: center; gap: 12px; height: 100vh; }
      .spinner { width: 22px; height: 22px; border: 3px solid var(--vscode-descriptionForeground);
                 border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
    </style>`,
    `<div class="center"><div class="spinner"></div><span>Generating migration graph…</span></div>`,
  );
}

/** Actionable error panel (never a raw traceback). */
export function getErrorHtml(error: FriendlyError): string {
  const hint = error.hint
    ? `<p class="hint">${escapeHtml(error.hint)}</p>`
    : "";
  return page(
    `<style>
      ${BASE_STYLE}
      .wrap { padding: 28px 32px; line-height: 1.6; max-width: 820px; }
      h2 { color: var(--vscode-errorForeground); margin-top: 0; }
      pre { white-space: pre-wrap; word-break: break-word;
            background: var(--vscode-textCodeBlock-background, rgba(128,128,128,0.15));
            padding: 12px 14px; border-radius: 6px; overflow-x: auto; }
      .hint { color: var(--vscode-descriptionForeground); }
    </style>`,
    `<div class="wrap">
      <h2>${escapeHtml(error.title)}</h2>
      <pre>${escapeHtml(error.detail)}</pre>
      ${hint}
    </div>`,
  );
}

/** Friendly empty-state when the project has no migrations. */
export function getEmptyHtml(projectLabel: string): string {
  return page(
    `<style>
      ${BASE_STYLE}
      .wrap { padding: 28px 32px; line-height: 1.6; max-width: 820px; }
      h2 { margin-top: 0; }
      .hint { color: var(--vscode-descriptionForeground); }
    </style>`,
    `<div class="wrap">
      <h2>No migrations found</h2>
      <p class="project-label">${escapeHtml(projectLabel)}</p>
      <p class="hint">If your migrations live in sub-folders of <code>versions/</code>, make sure
      Alembic ≥ 1.10 is installed (recursive version locations is enabled by default), or add the
      folders to <code>version_locations</code> in your <code>alembic.ini</code>.</p>
    </div>`,
  );
}

/**
 * The interactive graph. Mermaid is loaded from the bundled module (no CDN); the
 * only inline script is authorized by a nonce under a strict CSP. The graph
 * source itself is delivered over postMessage (no string interpolation into the
 * document), so arbitrary revision text can never break out of the markup.
 */
export function getGraphHtml(options: GraphHtmlOptions): string {
  const { nonce, mermaidUri, cspSource, projectLabel } = options;
  const csp = [
    `default-src 'none'`,
    `img-src ${cspSource} data:`,
    `font-src ${cspSource} data:`,
    `style-src ${cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}' ${cspSource}`,
  ].join("; ");

  const script = `
    import mermaid from "${mermaidUri}";

    ${NODE_ID_EXTRACTOR_JS}

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "dark",
      flowchart: { useMaxWidth: false, htmlLabels: false, curve: "basis", rankSpacing: 40, nodeSpacing: 30 },
    });

    const vscode = acquireVsCodeApi();
    const container = document.getElementById("graph-container");
    let scale = 1;

    function applyScale() {
      container.style.transform = "scale(" + scale + ")";
      document.getElementById("zoom-label").textContent = Math.round(scale * 100) + "%";
    }
    function attachClickHandlers() {
      container.querySelectorAll(".node").forEach(function (node) {
        node.addEventListener("click", function () {
          const nodeId = extractSyntheticNodeId(node.id);
          if (nodeId) { vscode.postMessage({ type: "openMigration", nodeId: nodeId }); }
        });
      });
    }
    async function renderGraph(definition) {
      try {
        const rendered = await mermaid.render("alembic-graph-svg", definition);
        container.innerHTML = rendered.svg;
        attachClickHandlers();
      } catch (err) {
        container.textContent = "Failed to render graph: " + err;
      }
    }

    window.addEventListener("message", function (event) {
      const message = event.data;
      if (message && message.type === "render") { renderGraph(message.mermaid); }
    });
    document.getElementById("switch-btn").addEventListener("click", function () {
      vscode.postMessage({ type: "switchDirectory" });
    });
    document.getElementById("zoom-in").addEventListener("click", function () { scale = Math.min(scale + 0.15, 3); applyScale(); });
    document.getElementById("zoom-out").addEventListener("click", function () { scale = Math.max(scale - 0.15, 0.2); applyScale(); });
    document.getElementById("zoom-reset").addEventListener("click", function () { scale = 1; applyScale(); });

    vscode.postMessage({ type: "ready" });
  `;

  return page(
    `<meta http-equiv="Content-Security-Policy" content="${csp}">
     <style>${BASE_STYLE}</style>`,
    `<div id="toolbar">
      <button id="switch-btn" title="Choose a different Alembic project">Switch project</button>
      <span class="spacer"></span>
      <button id="zoom-out" aria-label="Zoom out">&minus;</button>
      <button id="zoom-reset">Reset</button>
      <button id="zoom-in" aria-label="Zoom in">+</button>
      <span id="zoom-label">100%</span>
    </div>
    <div id="subheader" style="padding:6px 14px;font-size:12px;">
      <span class="project-label">${escapeHtml(projectLabel)}</span>
      <span class="spacer"> · Click any node to open its migration file</span>
    </div>
    <div id="graph-container"><pre class="mermaid"></pre></div>
    <script type="module" nonce="${nonce}">${script}</script>`,
  );
}

function page(head: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${BRAND.panelTitle}</title>
${head}
</head>
<body>
${body}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
