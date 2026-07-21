import * as vscode from "vscode";
import { AlembicIniLocator } from "./alembic/AlembicIniLocator";
import { AlembicProjectResolver } from "./alembic/AlembicProjectResolver";
import { ancestorChain } from "./alembic/paths";
import { BRAND, COMMANDS } from "./constants";
import { MermaidGenerator } from "./generation/MermaidGenerator";
import { mapPythonError } from "./generation/mapPythonError";
import { PythonDetector } from "./python/PythonDetector";
import { MigrationGraphPanel } from "./ui/MigrationGraphPanel";
import {
  ChildProcessRunner,
  NodeEnvironment,
  NodeFileSystem,
  VscodeEditor,
  VscodeInterpreterPathProvider,
  VscodeUserDialogs,
  VscodeWorkspaceSettings,
} from "./platform/vscodeAdapters";

export function activate(context: vscode.ExtensionContext): void {
  const fileSystem = new NodeFileSystem();
  const environment = new NodeEnvironment();
  const processRunner = new ChildProcessRunner();
  const dialogs = new VscodeUserDialogs();

  let panel: MigrationGraphPanel | undefined;

  const workspaceRoots = (): string[] =>
    (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.fsPath);

  const generator = new MermaidGenerator(
    context.extensionPath,
    new PythonDetector(new VscodeInterpreterPathProvider(), fileSystem, environment),
    processRunner,
  );

  const buildResolver = (root: string): AlembicProjectResolver => {
    const settings = new VscodeWorkspaceSettings(vscode.Uri.file(root));
    const locator = new AlembicIniLocator(workspaceRoots(), fileSystem, {
      maxResults: settings.getSearchMaxResults(),
    });
    return new AlembicProjectResolver(root, settings, dialogs, fileSystem, locator);
  };

  const ensurePanel = (): MigrationGraphPanel => {
    if (panel) {
      panel.reveal();
      return panel;
    }
    const mediaRoot = vscode.Uri.joinPath(context.extensionUri, "media");
    const webviewPanel = vscode.window.createWebviewPanel(
      BRAND.webviewViewType,
      BRAND.panelTitle,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [mediaRoot],
      },
    );
    panel = new MigrationGraphPanel(
      webviewPanel,
      mediaRoot,
      new VscodeEditor(),
      dialogs,
      () => void run(true),
      () => {
        panel = undefined;
      },
    );
    return panel;
  };

  async function run(forceSwitch: boolean): Promise<void> {
    const root = workspaceRoots()[0];
    if (!root) {
      dialogs.showErrorMessage(
        `${BRAND.displayName}: open a folder that contains an Alembic project.`,
      );
      return;
    }

    const resolver = buildResolver(root);
    const project = forceSwitch
      ? await resolver.resolveForSwitch()
      : await resolver.resolveForShow();
    if (!project) {
      return; // user cancelled — abort quietly
    }

    const active = ensurePanel();
    active.showLoading();

    const settings = new VscodeWorkspaceSettings(vscode.Uri.file(root));
    const result = await generator.generate(project, {
      recursive: settings.isRecursiveVersionLocations(),
      searchRoots: ancestorChain(project.cwd, root),
    });

    const label = project.displayPath(root);
    if (!result.ok) {
      active.showError(mapPythonError(result.failure));
      return;
    }
    if (result.isEmpty) {
      active.showEmpty(label);
      return;
    }
    active.showGraph(result.payload, label);
  }

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.showGraph, () => run(false)),
    vscode.commands.registerCommand(COMMANDS.switchDirectory, () => run(true)),
  );
}

export function deactivate(): void {
  /* nothing to clean up: panel + listeners dispose via context.subscriptions and onDidDispose */
}
