// PIN hashing. The PIN is what stops a member saving over someone else's bracket; there is
// deliberately no cap on wrong guesses and no admin reset (Josh's call, 2026-10-13: a member with a
// problem asks in Discord, and Josh deletes the entry in the D1 console, README.md "Operations").
//
// A 4–8 digit PIN is a tiny keyspace, so no hash makes a leaked row safe offline, and a slow one
// (PBKDF2) would only spend the free plan's 10ms of CPU per request. The hash is here so PINs,
// which people reuse, are never readable as-is in the database console.

export const PIN_PATTERN = /^\d{4,8}$/

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

async function digest(pin: string, salt: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${pin}`))))
}

export async function hashPin(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)))
  return { hash: await digest(pin, salt), salt }
}

/** Compares in constant time over equal-length strings, so the check leaks nothing by timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  return safeEqual(await digest(pin, salt), hash)
}
