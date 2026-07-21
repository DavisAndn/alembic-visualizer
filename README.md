# Alembic Visualizer

A VS Code / Cursor extension that renders your [Alembic](https://alembic.sqlalchemy.org/)
migration history as an interactive DAG using Mermaid.

## Features

- **Migration DAG** of your full revision tree (branches and merges included)
- **Project auto-discovery** — finds `alembic.ini` anywhere in your workspace, not just the root
- **Project picker & switching** — choose between multiple projects, or browse to one; switch at any time
- **Click-to-open** any node to jump straight to its migration `.py` file (robust for any revision-id shape)
- **Nested migrations** under sub-folders of `versions/` (via Alembic's recursive version locations)
- **Head / base highlighting**, zoom controls, and a theme-aware graph
- **Offline & self-contained** — Mermaid is bundled locally (no CDN), rendered under a strict Content-Security-Policy

## Requirements

- A Python environment with `alembic` installed
- Python 3.8+
- Alembic **≥ 1.10** if your migration files live in sub-folders of `versions/` (recursive version locations)

The extension auto-detects your interpreter: a pyenv `.python-version`, a `.venv` / `venv` /
`venv*` directory (searched from the project folder up to the workspace root), the Python
extension's configured interpreter, and finally `python3`.

## Usage

1. Open your project in VS Code / Cursor.
2. Open the Command Palette (`Cmd`/`Ctrl` + `Shift` + `P`).
3. Run **Alembic Visualizer: Show Migration Graph**.

If a single `alembic.ini` is found it is used automatically. If several are found you'll be
asked to pick one; if none are found you can browse to one. Your choice is remembered per
workspace. Run **Alembic Visualizer: Switch Project Directory** (or the *Switch project*
button in the graph toolbar) to change it.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `alembicViz.alembicIniPath` | `""` | Path to the `alembic.ini` to visualize (relative to the workspace, or absolute). Empty = auto-detect. |
| `alembicViz.recursiveVersionLocations` | `true` | Pass `recursive_version_locations = true` to Alembic so nested `versions/` folders are discovered (Alembic ≥ 1.10). |
| `alembicViz.search.maxResults` | `50` | Maximum number of `alembic.ini` files listed during auto-discovery. |

## Development

```bash
npm install          # also builds the bundled Mermaid asset (prepare script)
npm run compile      # build the extension host to out/
npm test             # typecheck + unit tests (mocha + ts-node)
npm run package      # build the .vsix
```

Press `F5` to launch the Extension Development Host.

### Architecture

The extension host is a thin composition root (`src/extension.ts`) over dependency-injected
services. All host interaction (filesystem, settings, dialogs, child process, webview) sits
behind interfaces in `src/platform/ports.ts`, so the domain logic — project discovery
(`src/alembic`), interpreter detection (`src/python`), generator parsing (`src/generation`),
and the click round-trip / panel controller (`src/ui`) — is unit-tested against in-memory
fakes without launching VS Code. Migration discovery itself is delegated to
`scripts/mermaid_generator.py`, which uses Alembic's own API and emits synthetic,
Mermaid-safe node ids plus a `nodeId → file` mapping.

## Publishing checklist

Before publishing to the Marketplace, set a real `publisher` in `package.json`, add a
`LICENSE` file (and remove `--skip-license` from the `package` script), add an `icon`, and
update `repository`/`bugs`/`homepage`.
