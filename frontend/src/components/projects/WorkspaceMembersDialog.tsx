import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, UserPlus } from 'lucide-react'
import { searchUsers } from '@/api/users'
import { getWorkspace, syncWorkspaceMembers } from '@/api/workspaces'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { FormServerError } from '@/components/ui/FormField'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { SelectField } from '@/components/ui/SelectField'
import { ErrorState, LoadingState, Spinner } from '@/components/ui/Spinner'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useHasRole } from '@/hooks/useHasRole'
import { WORKSPACE_OWNER_GRANT_ROLES } from '@/lib/roles'
import { isForbidden } from '@/lib/errors'
import { applyServerErrors } from '@/lib/forms'
import { HELP, WORKSPACE_ROLE_HELP, WORKSPACE_ROLE_LABEL } from '@/lib/help'
import { optionKeys } from '@/lib/labels'
import type { Workspace } from '@/types/projects'
import { projectsKey, tasksRootKey, userSearchKey, workspacesKey, workspaceKey } from './queryKeys'

const ROLES = ['owner', 'manager', 'member', 'viewer'] as const
const ROLE_OPTIONS = optionKeys(WORKSPACE_ROLE_LABEL).map((role) => ({
  value: role,
  label: WORKSPACE_ROLE_LABEL[role],
}))
/** Sem a opção "Dono" (só o dono do workspace ou um administrador a podem atribuir). */
const ROLE_OPTIONS_WITHOUT_OWNER = ROLE_OPTIONS.filter((option) => option.value !== 'owner')

const schema = z.object({
  members: z.array(
    z.object({
      user_id: z.number(),
      name: z.string(),
      email: z.string(),
      role: z.enum(ROLES, { error: 'Seleccione o papel.' }),
    }),
  ),
})
type FormValues = z.infer<typeof schema>

const MIN_SEARCH = 2

function toValues(workspace: Workspace): FormValues {
  return {
    members: (workspace.members ?? []).map((m) => ({
      user_id: m.id,
      name: m.name,
      email: m.email ?? '',
      role: m.role ?? 'member',
    })),
  }
}

