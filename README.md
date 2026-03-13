# Alembic Migration Visualizer

A Cursor/VS Code extension that renders your Alembic migration history as an interactive DAG using Mermaid.js.

## Features

- **DAG rendering** of the full migration tree (handles branches and merges)
- **Click-to-open** any migration node to jump to its `.py` file
- **Zoom controls** for large migration graphs
- **Head/base highlighting** — green for HEAD revisions, red for base

## Requirements

- A Python project with `alembic` installed and an `alembic.ini` in the workspace root
- Python 3.8+

## Usage

1. Open your Alembic project in Cursor/VS Code
2. Open the Command Palette (`Cmd+Shift+P`)
3. Run **Alembic: Show Migration Graph**

The extension auto-detects your virtual environment (`.venv/`, `venv/`, or any `venv*` directory).

## Development

```bash
npm install
npm run compile
# Package as .vsix
npm run package
```

## Install from .vsix

```bash
cursor --install-extension alembic-viz-0.1.0.vsix
# or
code --install-extension alembic-viz-0.1.0.vsix
```
