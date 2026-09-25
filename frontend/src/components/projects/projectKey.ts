/** Palavras ignoradas ao formar a sigla a partir do nome do projecto. */
const STOP_WORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'a',
  'o',
  'para',
  'em',
  'no',
  'na',
])

const MAX_SUGGESTED_LENGTH = 6

/** Maiúsculas, sem espaços: é assim que a API guarda a chave. */
export function normalizeProjectKey(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

/**
 * Sugere uma chave a partir do nome: sigla das palavras principais
 * ("Gestão de Projectos" dá "GP", "Level RH" dá "LRH") ou, com uma só
 * palavra, as primeiras letras ("Pitruca" dá "PITRUC").
 */
export function suggestProjectKey(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
  const main = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()))
  const source = main.length > 0 ? main : words

  if (source.length === 0) return ''
  if (source.length === 1) return source[0].slice(0, MAX_SUGGESTED_LENGTH).toUpperCase()

  // Siglas já em maiúsculas (ex.: "RH") mantêm-se inteiras.
  const initials = source.map((w) => (w.length <= 4 && w === w.toUpperCase() ? w : w[0])).join('')

  return initials.slice(0, MAX_SUGGESTED_LENGTH).toUpperCase()
}
