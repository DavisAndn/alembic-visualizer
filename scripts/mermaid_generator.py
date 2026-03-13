"""Generate Mermaid DAG syntax from Alembic migration history.

Outputs JSON with two keys:
  - mermaid: the graph TD string for rendering
  - files: mapping of revision_id -> absolute file path
"""
import json
import os
import sys

from alembic.config import Config
from alembic.script import ScriptDirectory


def generate(alembic_ini_path: str = "alembic.ini"):
    config = Config(alembic_ini_path)
    script = ScriptDirectory.from_config(config)

    lines = ["graph TD"]
    files = {}

    for rev in script.walk_revisions():
        rid = rev.revision
        msg = (rev.doc or "No message").replace('"', "").replace("'", "")
        if len(msg) > 40:
            msg = msg[:37] + "..."
        label = f'  {rid}["{msg}"]'
        lines.append(label)

        if rev.module.__file__:
            files[rid] = os.path.abspath(rev.module.__file__)

        if rev.down_revision:
            downs = (
                [rev.down_revision]
                if isinstance(rev.down_revision, str)
                else list(rev.down_revision)
            )
            for d in downs:
                lines.append(f"  {d} --> {rid}")

    head_revs = set(script.get_heads())
    base_revs = set(script.get_bases())

    styles = []
    for rid in head_revs:
        styles.append(f"  style {rid} fill:#2d6a4f,stroke:#40916c,color:#fff")
    for rid in base_revs:
        styles.append(f"  style {rid} fill:#6a2d2d,stroke:#916c40,color:#fff")
    lines.extend(styles)

    return json.dumps({"mermaid": "\n".join(lines), "files": files})


if __name__ == "__main__":
    ini = sys.argv[1] if len(sys.argv) > 1 else "alembic.ini"
    print(generate(ini))
