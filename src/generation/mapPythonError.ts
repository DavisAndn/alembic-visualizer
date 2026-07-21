import type { FriendlyError, ParseFailure } from "./types";

/**
 * Turn a raw generator failure into a friendly, actionable error for the panel,
 * rather than dumping a Python traceback. Pure — matches on the message + raw
 * text so it works whether the script emitted a structured error or crashed at
 * import time.
 */
export function mapPythonError(failure: ParseFailure): FriendlyError {
  const haystack = `${failure.message}\n${failure.raw}`.toLowerCase();

  if (failure.kind === "invalid-json") {
    return {
      title: "Unexpected output from the migration generator",
      detail: failure.raw || failure.message,
      hint: "This is likely a bug in Alembic Visualizer. Please report it with the details above.",
    };
  }

  if (/no module named ['"]?alembic/.test(haystack)) {
    return {
      title: "Alembic is not installed in the selected interpreter",
      detail: failure.message,
      hint: "Install it with `pip install alembic`, or select the virtual environment where Alembic is installed.",
    };
  }

  if (
    /can'?t locate revision|cannot locate revision|is not present in|no such revision|resolutionerror|cycle is detected/.test(
      haystack,
    )
  ) {
    return {
      title: "Alembic could not resolve the migration history",
      detail: failure.message,
      hint: "If migrations live in sub-folders of versions/, ensure Alembic ≥ 1.10 is installed (recursive version locations is enabled by default), or list the folders under version_locations in alembic.ini.",
    };
  }

  if (
    /script_location|no such file or directory|no section|no config file|contains no section|unable to open|could not.*read/.test(
      haystack,
    )
  ) {
    return {
      title: "Could not read the Alembic configuration",
      detail: failure.message,
      hint: "Pick a valid alembic.ini with the “Alembic Visualizer: Switch Project Directory” command.",
    };
  }

  return {
    title: "Failed to generate the migration graph",
    detail: failure.message || failure.raw,
  };
}
