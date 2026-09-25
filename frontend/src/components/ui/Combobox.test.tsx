import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog, DialogContent, DialogTitle } from './Dialog'
import { ChoiceWithOther } from './ChoiceWithOther'
import { Combobox, type ComboboxOption } from './Combobox'
import { Label } from './Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select'

const machines: ComboboxOption[] = Array.from({ length: 40 }, (_, i) => ({
  value: String(i + 1),
  label: `Máquina ${i + 1}`,
  description: `10.10.10.${i + 1}`,
}))

function ControlledCombobox({ onChange }: { onChange?: (v: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <>
      <Label htmlFor="machine">Máquina</Label>
      <Combobox
        id="machine"
        value={value}
        onChange={(v) => {
          setValue(v)
          onChange?.(v)
        }}
        options={machines}
      />
    </>
  )
}

describe('Combobox', () => {
  it('filtra ao escrever (sem acentos, também pela descrição) e escolhe com o teclado', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ControlledCombobox onChange={onChange} />)

    const input = screen.getByRole('combobox', { name: 'Máquina' })
    await user.type(input, 'maquina 3')
    const listbox = screen.getByRole('listbox')
    // "Máquina 3" e "Máquina 30..39"
    expect(within(listbox).getAllByRole('option')).toHaveLength(11)

    await user.keyboard('{ArrowDown}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('30')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveValue('Máquina 30')

    await user.clear(input)
    await user.type(input, '10.10.10.7')
    expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(1)
  })

  it('a lista tem altura máxima com scroll', async () => {
    const user = userEvent.setup()
    render(<ControlledCombobox />)
    await user.click(screen.getByRole('combobox', { name: 'Máquina' }))
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveClass('max-h-60', 'overflow-y-auto')
    expect(within(listbox).getAllByRole('option')).toHaveLength(40)
  })

  it('dentro de um diálogo, Escape fecha só a lista e clicar numa opção não fecha o diálogo', async () => {
    const onOpenChange = vi.fn()
    const user = userEvent.setup()
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Novo deployment</DialogTitle>
          <ControlledCombobox />
        </DialogContent>
      </Dialog>,
    )

    const input = screen.getByRole('combobox', { name: 'Máquina' })
    await user.click(input)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onOpenChange).not.toHaveBeenCalled()

    await user.click(input)
    await user.click(screen.getByRole('option', { name: /Máquina 12/ }))
    expect(input).toHaveValue('Máquina 12')
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('Select (listas com scroll)', () => {
  it('limita a altura da lista e permite scroll', async () => {
    const user = userEvent.setup()
    render(
      <Select>
        <SelectTrigger aria-label="Máquina">
          <SelectValue placeholder="Escolha" />
        </SelectTrigger>
        <SelectContent>
          {machines.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    )
    await user.click(screen.getByRole('combobox', { name: 'Máquina' }))
    const listbox = await screen.findByRole('listbox')
    expect(listbox.className).toContain(
      'max-h-[min(20rem,var(--radix-select-content-available-height))]',
    )
  })
})

describe('ChoiceWithOther', () => {
  function Harness({ initial, onChange }: { initial: string; onChange: (v: string) => void }) {
    const [value, setValue] = useState(initial)
    return (
      <>
        <Label htmlFor="engine">Motor de base de dados</Label>
        <ChoiceWithOther
          id="engine"
          value={value}
          onChange={(v) => {
            setValue(v)
            onChange(v)
          }}
          options={[
            { value: 'MySQL', label: 'MySQL' },
            { value: 'PostgreSQL', label: 'PostgreSQL' },
          ]}
          noneLabel="Sem base de dados"
          otherInputLabel="Motor de base de dados (outro)"
        />
      </>
    )
  }

  it('um valor gravado fora da lista aparece em "Outro…" com o texto no campo livre', () => {
    render(<Harness initial="Firebird" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Motor de base de dados' })).toHaveTextContent(
      'Outro…',
    )
    expect(screen.getByRole('textbox', { name: 'Motor de base de dados (outro)' })).toHaveValue(
      'Firebird',
    )
  })

  it('"Sem base de dados" envia vazio e "Outro…" mostra o campo livre', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<Harness initial="MySQL" onChange={onChange} />)

    await user.click(screen.getByRole('combobox', { name: 'Motor de base de dados' }))
    await user.click(await screen.findByRole('option', { name: 'Sem base de dados' }))
    expect(onChange).toHaveBeenLastCalledWith('')

    await user.click(screen.getByRole('combobox', { name: 'Motor de base de dados' }))
    await user.click(await screen.findByRole('option', { name: 'Outro…' }))
    const other = screen.getByRole('textbox', { name: 'Motor de base de dados (outro)' })
    await user.type(other, 'Firebird')
    expect(onChange).toHaveBeenLastCalledWith('Firebird')
  })
})
