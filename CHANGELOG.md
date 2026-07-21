# Changelog

All notable changes to **Alembic Visualizer** are documented here.

## [0.2.0]

Renamed to **Alembic Visualizer** and reworked into a clean, dependency-injected,
unit-tested architecture. Publish-ready.

### Added
- **Project auto-discovery**: recursively finds `alembic.ini` anywhere in the workspace
  (skipping `node_modules`, virtualenvs, VCS and cache dirs), not just the workspace root.
- **Project picker & switching**: a QuickPick when several projects are found, a Browse
  dialog when none are, and a new **Switch Project Directory** command (plus a toolbar
  button) to change projects at any time. The choice is persisted per workspace via the
  `alembicViz.alembicIniPath` setting.
- **Nested migration support**: `recursive_version_locations` is enabled by default
  (`alembicViz.recursiveVersionLocations`) so migrations in sub-folders of `versions/`
  are discovered (requires Alembic ≥ 1.10).
- Friendly, actionable error and empty-state panels instead of raw Python tracebacks.
- Unit test suite (mocha + ts-node) covering discovery, resolution, interpreter detection,
  generator parsing, error mapping, the node-id round-trip, and the panel controller.

### Fixed
- **Click-to-open** now works for any revision-id shape. The generator emits synthetic
  Mermaid node ids (`n0`, `n1`, …) and the extension recovers them by positive match,
  instead of reverse-engineering Mermaid's internal DOM id and stripping a trailing
  `-<digits>` (which corrupted ids such as `add_orders-002`).
- The webview message listener is now registered once per panel, eliminating stacked
  listeners (files opening multiple times) and stale-closure / unhandled-rejection errors
  on repeated runs.
- Works when `alembic.ini` is **not** at the workspace root: the generator now runs with
  its working directory set to the project directory and is passed the resolved ini path.

### Changed
- Mermaid is now **bundled locally** and rendered under a strict Content-Security-Policy
  with a per-load nonce (`securityLevel: 'strict'`), instead of being loaded from a CDN —
  the graph works offline and needs no network access.

## [0.1.0]
- Initial release: render the Alembic migration DAG for an `alembic.ini` in the workspace root.
