import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'

/**
 * Intervalo de actualização automática das vistas de um projecto (Kanban, Lista, Backlog, detalhe).
 * Polling simples (Fase 1): tempo real via WebSockets fica para a Fase 2 (ver `specs/ROADMAP.md`).
 */
export const PROJECT_LIVE_REFETCH_MS = 10_000

/**
 * Opções de query para manter um projecto actualizado sem acção do utilizador: refaz o pedido a cada
 * `PROJECT_LIVE_REFETCH_MS` (só com o separador visível) e ao voltar ao separador.
 *
 * O polling pára enquanto houver uma mutação em curso, para uma resposta antiga não sobrepor a
 * actualização optimista (ex.: mover um cartão). A invalidação no fim da mutação volta a ligá-lo.
 */
export function useProjectLiveRefresh() {
  const queryClient = useQueryClient()
  return useMemo(
    () => ({
      refetchInterval: () => (queryClient.isMutating() > 0 ? false : PROJECT_LIVE_REFETCH_MS),
      refetchOnWindowFocus: true,
    }),
    [queryClient],
  )
}
