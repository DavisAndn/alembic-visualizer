import type {
  Disposable,
  EditorPort,
  EnvironmentPort,
  InterpreterPathProviderPort,
  PanelPort,
  ProcessResult,
  ProcessRunnerPort,
  ProcessRunOptions,
  QuickPickChoice,
  UserDialogsPort,
  WorkspaceSettingsPort,
} from "../../src/platform/ports";

export class FakeEnvironment implements EnvironmentPort {
  constructor(private readonly home: string | undefined = undefined) {}
  homeDir(): string | undefined {
    return this.home;
  }
}

export interface RecordedRun {
  file: string;
  args: string[];
  options: ProcessRunOptions;
}

export class FakeProcessRunner implements ProcessRunnerPort {
  readonly calls: RecordedRun[] = [];
  private readonly queue: Array<ProcessResult | Error> = [];

  constructor(private readonly defaultResult?: ProcessResult) {}

  /** Queue the next result (or Error to reject) for a subsequent call. */
  enqueue(result: ProcessResult | Error): this {
    this.queue.push(result);
    return this;
  }

  async execFile(
    file: string,
    args: string[],
    options: ProcessRunOptions,
  ): Promise<ProcessResult> {
    this.calls.push({ file, args, options });
    const next = this.queue.shift() ?? this.defaultResult;
    if (next === undefined) {
      throw new Error("FakeProcessRunner: no result queued");
    }
    if (next instanceof Error) {
      throw next;
    }
    return next;
  }

  get lastCall(): RecordedRun | undefined {
    return this.calls[this.calls.length - 1];
  }
}

export class FakeWorkspaceSettings implements WorkspaceSettingsPort {
  iniPath: string | undefined;
  recursive: boolean;
  maxResults: number;
  readonly setCalls: string[] = [];

  constructor(
    opts: { iniPath?: string; recursive?: boolean; maxResults?: number } = {},
  ) {
    this.iniPath = opts.iniPath;
    this.recursive = opts.recursive ?? true;
    this.maxResults = opts.maxResults ?? 50;
  }

  getAlembicIniPath(): string | undefined {
    return this.iniPath;
  }

  async setAlembicIniPath(value: string): Promise<void> {
    this.iniPath = value;
    this.setCalls.push(value);
  }

  isRecursiveVersionLocations(): boolean {
    return this.recursive;
  }

  getSearchMaxResults(): number {
    return this.maxResults;
  }
}

export class FakeInterpreterPathProvider implements InterpreterPathProviderPort {
  constructor(private readonly path: string | undefined = undefined) {}
  getDefaultInterpreterPath(): string | undefined {
    return this.path;
  }
}

export class FakeUserDialogs implements UserDialogsPort {
  readonly errors: string[] = [];
  readonly warnings: string[] = [];
  readonly infos: string[] = [];
  readonly quickPickCalls: { items: QuickPickChoice[]; placeholder: string }[] = [];
  readonly openDialogCalls: (string | undefined)[] = [];

  /** Response for the next showQuickPick: a choice, a selector fn, or undefined (cancel). */
  quickPickResponse:
    | QuickPickChoice
    | ((items: QuickPickChoice[]) => QuickPickChoice | undefined)
    | undefined;
  /** Response for showOpenIniDialog: an absolute path, or undefined (cancel). */
  openDialogResponse: string | undefined;

  async showQuickPick(
    items: QuickPickChoice[],
    placeholder: string,
  ): Promise<QuickPickChoice | undefined> {
    this.quickPickCalls.push({ items, placeholder });
    return typeof this.quickPickResponse === "function"
      ? this.quickPickResponse(items)
      : this.quickPickResponse;
  }

  async showOpenIniDialog(defaultDir?: string): Promise<string | undefined> {
    this.openDialogCalls.push(defaultDir);
    return this.openDialogResponse;
  }

  showErrorMessage(message: string): void {
    this.errors.push(message);
  }
  showWarningMessage(message: string): void {
    this.warnings.push(message);
  }
  showInformationMessage(message: string): void {
    this.infos.push(message);
  }
}

export class FakeEditor implements EditorPort {
  readonly opened: string[] = [];
  /** If set, openFileBeside rejects with this error. */
  failure?: Error;

  async openFileBeside(fsPath: string): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.opened.push(fsPath);
  }
}

export class FakePanel implements PanelPort {
  html: string | undefined;
  readonly posted: unknown[] = [];
  revealed = 0;
  private handlers: Array<(message: unknown) => unknown> = [];

  setHtml(html: string): void {
    this.html = html;
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  onDidReceiveMessage(handler: (message: unknown) => void): Disposable {
    this.handlers.push(handler as (message: unknown) => unknown);
    return {
      dispose: () => {
        this.handlers = this.handlers.filter((h) => h !== handler);
      },
    };
  }

  reveal(): void {
    this.revealed += 1;
  }

  // --- test helpers ---
  /** Simulate the webview posting a message; awaits any async handler. */
  async emit(message: unknown): Promise<void> {
    for (const handler of [...this.handlers]) {
      await handler(message);
    }
  }

  get handlerCount(): number {
    return this.handlers.length;
  }

  postedOfType(type: string): unknown[] {
    return this.posted.filter(
      (m) => typeof m === "object" && m !== null && (m as { type?: unknown }).type === type,
    );
  }
}
