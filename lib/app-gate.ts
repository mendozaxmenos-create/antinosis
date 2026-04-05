/**
 * Token HMAC para la puerta de acceso por APP_PASSWORD (middleware Edge + server actions).
 * No usar para secretos distintos del mismo env en el cliente.
 */
const GATE_MSG = "cardspend-app-gate-v1";

export async function appGateToken(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(GATE_MSG));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyAppGateToken(secret: string, token: string): Promise<boolean> {
  const expected = await appGateToken(secret);
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export const APP_GATE_COOKIE = "cardspend_gate";
