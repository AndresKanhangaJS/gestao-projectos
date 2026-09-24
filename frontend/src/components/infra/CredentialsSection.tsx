import { useEffect, useEffectEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Eye, History, KeyRound, Pencil, Plus, ShieldAlert, Trash2 } from 'lucide-react'
import { deleteCredential, listMachineCredentials, revealCredential, toTargetType } from '@/api/infra'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { CredentialAccessLogsDialog } from './CredentialAccessLogsDialog'
import { CredentialFormDialog } from './CredentialFormDialog'
import { credentialsKey } from './queryKeys'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table'
import { isForbidden, isTooManyRequests } from '@/lib/errors'
import { CREDENTIAL_TYPE_LABEL } from '@/lib/labels'
import type { Credential, PolymorphicTargetType } from '@/types/infra'

/** Tempo (segundos) durante o qual o segredo revelado fica visível. */
export const REVEAL_TIMEOUT_SECONDS = 30

export interface CredentialTarget {
  type: PolymorphicTargetType
  id: number
  /** Descrição curta do recurso a que a credencial pertence (ex.: "Máquina 32", "Backend :8080"). */
  label: string
}

const targetKeyOf = (credential: Credential) =>
  `${toTargetType(credential.credentialable_type)}:${credential.credentialable_id}`

/**
 * Credenciais de uma máquina e dos seus deployments, obtidas com o filtro server-side
 * `GET /infra/credentials?machine_id=N`. `targets` (a máquina + os seus deployments) serve para
 * rotular cada credencial e como salvaguarda: só são mostradas credenciais desses recursos.
 */
