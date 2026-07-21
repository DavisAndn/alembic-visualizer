/**
 * Recover our synthetic node id (`n0`, `n1`, ...) from Mermaid's internal
 * flowchart DOM element id (e.g. `"flowchart-n12-3"`).
 *
 * This POSITIVELY matches our own `n<digits>` token instead of blindly stripping
 * a trailing `-<digits>` (the previous approach). The graph only ever contains
 * synthetic ids, so recovery is total and cannot corrupt a real revision id such
 * as `add_orders-002`. A drift in Mermaid's prefix/suffix shape only requires a
 * one-line change here, exercised by a single unit test.
 *
 * Returns `null` when no synthetic id can be recovered.
 */
const SYNTHETIC_NODE_ID_RE = /(?:^|-)(n\d+)(?:-\d+)?$/;

export function extractSyntheticNodeId(domId: string): string | null {
  const match = SYNTHETIC_NODE_ID_RE.exec(domId);
  return match ? match[1] : null;
}

/**
 * The identical recovery logic as a self-contained JS snippet embedded into the
 * webview, which cannot import from the extension-host bundle. Kept in this one
 * module so the browser copy and the Node copy stay in lock-step; `nodeId.test.ts`
 * evaluates this string and asserts parity with {@link extractSyntheticNodeId}.
 */
export const NODE_ID_EXTRACTOR_JS = `
function extractSyntheticNodeId(domId) {
  var match = /(?:^|-)(n\\d+)(?:-\\d+)?$/.exec(domId);
  return match ? match[1] : null;
}`.trim();
