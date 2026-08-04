/**
 * Session tokens for the single-user password gate.
 *
 * Uses Web Crypto only, so the same helpers run in the proxy (edge runtime)
 * and in route handlers.
 */

export const SESSION_COOKIE = "movieboxd_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return base64url(sig);
}

/** Length-independent comparison so tokens can't be probed by timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function createSessionToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function isValidSessionToken(
  secret: string,
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = await hmac(secret, payload);
  if (!safeEqual(signature, expected)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export async function isValidPassword(
  expected: string,
  supplied: string,
): Promise<boolean> {
  // Hash both sides first so the comparison length can't leak the real length.
  const [a, b] = await Promise.all([
    hmac(expected, "pw"),
    hmac(supplied, "pw"),
  ]);
  return safeEqual(a, b);
}

/**
 * The gate is only active once a password is configured, which keeps local
 * development friction-free. Deployments must set it — see DEPLOY.md.
 */
export function authConfig(): { enabled: boolean; password: string; secret: string } {
  const password = process.env.APP_PASSWORD ?? "";
  const secret = process.env.AUTH_SECRET || password;
  return { enabled: Boolean(password), password, secret };
}
