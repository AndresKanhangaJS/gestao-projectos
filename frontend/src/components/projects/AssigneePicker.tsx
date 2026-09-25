import { Link } from 'react-router-dom'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/context/AuthContext'
import type { UserSummary } from '@/types/projects'
import { useProjectMembers, useProjectPermissions } from './useProjectData'

/** Ligação para gerir os membros do workspace (ou instrução, se o utilizador não os puder gerir). */
export function AddMembersHint({
  projectId,
  onNavigate,
}: {
  projectId: number
  onNavigate?: () => void
}) {
  const can = useProjectPermissions(projectId)
  if (!can.manage_members) {
    return (
      <p className="text-xs text-muted-foreground">
        Para atribuir a outras pessoas, peça a um gestor do workspace que as adicione como membros.
      </p>
    )
  }
  return (
    <Link
      to={`/projects/${projectId}?members=1`}
      onClick={onNavigate}
      className="self-start text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Adicionar membros ao workspace
    </Link>
  )
}

/**
 * Selecção múltipla de responsáveis entre os membros do workspace do projecto.
 * Responsáveis actuais que já não sejam membros continuam visíveis (para os poder retirar).
 */
export function AssigneePicker({
  projectId,
  idPrefix,
  value,
  onChange,
  current = [],
  disabled,
  onNavigate,
}: {
  projectId: number
  idPrefix: string
  value: number[]
  onChange: (ids: number[]) => void
  /** Responsáveis já atribuídos (para mostrar os que já não são membros). */
  current?: UserSummary[]
  disabled?: boolean
  /** Chamado antes de navegar para a gestão de membros (ex.: fechar o diálogo actual). */
  onNavigate?: () => void
}) {
  const { user } = useAuth()
  const { members, isLoading, isError } = useProjectMembers(projectId)
  const selected = new Set(value)
  // Leitores (papel `viewer`) não podem ser responsáveis: a API responde 422.
  const eligible = members.filter((m) => m.role !== 'viewer')
  const candidates: UserSummary[] = [
    ...eligible,
    ...current.filter((a) => !eligible.some((m) => m.id === a.id)),
  ]
  const hasOthers = eligible.some((m) => m.id !== user?.id)

  function toggle(userId: number, checked: boolean) {
    onChange(
      checked
        ? [...value.filter((id) => id !== userId), userId]
        : value.filter((id) => id !== userId),
    )
  }

  if (isLoading) return <Spinner />

  return (
    <div className="flex flex-col gap-2">
      {isError ? (
        <p className="text-sm text-destructive">
          Não foi possível carregar os membros do workspace.
        </p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          O workspace ainda não tem membros que possam ser responsáveis.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {candidates.map((member) => {
            const inputId = `${idPrefix}-assignee-${member.id}`
            return (
              <li key={member.id} className="flex items-center gap-1.5">
                <Checkbox
                  id={inputId}
                  checked={selected.has(member.id)}
                  disabled={disabled}
                  onCheckedChange={(checked) => toggle(member.id, checked === true)}
                />
                <Label htmlFor={inputId} className="font-normal">
                  {member.name}
                  {member.id === user?.id && <span className="text-muted-foreground"> (eu)</span>}
                </Label>
              </li>
            )
          })}
        </ul>
      )}
      {!isError && !hasOthers && <AddMembersHint projectId={projectId} onNavigate={onNavigate} />}
    </div>
  )
}
