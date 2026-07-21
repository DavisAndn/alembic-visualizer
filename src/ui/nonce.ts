import { randomBytes } from "crypto";

/** A per-load random nonce (hex, alphanumeric) used to authorize the inline script under CSP. */
export function makeNonce(): string {
  return randomBytes(16).toString("hex");
}
