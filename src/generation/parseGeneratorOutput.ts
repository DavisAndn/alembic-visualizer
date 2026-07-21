import type { GraphNode, GraphPayload, ParseResult } from "./types";

/**
 * Pure translation of the Python generator's (stdout, stderr, exitCode) into a
 * {@link ParseResult}. Contract: on success the script writes a JSON payload to
 * stdout and exits 0; on failure it writes a JSON `{error:{type,message}}` to
 * stderr and exits non-zero (a raw traceback is also tolerated).
 */
export function parseGeneratorOutput(
  stdout: string,
  stderr: string,
  exitCode: number | null,
): ParseResult {
  if (exitCode === 0) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout.trim());
    } catch {
      return invalidJson("The generator did not return valid JSON.", stdout);
    }
    const payload = toPayload(parsed);
    if (!payload) {
      return invalidJson(
        "The generator returned an unexpected payload shape.",
        stdout,
      );
    }
    return { ok: true, payload, isEmpty: payload.nodes.length === 0 };
  }

  const structured = tryParseStructuredError(stderr);
  if (structured) {
    return {
      ok: false,
      failure: {
        kind: "python",
        message: structured.message,
        pythonType: structured.type,
        raw: stderr,
      },
    };
  }

  const raw = (stderr || stdout || "").trim();
  return {
    ok: false,
    failure: {
      kind: "raw",
      message: raw || "The migration generator failed.",
      raw,
    },
  };
}

function invalidJson(message: string, raw: string): ParseResult {
  return { ok: false, failure: { kind: "invalid-json", message, raw } };
}

function toPayload(value: unknown): GraphPayload | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (typeof value.mermaid !== "string" || !Array.isArray(value.nodes)) {
    return undefined;
  }
  const nodes: GraphNode[] = [];
  for (const raw of value.nodes) {
    if (!isRecord(raw)) {
      return undefined;
    }
    if (typeof raw.nodeId !== "string" || typeof raw.revisionId !== "string") {
      return undefined;
    }
    nodes.push({
      nodeId: raw.nodeId,
      revisionId: raw.revisionId,
      label: typeof raw.label === "string" ? raw.label : raw.revisionId,
      filePath: typeof raw.filePath === "string" ? raw.filePath : null,
    });
  }
  return {
    version: typeof value.version === "number" ? value.version : 1,
    mermaid: value.mermaid,
    nodes,
    heads: toStringArray(value.heads),
    bases: toStringArray(value.bases),
  };
}

function tryParseStructuredError(
  stderr: string,
): { type: string; message: string } | undefined {
  const trimmed = stderr.trim();
  if (!trimmed) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed) || !isRecord(parsed.error)) {
    return undefined;
  }
  const { error } = parsed;
  if (typeof error.message !== "string") {
    return undefined;
  }
  return {
    type: typeof error.type === "string" ? error.type : "Error",
    message: error.message,
  };
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
