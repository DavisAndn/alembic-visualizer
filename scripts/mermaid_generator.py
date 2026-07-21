"""Generate Mermaid DAG data from an Alembic migration history.

Success: prints a JSON payload to stdout and exits 0::

    {
      "version": 1,
      "mermaid": "graph TD ...",   # uses synthetic node ids n0..nN
      "nodes": [{"nodeId", "revisionId", "label", "filePath"}],
      "heads": [<revisionId>, ...],
      "bases": [<revisionId>, ...]
    }

Failure: prints ``{"error": {"type", "message"}}`` to stderr and exits 1.

Node ids in the Mermaid graph are synthetic (``n0``, ``n1`` ...), never the raw
Alembic revision id. This keeps the graph syntax valid for any revision id shape
(hyphens, dots, spaces, leading digits) and lets the extension map a clicked node
back to its file without parsing the revision id out of the DOM.
"""
import json
import os
import sys


def generate(alembic_ini_path, recursive=True):
    # Imported lazily so a missing Alembic surfaces as a structured error via main().
    from alembic.config import Config
    from alembic.script import ScriptDirectory

    config = Config(alembic_ini_path)
    if recursive:
        # Discover migrations nested in sub-folders of versions/ (Alembic >= 1.10).
        # Silently ignored by older Alembic, so it is always safe to set.
        config.set_main_option("recursive_version_locations", "true")
    script = ScriptDirectory.from_config(config)

    revisions = list(script.walk_revisions())
    node_of = {rev.revision: "n{0}".format(i) for i, rev in enumerate(revisions)}

    lines = ["graph TD"]
    nodes = []
    for rev in revisions:
        node_id = node_of[rev.revision]
        label = _label(rev)
        lines.append('  {0}["{1}"]'.format(node_id, label))
        nodes.append(
            {
                "nodeId": node_id,
                "revisionId": rev.revision,
                "label": label,
                "filePath": _module_file(rev),
            }
        )
        for down in _down_revisions(rev):
            if down in node_of:  # guard cross-refs to revisions we did not load
                lines.append("  {0} --> {1}".format(node_of[down], node_id))

    heads = list(script.get_heads())
    bases = list(script.get_bases())
    for rid in heads:
        if rid in node_of:
            lines.append(
                "  style {0} fill:#2d6a4f,stroke:#40916c,color:#fff".format(node_of[rid])
            )
    for rid in bases:
        if rid in node_of:
            lines.append(
                "  style {0} fill:#6a2d2d,stroke:#916c40,color:#fff".format(node_of[rid])
            )

    return {
        "version": 1,
        "mermaid": "\n".join(lines),
        "nodes": nodes,
        "heads": heads,
        "bases": bases,
    }


def _label(rev):
    message = (rev.doc or "No message").replace('"', "").replace("'", "")
    if len(message) > 40:
        message = message[:37] + "..."
    return message


def _module_file(rev):
    path = getattr(rev.module, "__file__", None)
    return os.path.abspath(path) if path else None


def _down_revisions(rev):
    down = rev.down_revision
    if not down:
        return []
    if isinstance(down, str):
        return [down]
    return list(down)


def main(argv, out, err):
    try:
        if len(argv) < 2:
            raise ValueError(
                "usage: mermaid_generator.py <alembic.ini> [recursive:true|false]"
            )
        ini_path = argv[1]
        recursive = len(argv) < 3 or argv[2].lower() != "false"
        json.dump(generate(ini_path, recursive), out)
        return 0
    except Exception as exc:  # surface any failure as a structured JSON error
        json.dump({"error": {"type": type(exc).__name__, "message": str(exc)}}, err)
        return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv, sys.stdout, sys.stderr))
