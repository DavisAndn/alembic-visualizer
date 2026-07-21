import * as vscode from "vscode";
import * as cp from "child_process";
import * as fs from "fs";
import * as os from "os";
import { CONFIG, DEFAULT_MAX_INI_SEARCH_RESULTS } from "../constants";
import type {
  DirEntry,
  Disposable,
  EditorPort,
  EnvironmentPort,
  FileSystemPort,
  InterpreterPathProviderPort,
  PanelPort,
  ProcessResult,
  ProcessRunnerPort,
  ProcessRunOptions,
  QuickPickChoice,
  UserDialogsPort,
  WorkspaceSettingsPort,
} from "./ports";

export class NodeFileSystem implements FileSystemPort {
  exists(path: string): boolean {
    try {
      return fs.existsSync(path);
    } catch {
      return false;
    }
  }

  readTextFile(path: string): string {
    return fs.readFileSync(path, "utf-8");
  }

  readDirectory(path: string): DirEntry[] {
    return fs.readdirSync(path, { withFileTypes: true }).map((entry) => ({
      name: entry.name,
      isFile: () => entry.isFile(),
      isDirectory: () => entry.isDirectory(),
    }));
  }
}

export class NodeEnvironment implements EnvironmentPort {
  homeDir(): string | undefined {
    return os.homedir() || process.env.HOME || process.env.USERPROFILE || undefined;
  }
}

export class ChildProcessRunner implements ProcessRunnerPort {
  execFile(
    file: string,
    args: string[],
    options: ProcessRunOptions,
  ): Promise<ProcessResult> {
    return new Promise((resolve) => {
      cp.execFile(
        file,
        args,
        { cwd: options.cwd, maxBuffer: options.maxBuffer },
        (err, stdout, stderr) => {
          if (!err) {
            resolve({ stdout, stderr, exitCode: 0 });
            return;
          }
          // For a non-zero exit, execFile reports the code as a number; for a
          // spawn failure (e.g. interpreter not found) it is a string like "ENOENT".
          const code: unknown = (err as { code?: unknown }).code;
          if (typeof code === "number") {
            resolve({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode: code });
          } else {
            const message = stderr && stderr.length > 0 ? stderr : err.message;
            resolve({ stdout: stdout ?? "", stderr: message, exitCode: null });
          }
        },
      );
    });
  }
}

export class VscodeWorkspaceSettings implements WorkspaceSettingsPort {
  constructor(private readonly scope?: vscode.Uri) {}

  private config(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(CONFIG.section, this.scope);
  }

  getAlembicIniPath(): string | undefined {
    const value = this.config().get<string>(CONFIG.alembicIniPath);
    return value && value.trim() ? value.trim() : undefined;
  }

  async setAlembicIniPath(value: string): Promise<void> {
    await this.config().update(
      CONFIG.alembicIniPath,
      value,
      vscode.ConfigurationTarget.Workspace,
    );
  }

  isRecursiveVersionLocations(): boolean {
    return this.config().get<boolean>(CONFIG.recursiveVersionLocations, true);
  }

  getSearchMaxResults(): number {
    return this.config().get<number>(
      CONFIG.searchMaxResults,
      DEFAULT_MAX_INI_SEARCH_RESULTS,
    );
  }
}

export class VscodeInterpreterPathProvider implements InterpreterPathProviderPort {
  getDefaultInterpreterPath(): string | undefined {
    const value = vscode.workspace
      .getConfiguration("python")
      .get<string>("defaultInterpreterPath");
    return value && value.trim() ? value : undefined;
  }
}

interface ChoiceQuickPickItem extends vscode.QuickPickItem {
  choice: QuickPickChoice;
}

export class VscodeUserDialogs implements UserDialogsPort {
  async showQuickPick(
    items: QuickPickChoice[],
    placeholder: string,
  ): Promise<QuickPickChoice | undefined> {
    const picks: ChoiceQuickPickItem[] = items.map((choice) => ({
      label: choice.label,
      description: choice.description,
      detail: choice.detail,
      choice,
    }));
    const picked = await vscode.window.showQuickPick(picks, {
      placeHolder: placeholder,
      matchOnDescription: true,
      matchOnDetail: true,
    });
    return picked?.choice;
  }

  async showOpenIniDialog(defaultDir?: string): Promise<string | undefined> {
    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFolders: false,
      openLabel: "Visualize",
      filters: { "Alembic config": ["ini"] },
      defaultUri: defaultDir ? vscode.Uri.file(defaultDir) : undefined,
    });
    return uris && uris[0] ? uris[0].fsPath : undefined;
  }

  showErrorMessage(message: string): void {
    void vscode.window.showErrorMessage(message);
  }
  showWarningMessage(message: string): void {
    void vscode.window.showWarningMessage(message);
  }
  showInformationMessage(message: string): void {
    void vscode.window.showInformationMessage(message);
  }
}

export class VscodeEditor implements EditorPort {
  async openFileBeside(fsPath: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fsPath));
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
  }
}

/** Wraps a real {@link vscode.WebviewPanel} as a {@link PanelPort}. */
export class VscodePanel implements PanelPort {
  constructor(private readonly panel: vscode.WebviewPanel) {}

  setHtml(html: string): void {
    this.panel.webview.html = html;
  }

  postMessage(message: unknown): void {
    void this.panel.webview.postMessage(message);
  }

  onDidReceiveMessage(handler: (message: unknown) => void): Disposable {
    return this.panel.webview.onDidReceiveMessage(handler);
  }

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.One);
  }
}