export function CredentialsSection({
  machineId,
  targets,
  title = 'Credenciais',
  canManage = false,
  canViewAccessLogs = false,
}: {
  machineId: number
  targets: CredentialTarget[]
  title?: string
  /** Mostrar acções de criar/editar/apagar (admin/infra). */
  canManage?: boolean
  /** Mostrar o histórico de acessos (admin). */
  canViewAccessLogs?: boolean
}) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Credential | null>(null)
  const [editing, setEditing] = useState<{ credential: Credential | null } | null>(null)
  const [toDelete, setToDelete] = useState<Credential | null>(null)
  const [logsFor, setLogsFor] = useState<Credential | null>(null)

  const credentialsQuery = useQuery({
    queryKey: ['infra', 'credentials', { machine_id: machineId }],
    queryFn: () => listMachineCredentials(machineId),
    retry: (count, error) => !isForbidden(error) && count < 2,
  })

  const labelsByKey = useMemo(() => new Map(targets.map((t) => [`${t.type}:${t.id}`, t.label])), [targets])
  const credentials = useMemo(
    () => (credentialsQuery.data ?? []).filter((c) => labelsByKey.has(targetKeyOf(c))),
    [credentialsQuery.data, labelsByKey],
  )
  const labelFor = (credential: Credential) => labelsByKey.get(targetKeyOf(credential)) ?? '—'

  let content: React.ReactNode
  if (credentialsQuery.isLoading) {
    content = <LoadingState label="A carregar credenciais…" />
  } else if (credentialsQuery.isError) {
    content = isForbidden(credentialsQuery.error) ? (
      <ErrorState message="Não tem permissão para consultar credenciais. Apenas administradores e a equipa de infra têm acesso." />
    ) : (
      <ErrorState message="Não foi possível carregar as credenciais." />
    )
  } else if (credentials.length === 0) {
    content = <EmptyState title="Sem credenciais registadas" />
  } else {
    content = (
      <Table aria-label={title}>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Associada a</TableHead>
            <TableHead>Utilizador</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead className="text-right">Acções</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {credentials.map((credential) => (
            <TableRow key={credential.id}>
              <TableCell>
                <Badge variant="outline">{CREDENTIAL_TYPE_LABEL[credential.type] ?? credential.type}</Badge>
              </TableCell>
              <TableCell>{labelFor(credential)}</TableCell>
              <TableCell className="font-mono text-xs">{credential.username ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground">{credential.notes ?? '—'}</TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelected(credential)}
                  aria-label={`Revelar segredo da credencial ${CREDENTIAL_TYPE_LABEL[credential.type] ?? credential.type}${credential.username ? ` de ${credential.username}` : ''}`}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  Revelar
                </Button>
                {canViewAccessLogs && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setLogsFor(credential)}
                    aria-label={`Histórico de acessos da credencial ${credential.username ?? `#${credential.id}`}`}
                  >
                    <History className="h-4 w-4" aria-hidden="true" />
                  </Button>
                )}
                {canManage && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setEditing({ credential })}
                      aria-label={`Editar credencial ${credential.username ?? `#${credential.id}`}`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setToDelete(credential)}
                      aria-label={`Apagar credencial ${credential.username ?? `#${credential.id}`}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {title}
          </CardTitle>
          {canManage && (
            <Button size="sm" onClick={() => setEditing({ credential: null })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nova credencial
            </Button>
          )}
        </div>
        <CardDescription>
          Os segredos nunca são listados. Revelar um segredo fica registado no histórico de auditoria.
        </CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
      {/* `key` força um estado limpo (sem segredo) sempre que se escolhe outra credencial. */}
      <RevealCredentialDialog key={`reveal-${selected?.id ?? 'none'}`} credential={selected} onClose={() => setSelected(null)} />
      {editing && (
        <CredentialFormDialog
          key={editing.credential?.id ?? 'new'}
          credential={editing.credential}
          targets={targets}
          onClose={() => setEditing(null)}
        />
      )}
      {logsFor && <CredentialAccessLogsDialog credential={logsFor} onClose={() => setLogsFor(null)} />}
      <DeleteConfirmDialog
        key={`delete-${toDelete?.id ?? 'none'}`}
        item={toDelete}
        onClose={() => setToDelete(null)}
        title="Apagar credencial?"
        description="A credencial e o seu segredo encriptado serão removidos permanentemente."
        remove={(c) => deleteCredential(c.id)}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: credentialsKey })}
        errorFallback="Não foi possível apagar a credencial."
      />
    </Card>
  )
}

export function RevealCredentialDialog({
  credential,
  onClose,
}: {
  credential: Credential | null
  onClose: () => void
}) {
  // O segredo vive apenas neste estado local: nunca em cache do TanStack Query nem em storage.
  const [secret, setSecret] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(REVEAL_TIMEOUT_SECONDS)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const revealMutation = useMutation({
    mutationFn: (id: number) => revealCredential(id),
    // Não manter o resultado na MutationCache depois de o componente desmontar.
    gcTime: 0,
    onSuccess: (result) => {
      setSecret(result.secret ?? '')
      setSecondsLeft(REVEAL_TIMEOUT_SECONDS)
    },
  })

  // Ao fim do tempo limite o segredo é descartado e o diálogo fecha-se.
  const onRevealTimeout = useEffectEvent(() => {
    handleClose()
  })

  useEffect(() => {
    if (secret === null) return
    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)
    const timeout = window.setTimeout(onRevealTimeout, REVEAL_TIMEOUT_SECONDS * 1000)
    return () => {
      window.clearInterval(interval)
      window.clearTimeout(timeout)
    }
  }, [secret])

  function handleClose() {
    setSecret(null)
    setCopyStatus('idle')
    revealMutation.reset()
    onClose()
  }

  async function handleCopy() {
    if (secret === null) return
    try {
      await navigator.clipboard.writeText(secret)
      setCopyStatus('copied')
    } catch {
      setCopyStatus('failed')
    }
  }

  const typeLabel = credential ? (CREDENTIAL_TYPE_LABEL[credential.type] ?? credential.type) : ''

  return (
    <Dialog open={credential != null} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revelar segredo</DialogTitle>
          <DialogDescription>
            Credencial {typeLabel}
            {credential?.username ? ` · ${credential.username}` : ''}
          </DialogDescription>
        </DialogHeader>

        {secret === null ? (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              <p>
                Vai visualizar um segredo em texto simples. Este acesso fica registado em auditoria
                (utilizador, data e IP). O segredo será escondido automaticamente após{' '}
                {REVEAL_TIMEOUT_SECONDS} segundos.
              </p>
            </div>
            {revealMutation.isError && (
              <p className="text-sm text-destructive" role="alert">
                {isForbidden(revealMutation.error)
                  ? 'Não tem permissão para revelar esta credencial. Apenas administradores e a equipa de infra podem fazê-lo.'
                  : isTooManyRequests(revealMutation.error)
                    ? 'Atingiu o limite de revelações de segredos (10 por minuto). Aguarde um minuto e tente novamente.'
                    : 'Não foi possível revelar o segredo. Tente novamente.'}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={revealMutation.isPending || credential == null}
                onClick={() => credential && revealMutation.mutate(credential.id)}
              >
                {revealMutation.isPending ? 'A revelar…' : 'Confirmar e revelar'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <code
                className="flex-1 break-all rounded-md border border-border bg-muted p-3 font-mono text-sm"
                aria-label="Segredo revelado"
              >
                {secret === '' ? '(sem segredo definido)' : secret}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                disabled={secret === ''}
                aria-label="Copiar segredo"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {copyStatus === 'copied' && 'Copiado para a área de transferência. '}
              {copyStatus === 'failed' && 'Não foi possível copiar automaticamente. '}
              Será escondido dentro de {secondsLeft} s.
            </p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleClose}>
                Esconder e fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
