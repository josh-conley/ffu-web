/**
 * "1 week", "3 weeks" — a count with a noun that agrees with it.
 *
 * Here rather than inline at each call site because counts of one turn up all over the recap
 * blocks (a single defense, a week-old reign), and "1 weeks" in a newsletter reads as a bug.
 */
export function plural(count: number, noun: string, many = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : many}`
}
