import * as vscode from "vscode";
import * as cp from "child_process";
import * as path from "path";
import * as fs from "fs";

interface MermaidPayload {
  mermaid: string;
  files: Record<string, string>;
}

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "alembic-viz.showGraph",
    async () => {
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage("No workspace folder open.");
        return;
      }

      const rootPath = workspaceFolder.uri.fsPath;

      if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.One);
      } else {
        currentPanel = vscode.window.createWebviewPanel(
          "alembicGraph",
          "Alembic Migration Graph",
          vscode.ViewColumn.One,
          { enableScripts: true, retainContextWhenHidden: true }
        );
        currentPanel.onDidDispose(() => {
          currentPanel = undefined;
        });
      }

      currentPanel.webview.html = getLoadingHtml();

      try {
        const payload = await runMermaidGenerator(context, rootPath);
        if (!currentPanel) {
          return;
        }
        currentPanel.webview.html = getWebviewHtml(payload.mermaid);

        currentPanel.webview.onDidReceiveMessage(
          async (msg: { command: string; revisionId: string }) => {
            if (msg.command === "openFile") {
              const filePath = payload.files[msg.revisionId];
              if (filePath) {
                const doc = await vscode.workspace.openTextDocument(
                  vscode.Uri.file(filePath)
                );
                await vscode.window.showTextDocument(
                  doc,
                  vscode.ViewColumn.Beside
                );
              } else {
                vscode.window.showWarningMessage(
                  `No file found for revision ${msg.revisionId}`
                );
              }
            }
          },
          undefined,
          context.subscriptions
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (currentPanel) {
          currentPanel.webview.html = getErrorHtml(message);
        }
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

async function runMermaidGenerator(
  context: vscode.ExtensionContext,
  cwd: string
): Promise<MermaidPayload> {
  const pythonPath = detectPython(cwd);
  const scriptPath = path.join(
    context.extensionPath,
    "scripts",
    "mermaid_generator.py"
  );

  return new Promise((resolve, reject) => {
    cp.execFile(
      pythonPath,
      [scriptPath],
      { cwd, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          reject(
            new Error(
              `Python script failed (${pythonPath}):\n${stderr || err.message}`
            )
          );
          return;
        }
        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          reject(new Error(`Invalid JSON from generator:\n${stdout}`));
        }
      }
    );
  });
}

function detectPython(cwd: string): string {
  const venvDirs = [".venv", "venv"];

  // Scan for any venv* directory pattern (e.g. venv3.11.9)
  try {
    const entries = fs.readdirSync(cwd);
    for (const entry of entries) {
      if (entry.startsWith("venv")) {
        const candidate = path.join(cwd, entry, "bin", "python");
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
    }
  } catch {
    // fall through
  }

  for (const dir of venvDirs) {
    const candidate = path.join(cwd, dir, "bin", "python");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  const configPython = vscode.workspace
    .getConfiguration("python")
    .get<string>("defaultInterpreterPath");
  if (configPython) {
    return configPython;
  }

  return "python3";
}

function getLoadingHtml(): string {
  return `<!DOCTYPE html>
<html><head>
<style>
  body { background: #1e1e1e; color: #ccc; font-family: system-ui; display: flex;
         align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .spinner { width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid #58a6ff;
             border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
</head><body>
  <div class="spinner"></div>
  <span>Loading migration graph&hellip;</span>
</body></html>`;
}

function getErrorHtml(message: string): string {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html><head>
<style>
  body { background: #1e1e1e; color: #f87171; font-family: system-ui;
         padding: 32px; line-height: 1.6; }
  pre { background: #2a2a2a; padding: 16px; border-radius: 8px; overflow-x: auto; }
  h2 { color: #fbbf24; }
</style>
</head><body>
  <h2>Failed to generate migration graph</h2>
  <pre>${escaped}</pre>
  <p style="color:#888;">Make sure <code>alembic</code> is installed in your Python environment
  and <code>alembic.ini</code> exists in your workspace root.</p>
</body></html>`;
}

function getWebviewHtml(mermaidData: string): string {
  const escaped = mermaidData.replace(/`/g, "\\`").replace(/\$/g, "\\$");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: #1e1e1e;
    color: #d4d4d4;
    font-family: system-ui, -apple-system, sans-serif;
    overflow: auto;
  }
  #toolbar {
    position: sticky; top: 0; z-index: 10;
    background: #252526; border-bottom: 1px solid #333;
    padding: 8px 16px; display: flex; align-items: center; gap: 12px;
  }
  #toolbar button {
    background: #333; color: #ccc; border: 1px solid #555; border-radius: 4px;
    padding: 4px 12px; cursor: pointer; font-size: 13px;
  }
  #toolbar button:hover { background: #444; }
  #toolbar span { font-size: 13px; color: #888; }
  #graph-container {
    padding: 24px;
    display: flex;
    justify-content: center;
    transform-origin: top center;
  }
  .mermaid { cursor: default; }
  .mermaid .node { cursor: pointer; }
  .mermaid .node:hover rect,
  .mermaid .node:hover polygon { filter: brightness(1.3); }
</style>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';

  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    flowchart: {
      useMaxWidth: false,
      htmlLabels: true,
      curve: 'basis',
      rankSpacing: 40,
      nodeSpacing: 30
    },
    securityLevel: 'loose'
  });

  const vscode = acquireVsCodeApi();
  let scale = 1;

  async function render() {
    const container = document.getElementById('graph-container');
    const graphDef = \`${escaped}\`;
    const { svg } = await mermaid.render('mermaid-svg', graphDef);
    container.innerHTML = svg;
    attachClickHandlers();
    updateZoomLabel();
  }

  function attachClickHandlers() {
    document.querySelectorAll('.node').forEach(node => {
      node.addEventListener('click', () => {
        const id = node.id.replace('flowchart-', '').replace(/-\\d+$/, '');
        if (id) {
          vscode.postMessage({ command: 'openFile', revisionId: id });
        }
      });
    });
  }

  function updateZoomLabel() {
    document.getElementById('zoom-label').textContent = Math.round(scale * 100) + '%';
  }

  document.getElementById('zoom-in').addEventListener('click', () => {
    scale = Math.min(scale + 0.15, 3);
    document.getElementById('graph-container').style.transform = 'scale(' + scale + ')';
    updateZoomLabel();
  });

  document.getElementById('zoom-out').addEventListener('click', () => {
    scale = Math.max(scale - 0.15, 0.2);
    document.getElementById('graph-container').style.transform = 'scale(' + scale + ')';
    updateZoomLabel();
  });

  document.getElementById('zoom-reset').addEventListener('click', () => {
    scale = 1;
    document.getElementById('graph-container').style.transform = 'scale(1)';
    updateZoomLabel();
  });

  render();
</script>
</head>
<body>
  <div id="toolbar">
    <button id="zoom-in">+</button>
    <button id="zoom-out">&minus;</button>
    <button id="zoom-reset">Reset</button>
    <span id="zoom-label">100%</span>
    <span style="margin-left: auto;">Click any node to open its migration file</span>
  </div>
  <div id="graph-container">
    <pre class="mermaid">Loading...</pre>
  </div>
</body>
</html>`;
}
