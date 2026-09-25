import type { ComboboxOption } from '@/components/ui/Combobox'

/**
 * Valores sugeridos para campos que a API guarda como texto livre (sem enum no backend).
 * O `value` é exactamente o texto gravado; "Outro…" permite qualquer outro valor.
 */
export const DATABASE_ENGINE_OPTIONS: ComboboxOption[] = [
  'MySQL',
  'MariaDB',
  'PostgreSQL',
  'SQL Server',
  'Oracle',
  'SQLite',
  'MongoDB',
  'Redis',
].map((name) => ({ value: name, label: name }))

/** Host da base de dados quando o servidor corre na mesma máquina do deployment. */
export const DATABASE_HOST_LOCALHOST: ComboboxOption = {
  value: 'localhost',
  label: 'Mesma máquina do deployment (localhost)',
}

export const OPERATING_SYSTEM_OPTIONS: ComboboxOption[] = [
  'Linux Ubuntu',
  'Linux Debian',
  'Linux Rocky/AlmaLinux',
  'Linux CentOS',
  'Windows 10',
  'Windows 11',
  'Windows Server',
  'macOS',
].map((name) => ({ value: name, label: name }))

/** Categorias sugeridas para produtos de software (juntam-se às já usadas noutros produtos). */
export const SOFTWARE_CATEGORY_SUGGESTIONS = [
  'Gestão Escolar',
  'Gestão de Recursos Humanos',
  'Gestão Clínica',
  'Gestão Patrimonial',
  'Financeiro',
  'Biblioteca',
  'Website institucional',
  'Projecto interno',
]

/** Opções únicas e ordenadas a partir de sugestões + valores já existentes. */
export function mergeSuggestions(
  suggestions: readonly string[],
  existing: readonly (string | null | undefined)[],
) {
  const values = new Set<string>(suggestions)
  for (const value of existing) if (value) values.add(value)
  return [...values]
    .sort((a, b) => a.localeCompare(b, 'pt-PT'))
    .map((value) => ({ value, label: value }))
}
