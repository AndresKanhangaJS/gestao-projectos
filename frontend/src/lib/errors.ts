import { isAxiosError } from 'axios'

export function httpStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined
}

export function isForbidden(error: unknown): boolean {
  return httpStatus(error) === 403
}

/** Primeira mensagem de validação (422) do Laravel, se existir. */
export function validationMessage(error: unknown): string | undefined {
  if (!isAxiosError(error) || error.response?.status !== 422) return undefined
  const body: unknown = error.response.data
  if (typeof body !== 'object' || body === null) return undefined
  const errors = (body as { errors?: unknown }).errors
  if (typeof errors === 'object' && errors !== null) {
    const first = Object.values(errors as Record<string, unknown>)[0]
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0]
  }
  const message = (body as { message?: unknown }).message
  return typeof message === 'string' ? message : undefined
}

export const TOO_MANY_REQUESTS_MESSAGE = 'Demasiados pedidos em pouco tempo. Aguarde um minuto e tente novamente.'

export function isTooManyRequests(error: unknown): boolean {
  return httpStatus(error) === 429
}

/** Campo `message` da resposta de erro da API, se existir. */
export function serverMessage(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined
  const body: unknown = error.response?.data
  if (typeof body !== 'object' || body === null) return undefined
  const message = (body as { message?: unknown }).message
  return typeof message === 'string' && message !== '' ? message : undefined
}

/** Mensagem em português para mostrar ao utilizador após uma mutação falhada. */
export function mutationErrorMessage(error: unknown, fallback = 'Não foi possível guardar as alterações.'): string {
  if (isForbidden(error)) return 'Não tem permissão para executar esta acção.'
  if (isTooManyRequests(error)) return TOO_MANY_REQUESTS_MESSAGE
  if (httpStatus(error) === 419) return 'A sessão expirou. Recarregue a página e tente novamente.'
  return validationMessage(error) ?? fallback
}
