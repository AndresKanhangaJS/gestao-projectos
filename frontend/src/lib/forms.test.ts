import { describe, expect, it, vi } from 'vitest'
import { AxiosError, AxiosHeaders } from 'axios'
import { applyServerErrors, laravelValidationErrors } from './forms'

function httpError(status: number, data: unknown): AxiosError {
  const headers = new AxiosHeaders()
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', { headers }, null, {
    status,
    statusText: String(status),
    headers: {},
    config: { headers },
    data,
  })
}

type Values = { name: string; contact_email: string; modules: string }

describe('applyServerErrors — mapeamento de erros 422 do Laravel', () => {
  it('associa cada mensagem ao campo correspondente', () => {
    const setError = vi.fn()
    const error = httpError(422, {
      message: 'The given data was invalid.',
      errors: { name: ['O nome já existe.'], contact_email: ['Email inválido.', 'Outro erro'] },
    })

    const mapped = applyServerErrors<Values>(error, setError, { fields: ['name', 'contact_email'] })

    expect(mapped).toBe(true)
    expect(setError).toHaveBeenCalledWith('name', { type: 'server', message: 'O nome já existe.' })
    expect(setError).toHaveBeenCalledWith('contact_email', { type: 'server', message: 'Email inválido.' })
    expect(setError).not.toHaveBeenCalledWith('root.server', expect.anything())
  })

  it('associa chaves aninhadas ao campo raiz e usa aliases', () => {
    const setError = vi.fn()
    const error = httpError(422, {
      errors: { 'modules.0.active': ['Estado inválido.'], credentialable_id: ['Recurso inválido.'] },
    })

    applyServerErrors<Values>(error, setError, {
      fields: ['modules', 'name'],
      aliases: { credentialable_id: 'name' },
    })

    expect(setError).toHaveBeenCalledWith('modules', { type: 'server', message: 'Estado inválido.' })
    expect(setError).toHaveBeenCalledWith('name', { type: 'server', message: 'Recurso inválido.' })
  })

  it('envia para root.server as mensagens sem campo correspondente', () => {
    const setError = vi.fn()
    const error = httpError(422, { errors: { workspace: ['Workspace arquivado.'] } })

    const mapped = applyServerErrors<Values>(error, setError, { fields: ['name'] })

    expect(mapped).toBe(false)
    expect(setError).toHaveBeenCalledWith('root.server', { type: 'server', message: 'Workspace arquivado.' })
  })

  it('traduz 403 para uma mensagem em português em root.server', () => {
    const setError = vi.fn()
    applyServerErrors<Values>(httpError(403, { message: 'This action is unauthorized.' }), setError, {
      fields: ['name'],
    })
    expect(setError).toHaveBeenCalledWith('root.server', {
      type: 'server',
      message: 'Não tem permissão para executar esta acção.',
    })
  })

  it('laravelValidationErrors ignora respostas que não são 422', () => {
    expect(laravelValidationErrors(httpError(500, { errors: { name: ['x'] } }))).toBeNull()
    expect(laravelValidationErrors(new Error('rede'))).toBeNull()
  })
})
