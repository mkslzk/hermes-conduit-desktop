import { searchFold } from './searchFold'

/** Accent- and case-insensitive matching for the bot pickers (issue 610, as chat search in #399). */
export function matchesBot(name: string, title: string | undefined, query: string): boolean {
  const needle = searchFold(query.trim())
  if (!needle) return true
  // The title carries the display name and the part after a `·` or `|` (issue 610's open question).
  return searchFold(name).includes(needle) || searchFold(title ?? '').includes(needle)
}

/** A query force-opens a folded category, as the chat list does (issue 610 review). */
export function sectionOpen(folded: string[], key: string, query: string): boolean {
  return !!query.trim() || !folded.includes(key)
}
