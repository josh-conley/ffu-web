// PIN hashing. A 4–8 digit PIN is a small keyspace, so the hash alone can't protect it from an
// offline attacker; what does is that the database is never public and online guessing is capped
// (see MAX_FAILURES in routes.ts). PBKDF2 at the Workers maximum of 100k iterations still keeps a
// leaked row from being reversed instantly.

const ITERATIONS = 100_000

export const PIN_PATTERN = /^\d{4,8}$/

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

async function derive(pin: string, saltHex: string): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS }, key, 256)
  return toHex(new Uint8Array(bits))
}

export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  return { hash: await derive(pin, salt), salt }
}

/** Compares in constant time over equal-length strings, so the check leaks nothing by timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  return safeEqual(await derive(pin, salt), hash)
}