function MembersForm({ workspace, onDone }: { workspace: Workspace; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const term = useDebouncedValue(search.trim(), 300)
  const ownerId = workspace.owner?.id
  const isAdmin = useHasRole(...WORKSPACE_OWNER_GRANT_ROLES)
  // Só o dono (ou um administrador) pode dar ou retirar o papel de dono.
  const canGrantOwner = workspace.my_role === 'owner' || isAdmin

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toValues(workspace) })
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'members',
    keyName: 'fieldKey',
  })

  const usersQuery = useQuery({
    queryKey: userSearchKey(term),
    queryFn: () => searchUsers(term),
    enabled: term.length >= MIN_SEARCH,
  })
  const memberIds = new Set(fields.map((f) => f.user_id))
  const results = (usersQuery.data ?? []).filter((u) => !memberIds.has(u.id))

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      syncWorkspaceMembers(
        workspace.id,
        values.members.map((m) => ({ user_id: m.user_id, role: m.role })),
      ),
    onSuccess: () => {
      // Membros e papéis mudam `members`, `my_role` e `can` do workspace e dos seus projectos.
      void queryClient.invalidateQueries({ queryKey: workspacesKey })
      void queryClient.invalidateQueries({ queryKey: projectsKey })
      // Quem sai do workspace ou passa a leitor deixa de ser responsável das tarefas.
      void queryClient.invalidateQueries({ queryKey: tasksRootKey })
      onDone()
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: ['members'],
        fallback: 'Não foi possível guardar os membros.',
      }),
  })

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <details className="rounded-md border border-border p-2 text-sm">
        <summary className="cursor-pointer font-medium">O que pode fazer cada papel?</summary>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          {ROLES.map((role) => (
            <div key={role} className="contents">
              <dt className="font-medium">{WORKSPACE_ROLE_LABEL[role]}</dt>
              <dd className="text-muted-foreground">{WORKSPACE_ROLE_HELP[role]}</dd>
            </div>
          ))}
        </dl>
      </details>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 flex items-center gap-1 text-sm font-medium">
          Membros ({fields.length}) <InfoTooltip {...HELP.roles} />
        </legend>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">O workspace ainda não tem membros.</p>
        ) : (
          <ul
            className="flex flex-col divide-y divide-border rounded-md border border-border"
            aria-label="Membros do workspace"
          >
            {fields.map((field, index) => {
              const isOwner = field.user_id === ownerId
              // Outros donos só podem ser alterados por quem pode atribuir o papel de dono.
              const lockedOwnerRole = field.role === 'owner' && !canGrantOwner
              const roleId = `member-${field.user_id}-role`
              return (
                <li key={field.fieldKey} className="flex flex-wrap items-center gap-2 p-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{field.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {field.email}
                      {isOwner && ' · dono do workspace'}
                    </p>
                  </div>
                  <Label htmlFor={roleId} className="sr-only">
                    Papel de {field.name}
                  </Label>
                  <SelectField
                    control={control}
                    name={`members.${index}.role`}
                    id={roleId}
                    className="w-40"
                    disabled={isOwner || lockedOwnerRole}
                    options={
                      canGrantOwner || field.role === 'owner'
                        ? ROLE_OPTIONS
                        : ROLE_OPTIONS_WITHOUT_OWNER
                    }
                  />
                  {isOwner || lockedOwnerRole ? (
                    <InfoTooltip
                      icon="lock"
                      label={`Remover ${field.name}`}
                      text={
                        isOwner
                          ? 'O dono do workspace não pode ser removido nem mudar de papel.'
                          : 'Só o dono do workspace ou um administrador pode alterar ou remover outro dono.'
                      }
                    />
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => remove(index)}
                      aria-label={`Remover ${field.name} do workspace`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="member-search">Adicionar pessoa</Label>
        <Input
          id="member-search"
          type="search"
          autoComplete="off"
          placeholder="Nome ou email (mín. 2 letras)…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {term.length >= MIN_SEARCH &&
          (usersQuery.isLoading ? (
            <Spinner />
          ) : usersQuery.isError ? (
            <p className="text-sm text-destructive">
              {isForbidden(usersQuery.error)
                ? 'Não tem permissão para pesquisar utilizadores.'
                : 'Não foi possível pesquisar utilizadores.'}
            </p>
          ) : results.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum utilizador encontrado fora do workspace.
            </p>
          ) : (
            <ul
              className="flex flex-col rounded-md border border-border"
              aria-label="Resultados da pesquisa"
            >
              {results.map((user) => (
                <li key={user.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {user.name}
                    {user.email && <span className="text-muted-foreground"> · {user.email}</span>}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      append({
                        user_id: user.id,
                        name: user.name,
                        email: user.email ?? '',
                        role: 'member',
                      })
                      setSearch('')
                    }}
                    aria-label={`Adicionar ${user.name}`}
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    Adicionar
                  </Button>
                </li>
              ))}
            </ul>
          ))}
        {!canGrantOwner && (
          <p className="text-xs text-muted-foreground">
            Só o dono do workspace ou um administrador pode atribuir o papel de dono.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Os novos membros entram como “Membro”; pode mudar o papel antes de guardar.
        </p>
      </div>

      <FormServerError message={errors.root?.server?.message ?? errors.members?.message} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!isDirty || mutation.isPending}>
          {mutation.isPending ? 'A guardar…' : 'Guardar membros'}
        </Button>
      </div>
    </form>
  )
}

/**
 * Gestão dos membros de um workspace: papel de cada um, remover e adicionar (pesquisa de
 * utilizadores). Grava tudo de uma vez (`PUT workspaces/{w}/members`). Montar só quando aberto.
 */
export function WorkspaceMembersDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const workspaceQuery = useQuery({
    queryKey: workspaceKey(workspaceId),
    queryFn: () => getWorkspace(workspaceId),
  })
  const workspace = workspaceQuery.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Membros do workspace{workspace ? ` “${workspace.name}”` : ''}</DialogTitle>
          <DialogDescription>
            Só os membros vêem os projectos deste workspace e podem ser responsáveis por tarefas.
          </DialogDescription>
        </DialogHeader>
        {/* Espera pelos dados frescos: o formulário parte dos membros actuais (não de uma cache antiga). */}
        {workspaceQuery.isLoading ||
        (workspaceQuery.isFetching && !workspaceQuery.isFetchedAfterMount) ? (
          <LoadingState />
        ) : workspaceQuery.isError || !workspace ? (
          <ErrorState message="Não foi possível carregar os membros do workspace." />
        ) : (
          <MembersForm workspace={workspace} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
