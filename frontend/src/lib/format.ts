/**
 * Texto para valores não preenchidos (células, detalhes). Mostrar com estilo discreto
 * (`text-muted-foreground`). Quando houver um texto mais específico (ex.: "Sem prazo",
 * "Sem descrição"), preferir esse.
 */
export const EMPTY_VALUE = 'Não definido'

/** Data (YYYY-MM-DD ou ISO) formatada em pt-PT. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY_VALUE
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-PT')
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return EMPTY_VALUE
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-PT')
}

/** Período (ex.: de um sprint) em texto corrido: "de 01/09/2026 a 14/09/2026". */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (start && end) return `de ${formatDate(start)} a ${formatDate(end)}`
  if (start) return `a partir de ${formatDate(start)}`
  if (end) return `até ${formatDate(end)}`
  return 'sem datas definidas'
}

/** Data de hoje no formato YYYY-MM-DD (hora local). */
export function todayIso(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Tarefa atrasada: tem prazo anterior a hoje e não está numa coluna de "concluído". */
export function isOverdue(dueAt: string | null | undefined, done: boolean): boolean {
  return !done && !!dueAt && dueAt.slice(0, 10) < todayIso()
}
