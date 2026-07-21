import type { GraphNode, GraphPayload } from "../generation/types";

/**
 * Build the host-side lookup from synthetic node id to its node (which carries
 * the file path). This map never crosses to the webview — the webview only ever
 * echoes back an opaque node id.
 */
export function buildNodeIndex(payload: GraphPayload): Map<string, GraphNode> {
  const index = new Map<string, GraphNode>();
  for (const node of payload.nodes) {
    index.set(node.nodeId, node);
  }
  return index;
}
