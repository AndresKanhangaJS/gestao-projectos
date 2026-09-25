import { useId, useState } from 'react'
import { ChevronDown, ChevronRight, Lightbulb } from 'lucide-react'
import { canEditTasks } from '@/lib/projectPermissions'
import { cn } from '@/lib/utils'
import type { ProjectPermissions } from '@/types/projects'

export const HOW_IT_WORKS_STORAGE_KEY = 'projects.howItWorks.collapsed'

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(HOW_IT_WORKS_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(HOW_IT_WORKS_STORAGE_KEY, collapsed ? '1' : '0')
  } catch {
    // localStorage indisponível (modo privado, quota): o painel só não fica lembrado.
  }
}

interface Step {
  title: string
  text: string
  who: string
  /** `undefined` = passo informativo (não depende do utilizador actual). */
  allowed?: boolean
}

/**
 * Painel colapsável no topo do projecto que explica o fluxo de trabalho em 6 passos e indica,
 * conforme as permissões (`can`), o que o utilizador actual pode fazer. O estado aberto/fechado
 * fica guardado no browser.
 */
export function ProjectHowItWorks({ can }: { can: ProjectPermissions }) {
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const contentId = useId()

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    writeCollapsed(next)
  }

  const steps: Step[] = [
    {
      title: 'Criar o projecto',
      text: 'O gestor cria o projecto num workspace. O projecto nasce com um quadro de 4 colunas: Por fazer, Em curso, Em revisão e Concluído.',
      who: 'Gestores do workspace',
    },
    {
      title: 'Adicionar a equipa',
      text: 'Adicione as pessoas como membros do workspace. Vêem o projecto os membros do workspace (incluindo leitores) e os administradores e gestores de projecto da empresa. Só membros que não sejam leitores podem ser responsáveis por tarefas.',
      who: 'Gestores do workspace',
      allowed: can.manage_members,
    },
    {
      title: 'Criar tarefas',
      text: 'Cada tarefa nova fica no backlog do projecto (a lista do que há para fazer), até ser planeada. Se a criar no Kanban com o sprint activo seleccionado, ou numa secção de sprint do Backlog, entra logo nesse sprint.',
      who: 'Membros e gestores',
      allowed: can.create_task,
    },
    {
      title: 'Planear um sprint',
      text: 'No separador Backlog, crie um sprint (um período curto, ex.: 2 semanas) e passe para ele as tarefas do backlog que a equipa vai fazer.',
      who: 'Gestores do workspace',
      allowed: can.manage_sprints,
    },
    {
      title: 'Iniciar o sprint e trabalhar',
      text: 'Ao iniciar o sprint, o Kanban passa a mostrar as tarefas desse sprint. A equipa arrasta os cartões de coluna em coluna à medida que avança.',
      who: 'Iniciar: gestores · Mover cartões: membros',
      allowed: can.manage_sprints || canEditTasks(can),
    },
    {
      title: 'Concluir o sprint',
      text: 'No fim do período, conclua o sprint no Backlog. Ao concluir, escolhe se as tarefas pendentes voltam ao backlog ou passam para o próximo sprint planeado.',
      who: 'Gestores do workspace',
      allowed: can.manage_sprints,
    },
  ]

  return (
    <section
      aria-labelledby={`${contentId}-title`}
      className="rounded-lg border border-border bg-card text-card-foreground"
    >
      <div className="flex items-center gap-2 px-4 py-2">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls={contentId}
          className="flex flex-1 items-center gap-2 rounded-sm text-left text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
          <Lightbulb className="h-4 w-4 text-warning" aria-hidden="true" />
          <span id={`${contentId}-title`}>Como funciona</span>
          {collapsed && (
            <span className="font-normal text-muted-foreground">(mostrar os passos)</span>
          )}
        </button>
      </div>
      <div id={contentId} hidden={collapsed} className="border-t border-border px-4 py-3">
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="font-medium">
                  <span className="sr-only">Passo {index + 1}: </span>
                  {step.title}
                </p>
                <p className="text-muted-foreground">{step.text}</p>
                <p className="text-xs">
                  <span className="text-muted-foreground">Quem: {step.who}</span>
                  {step.allowed !== undefined && (
                    <span
                      className={cn(
                        'ml-2 rounded-full px-1.5 py-0.5 font-medium',
                        step.allowed
                          ? 'bg-success/15 text-success'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {step.allowed ? 'Pode fazer' : 'Não disponível para si'}
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
