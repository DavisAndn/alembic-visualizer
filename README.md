# Alembic Visualizer

A VS Code / Cursor extension that renders your [Alembic](https://alembic.sqlalchemy.org/)
migration history as an interactive DAG using [Mermaid](https://mermaid.js.org/). Discover
projects anywhere in your workspace and click any node to jump to its migration file.

Contributions are welcome — this document is aimed at people hacking on the extension. See
[CHANGELOG.md](CHANGELOG.md) for release notes.

## What it does

- Renders the full migration DAG (branches and merges), with head/base highlighting and zoom.
- Auto-discovers `alembic.ini` anywhere in the workspace; picker + **Switch Project Directory**
  command when there are several (or none).
- Click a node to open its migration `.py` file — robust for any revision-id shape.
- Handles migrations nested in sub-folders of `versions/` (Alembic ≥ 1.10).
- Mermaid is bundled locally and rendered under a strict CSP — no CDN, works offline.

Try it: Command Palette → **Alembic Visualizer: Show Migration Graph**. It needs `alembic`
installed in the interpreter it detects (a pyenv `.python-version`, a `.venv` / `venv` / `venv*`
searched from the project dir up to the workspace root, the Python extension's configured
interpreter, then `python3`).

## Getting started (development)

Prerequisites: **Node 18+** and npm; Python with Alembic only for exercising the graph end to end.

```bash
git clone https://github.com/DavisAndn/alembic-visualizer
cd alembic-visualizer
npm install          # postinstall `prepare` bundles Mermaid into media/ (esbuild)
npm run compile      # build the extension host to out/
npm test             # typecheck + unit tests
```

Press **F5** in the extension folder to launch an Extension Development Host, then open a Python
project in that window and run the command.

### npm scripts

| Script | What it does |
| --- | --- |
| `npm run compile` | Type-check + emit the host to `out/` (`tsc`). |
| `npm run watch` | Incremental `tsc` build. |
| `npm run build:webview` | Bundle Mermaid into `media/mermaid.esm.min.mjs` (esbuild). Runs automatically on `npm install` and before packaging. |
| `npm test` | `typecheck` (all of `src` + `test`) then the mocha unit suite. |
| `npm run package` | Build the `.vsix` (runs `clean` + `build:webview` + `compile` first). |

## Architecture

The extension host is a thin composition root ([`src/extension.ts`](src/extension.ts)) over
dependency-injected services. **Every interaction with the outside world — `vscode`, the
filesystem, the environment, child processes, and the webview — is expressed as an interface in
[`src/platform/ports.ts`](src/platform/ports.ts)** and implemented by adapters in
`src/platform/vscodeAdapters.ts`. Because of that seam, the domain logic is pure and unit-tested
against in-memory fakes without ever launching VS Code.

The one rule that keeps this honest: **nothing under `alembic/`, `python/`, `generation/`, or the
logic parts of `ui/` may `import "vscode"`.**

```
src/
  constants.ts            command ids, config keys, skip-dirs, limits
  platform/ports.ts       all host-boundary interfaces (the seam)
  platform/vscodeAdapters host implementations of the ports
  alembic/                project discovery, resolution policy, picker/switch, path helpers
  python/                 interpreter detection
  generation/             run the Python generator, parse + validate, map errors to friendly text
  ui/                     synthetic-node-id click round-trip, panel controller, webview HTML
  extension.ts            composition root: wire adapters to services, register commands
scripts/mermaid_generator.py   migration discovery via Alembic's API (see below)
media-src/mermaid-entry.mjs     esbuild entry that produces the bundled Mermaid asset
test/                     mocha unit tests mirroring src/, plus in-memory fakes in test/helpers
```

### How the graph is produced

Migration discovery is delegated to [`scripts/mermaid_generator.py`](scripts/mermaid_generator.py),
which uses Alembic's own `ScriptDirectory` API. It emits **synthetic, Mermaid-safe node ids**
(`n0`, `n1`, …) rather than raw revision ids, plus a `nodeId → { revisionId, label, filePath }`
mapping. The webview only ever echoes back an opaque `nodeId`; the host resolves it to a file path
from its own index. This is what makes click-to-open robust for revision ids of any shape and keeps
file paths out of the webview. On success the script prints JSON to stdout (exit 0); on failure it
prints `{"error": {...}}` to stderr (exit 1), which the extension turns into an actionable message.

## Testing

Tests use **mocha + ts-node** with `node:assert/strict` and in-memory fakes (no VS Code harness) —
run them with `npm test`. Put a test next to its peers under `test/<area>/<Name>.test.ts`, mirroring
`src/`. New logic should land behind a port (fake it in `test/helpers`) so it stays unit-testable.
The project favors a test-driven workflow: add the failing test first, then the implementation.

## Contributing

1. Branch off `master`.
2. Keep `npm test` green and preserve the ports/adapters boundary (domain code stays free of
   `vscode`).
3. Add tests for new behavior; update [CHANGELOG.md](CHANGELOG.md) when it's user-visible.
4. Open a PR against `master`.
