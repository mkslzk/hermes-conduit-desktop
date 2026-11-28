import { describe, expect, it } from 'vitest'
import { matchesBot, sectionOpen } from '../src/renderer/src/state/botSearch'

describe('the bot pickers’ search', () => {
  it('ignores accents and case, and matches the display name', () => {
    expect(matchesBot('genix', 'Genix Lab · Qualidade (Curie)', 'qualidade')).toBe(true)
    expect(matchesBot('curie', 'Curie', 'CURIE')).toBe(true)
    expect(matchesBot('joao', 'João', 'joao')).toBe(true)
  })

  it('keeps empty queries and rejects other bots', () => {
    expect(matchesBot('curie', 'Curie', '  ')).toBe(true)
    expect(matchesBot('curie', 'Curie', 'grok')).toBe(false)
  })
})

describe('a folded category under search', () => {
  it('opens while a query is active and folds again when it clears', () => {
    expect(sectionOpen(['work'], 'work', '')).toBe(false)
    expect(sectionOpen(['work'], 'work', '  ')).toBe(false)
    expect(sectionOpen(['work'], 'work', 'curie')).toBe(true)
    expect(sectionOpen([], 'work', 'curie')).toBe(true)
  })
})
