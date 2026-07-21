import { AlembicProject } from "./AlembicProject";
import { AlembicIniLocator } from "./AlembicIniLocator";
import { decideResolution } from "./resolutionPolicy";
import { toAbsolute, toWorkspaceRelative } from "./paths";
import type {
  FileSystemPort,
  QuickPickChoice,
  UserDialogsPort,
  WorkspaceSettingsPort,
} from "../platform/ports";

/** Sentinel value for the "Browse…" entry appended to the QuickPick. */
export const BROWSE_SENTINEL = "__alembic_viz_browse__";

/**
 * Orchestrates project resolution: reads the persisted choice, discovers
 * candidates, applies {@link decideResolution}, drives the QuickPick / open
 * dialog through ports, and persists the result. Returns `undefined` when the
 * user cancels (the caller aborts quietly — no error toast).
 */
export class AlembicProjectResolver {
  constructor(
    private readonly workspaceRoot: string,
    private readonly settings: WorkspaceSettingsPort,
    private readonly dialogs: UserDialogsPort,
    private readonly fs: FileSystemPort,
    private readonly locator: AlembicIniLocator,
  ) {}

  /** For "Show Migration Graph": reuse a valid persisted project silently. */
  resolveForShow(): Promise<AlembicProject | undefined> {
    return this.resolve(false);
  }

  /** For "Switch Project Directory": always prompt. */
  resolveForSwitch(): Promise<AlembicProject | undefined> {
    return this.resolve(true);
  }

  private async resolve(forceSwitch: boolean): Promise<AlembicProject | undefined> {
    const persistedRaw = this.settings.getAlembicIniPath();
    const persistedPath = persistedRaw
      ? toAbsolute(persistedRaw, this.workspaceRoot)
      : undefined;
    const persistedExists = persistedPath ? this.fs.exists(persistedPath) : false;
    const discovered = this.locator.findCandidates();

    const decision = decideResolution({
      persistedPath,
      persistedExists,
      discovered,
      forceSwitch,
    });

    switch (decision.kind) {
      case "use":
        return this.selectAndPersist(decision.iniPath, decision.source === "auto");
      case "pick":
        return this.pick(decision.candidates);
      case "browse":
        return this.browse();
    }
  }

  private async pick(candidates: string[]): Promise<AlembicProject | undefined> {
    const items: QuickPickChoice[] = candidates.map((candidate) => ({
      label: toWorkspaceRelative(candidate, this.workspaceRoot),
      description: candidate,
      value: candidate,
    }));
    items.push({
      label: "$(folder-opened) Browse…",
      detail: "Choose an alembic.ini file not listed above",
      value: BROWSE_SENTINEL,
    });

    const choice = await this.dialogs.showQuickPick(
      items,
      "Select an Alembic project to visualize",
    );
    if (!choice) {
      return undefined; // cancelled
    }
    if (choice.value === BROWSE_SENTINEL) {
      return this.browse();
    }
    return this.selectAndPersist(choice.value, true);
  }

  private async browse(): Promise<AlembicProject | undefined> {
    const picked = await this.dialogs.showOpenIniDialog(this.workspaceRoot);
    if (!picked) {
      return undefined; // cancelled → abort quietly
    }
    return this.selectAndPersist(picked, true);
  }

  private async selectAndPersist(
    iniPath: string,
    persist: boolean,
  ): Promise<AlembicProject> {
    const project = AlembicProject.fromIniPath(iniPath);
    if (persist) {
      await this.settings.setAlembicIniPath(
        toWorkspaceRelative(project.iniPath, this.workspaceRoot),
      );
    }
    return project;
  }
}
