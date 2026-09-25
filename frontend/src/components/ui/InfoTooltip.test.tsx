import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InfoTooltip } from './InfoTooltip'

describe('InfoTooltip', () => {
  it('é um botão com nome acessível e mostra a ajuda ao receber foco pelo teclado', async () => {
    const user = userEvent.setup()
    render(<InfoTooltip label="Sprint" text="Um período curto de trabalho." />)

    const trigger = screen.getByRole('button', { name: 'Ajuda: Sprint' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(trigger).not.toHaveAttribute('aria-describedby')

    await user.tab()
    expect(trigger).toHaveFocus()

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveTextContent('Um período curto de trabalho.')
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)
    expect(trigger).toHaveAccessibleDescription('Um período curto de trabalho.')
  })

  it('fecha com Escape', async () => {
    const user = userEvent.setup()
    render(<InfoTooltip label="Sprint" text="Texto de ajuda" />)

    await user.tab()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('abre e fecha com toque/clique (sem depender de passar o rato)', () => {
    render(<InfoTooltip label="Backlog" text="Tarefas sem sprint" />)
    const trigger = screen.getByRole('button', { name: 'Ajuda: Backlog' })

    fireEvent.click(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tarefas sem sprint')

    fireEvent.click(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('abre ao passar o rato e não dispara o clique do elemento pai', async () => {
    const user = userEvent.setup()
    let parentClicks = 0
    render(
      <div onClick={() => (parentClicks += 1)}>
        <InfoTooltip label="Coluna" text="Etapa do trabalho" />
      </div>,
    )
    const trigger = screen.getByRole('button', { name: 'Ajuda: Coluna' })

    await user.hover(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Etapa do trabalho')

    await user.click(trigger)
    expect(parentClicks).toBe(0)
  })

  it('com icon="lock" explica porque a acção não está disponível', () => {
    render(<InfoTooltip icon="lock" label="Nova tarefa" text="Só membros podem criar tarefas." />)
    expect(
      screen.getByRole('button', { name: 'Porque não está disponível: Nova tarefa' }),
    ).toBeInTheDocument()
  })
})
