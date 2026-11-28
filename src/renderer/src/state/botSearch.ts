/** Accent- and case-insensitive matching for the bot pickers (issue 610, as chat search in #399). */
const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase()

export function matchesBot(name: string, title: string | undefined, query: string): boolean {
  const needle = fold(query.trim())
  if (!needle) return true
  // The title carries the display name and the part after a `·` or `|` (issue 610's open question).
  return fold(name).includes(needle) || fold(title ?? '').includes(needle)
}
