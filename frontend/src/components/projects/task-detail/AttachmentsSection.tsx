import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Paperclip, Trash2, Upload } from 'lucide-react'
import {
  deleteAttachment,
  downloadAttachment,
  listAttachments,
  uploadAttachment,
} from '@/api/tasks'
import { DeleteConfirmDialog } from '@/components/common/DeleteConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { formatDateTime } from '@/lib/format'
import type { TaskAttachment } from '@/types/projects'
import { taskAttachmentsKey } from '../queryKeys'
import { MutationError } from './PeopleAndLabels'

/** Limite do backend (`max:10240` KB). Validação só de UX. */
const MAX_BYTES = 10 * 1024 * 1024

export function AttachmentsSection({
  taskId,
  onChanged,
  readOnly = false,
}: {
  taskId: number
  onChanged: () => void
  readOnly?: boolean
}) {
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [clientError, setClientError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<TaskAttachment | null>(null)
  const attachmentsQuery = useQuery({
    queryKey: taskAttachmentsKey(taskId),
    queryFn: () => listAttachments(taskId),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: taskAttachmentsKey(taskId) })
    onChanged()
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(taskId, file),
    onSuccess: refresh,
  })

  const downloadMutation = useMutation({
    mutationFn: (attachment: TaskAttachment) => downloadAttachment(taskId, attachment),
  })

  function handleFile(file: File | undefined) {
    setClientError(null)
    if (!file) return
    if (file.size > MAX_BYTES) {
      setClientError('O ficheiro excede o limite de 10 MB.')
      return
    }
    uploadMutation.mutate(file)
    if (fileInput.current) fileInput.current.value = ''
  }

  const attachments = attachmentsQuery.data ?? []
  const inputId = `task-${taskId}-attachment`

  return (
    <section aria-labelledby={`task-${taskId}-attachments`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 id={`task-${taskId}-attachments`} className="text-sm font-semibold">
          Anexos
        </h3>
        {!readOnly && (
          <>
            <input
              ref={fileInput}
              id={inputId}
              type="file"
              className="sr-only"
              tabIndex={-1}
              aria-label="Ficheiro a anexar"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={uploadMutation.isPending}
              onClick={() => fileInput.current?.click()}
            >
              {uploadMutation.isPending ? (
                <Spinner />
              ) : (
                <Upload className="h-4 w-4" aria-hidden="true" />
              )}
              {uploadMutation.isPending ? 'A enviar…' : 'Anexar ficheiro'}
            </Button>
          </>
        )}
      </div>
      {clientError && (
        <p className="text-sm text-destructive" role="alert">
          {clientError}
        </p>
      )}
      <MutationError error={uploadMutation.error} fallback="Não foi possível enviar o ficheiro." />
      <MutationError
        error={downloadMutation.error}
        fallback="Não foi possível transferir o ficheiro."
      />

      {attachmentsQuery.isLoading ? (
        <Spinner />
      ) : attachmentsQuery.isError ? (
        <p className="text-sm text-destructive">Não foi possível carregar os anexos.</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem anexos.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center gap-2 p-2 text-sm">
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{attachment.original_name}</p>
                <p className="text-xs text-muted-foreground">
                  {attachment.uploader?.name ?? 'Utilizador removido'} ·{' '}
                  {formatDateTime(attachment.created_at)}
                </p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                disabled={downloadMutation.isPending}
                onClick={() => downloadMutation.mutate(attachment)}
                aria-label={`Transferir ${attachment.original_name}`}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </Button>
              {!readOnly && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive"
                  onClick={() => setToDelete(attachment)}
                  aria-label={`Apagar ${attachment.original_name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <DeleteConfirmDialog
        key={toDelete?.id ?? 'none'}
        item={toDelete}
        onClose={() => setToDelete(null)}
        title="Apagar anexo?"
        description={
          toDelete
            ? `O ficheiro “${toDelete.original_name}” será removido permanentemente.`
            : undefined
        }
        remove={(attachment) => deleteAttachment(taskId, attachment.id)}
        onDeleted={refresh}
        errorFallback="Não foi possível apagar o anexo."
      />
    </section>
  )
}
