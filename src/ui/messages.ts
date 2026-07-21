/**
 * The message protocol between the webview and the extension host. Pure types.
 *
 * File paths never cross to the webview: the webview echoes back only the opaque
 * synthetic `nodeId`, and the host resolves that to a path from its own index.
 */

/** Webview → host. */
export type ClientMessage =
  | { type: "ready" }
  | { type: "openMigration"; nodeId: string }
  | { type: "switchDirectory" };

/** Host → webview. */
export type HostMessage = { type: "render"; mermaid: string };

/** Narrow an unknown message from the webview to a known {@link ClientMessage}. */
export function asClientMessage(message: unknown): ClientMessage | undefined {
  if (typeof message !== "object" || message === null) {
    return undefined;
  }
  const type = (message as { type?: unknown }).type;
  if (type === "ready" || type === "switchDirectory") {
    return { type };
  }
  if (type === "openMigration") {
    const nodeId = (message as { nodeId?: unknown }).nodeId;
    if (typeof nodeId === "string") {
      return { type, nodeId };
    }
  }
  return undefined;
}
