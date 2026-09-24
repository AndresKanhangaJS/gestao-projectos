import { isAxiosError } from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { mutationErrorMessage } from './errors'

/** Chave do erro "global" (não associado a um campo) do formulário, em `formState.errors.root`. */
export const SERVER_ERROR_KEY = 'root.server' as const

/** Erros de validação 422 do Laravel (`{ message, errors: { campo: [mensagens] } }`), ou `null`. */
export function laravelValidationErrors(error: unknown): Record<string, string[]> | null {
  if (!isAxiosError(error) || error.response?.status !== 422) return null
  const body: unknown = error.response.data
  if (typeof body !== 'object' || body === null) return null
  const errors = (body as { errors?: unknown }).errors
  if (typeof errors !== 'object' || errors === null) return null

  const result: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
    const messages = Array.isArray(value) ? value.filter((m): m is string => typeof m === 'string') : []
    if (messages.length) result[key] = messages
  }
  return result
}

export interface ApplyServerErrorsOptions<T extends FieldValues> {
  /** Campos do formulário que podem receber erros do servidor. */
  fields: readonly Path<T>[]
  /** Mapeia chaves do Laravel para campos do formulário quando os nomes diferem (ex.: `label_ids.0` → `label_ids`). */
  aliases?: Partial<Record<string, Path<T>>>
  /** Mensagem genérica quando não há detalhe utilizável. */
  fallback?: string
}

/**
 * Converte o erro de uma mutação em erros do React Hook Form:
 * - 422: cada mensagem vai para o campo correspondente (`setError(campo)`); chaves aninhadas
 *   (`modules.0.active`) são associadas ao campo raiz se existir; o que sobrar vai para `root.server`.
 * - outros erros (403, 500, rede…): uma mensagem em português em `root.server`.
 *
 * Devolve `true` se pelo menos um erro ficou associado a um campo.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  { fields, aliases = {}, fallback }: ApplyServerErrorsOptions<T>,
): boolean {
  const validation = laravelValidationErrors(error)
  if (!validation) {
    setError(SERVER_ERROR_KEY, { type: 'server', message: mutationErrorMessage(error, fallback) })
    return false
  }

  const known = new Set<string>(fields)
  const unmapped: string[] = []
  let mapped = false

  for (const [key, messages] of Object.entries(validation)) {
    const target = aliases[key] ?? (known.has(key) ? key : aliases[key.split('.')[0]] ?? key.split('.')[0])
    if (known.has(target)) {
      setError(target as Path<T>, { type: 'server', message: messages[0] })
      mapped = true
    } else {
      unmapped.push(messages[0])
    }
  }

  if (unmapped.length) {
    setError(SERVER_ERROR_KEY, { type: 'server', message: unmapped.join(' ') })
  } else if (!mapped) {
    setError(SERVER_ERROR_KEY, { type: 'server', message: mutationErrorMessage(error, fallback) })
  }
  return mapped
}

/** Atributos de acessibilidade para um input com possível mensagem de erro. */
export function fieldA11y(id: string, error?: { message?: string }) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : undefined,
  } as const
}

/** Converte string vazia (inputs de texto opcionais) em `null` para a API. */
export function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}
