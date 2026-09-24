import { useQuery } from '@tanstack/react-query'
import { listCredentialAccessLogs } from '@/api/infra'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { isForbidden } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { CREDENTIAL_TYPE_LABEL } from '@/lib/labels'
import type { Credential } from '@/types/infra'
import { credentialAccessLogsKey } from './queryKeys'

/** Histórico de revelações de segredo de uma credencial (só admin). */
export function CredentialAccessLogsDialog({ credential, onClose }: { credential: Credential; onClose: () => void }) {
  const query = useQuery({
    queryKey: credentialAccessLogsKey(credential.id),
    queryFn: () => listCredentialAccessLogs(credential.id),
    retry: (count, error) => !isForbidden(error) && count < 2,
  })
  const logs = query.data ?? []

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de acessos</DialogTitle>
          <DialogDescription>
            Credencial {CREDENTIAL_TYPE_LABEL[credential.type] ?? credential.type}
            {credential.username ? ` · ${credential.username}` : ''} — cada revelação do segredo fica registada.
          </DialogDescription>
        </DialogHeader>
        {query.isLoading ? (
          <LoadingState label="A carregar histórico…" />
        ) : query.isError ? (
          <ErrorState
            message={
              isForbidden(query.error)
                ? 'Apenas administradores podem consultar o histórico de acessos.'
                : 'Não foi possível carregar o histórico.'
            }
          />
        ) : logs.length === 0 ? (
          <EmptyState title="O segredo desta credencial nunca foi revelado" />
        ) : (
          <Table aria-label="Histórico de acessos à credencial">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Utilizador</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDateTime(log.accessed_at ?? log.created_at)}</TableCell>
                  <TableCell>{log.user?.name ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{log.ip_address ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
