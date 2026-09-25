import { describe, expect, it } from 'vitest'
import { normalizeProjectKey, suggestProjectKey } from './projectKey'

describe('suggestProjectKey', () => {
  it.each([
    ['Gestão de Projectos', 'GP'],
    ['Level RH', 'LRH'],
    ['Pitruca', 'PITRUC'],
    ['Portal de propinas do Level School', 'PPLS'],
    ['  ', ''],
    ['de', 'DE'],
  ])('%s dá %s', (name, expected) => {
    expect(suggestProjectKey(name)).toBe(expected)
  })
})

describe('normalizeProjectKey', () => {
  it('passa a maiúsculas e retira espaços', () => {
    expect(normalizeProjectKey(' gps x ')).toBe('GPSX')
  })
})
