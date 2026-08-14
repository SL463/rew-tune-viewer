export interface AuthResult {
  ok: boolean;
}

// Constant-time-ish comparison to avoid trivial timing leaks.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function checkBasicAuth(header: string | null): boolean {
  const user = process.env.AUTH_USER;
  const pass = process.env.AUTH_PASS;
  if (!user || !pass) return false;
  if (!header || !header.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const idx = decoded.indexOf(":");
  if (idx === -1) return false;
  const u = decoded.slice(0, idx);
  const p = decoded.slice(idx + 1);
  return safeEqual(u, user) && safeEqual(p, pass);
}

export const AUTH_REALM = 'Basic realm="TuneView Admin", charset="UTF-8"';
