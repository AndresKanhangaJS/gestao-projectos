import { useRef, useState } from 'react'
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Combobox, type ComboboxOption } from './Combobox'
import { Input } from './Input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select'

const OTHER = '__other__'
const NONE = '__none__'

export interface ChoiceWithOtherProps {
  id: string
  /** Valor gravado (texto livre na API). `''` = não definido. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  /** Valores conhecidos; `value` é o texto enviado à API. */
  options: ComboboxOption[]
  /** Se indicado, primeira opção que representa "sem valor" (envia `''` → `null`). */
  noneLabel?: string
  otherLabel?: string
  /** Nome acessível do campo livre que aparece com "Outro…". */
  otherInputLabel: string
  otherPlaceholder?: string
  /** `combobox` (pesquisável) para listas longas; `select` para poucas opções. */
  variant?: 'select' | 'combobox'
  invalid?: boolean
  describedBy?: string
  disabled?: boolean
}

/**
 * Campo de texto livre na API apresentado como lista de valores conhecidos + "Outro…".
 * Escolher "Outro…" mostra um campo livre. Um valor gravado que não esteja na lista aparece
 * como "Outro…" com o texto no campo livre, para nunca se perder nem ficar escondido.
 */
export function ChoiceWithOther({
  id,
  value,
  onChange,
  onBlur,
  options,
  noneLabel,
  otherLabel = 'Outro…',
  otherInputLabel,
  otherPlaceholder,
  variant = 'select',
  invalid,
  describedBy,
  disabled,
}: ChoiceWithOtherProps) {
  const isKnown = (v: string) => options.some((o) => o.value === v)
  // "Outro…" escolhido explicitamente (ainda sem texto) ou valor gravado fora da lista. Derivado
  // do valor para funcionar quando as opções chegam depois (ex.: lista de máquinas da API).
  const [forcedOther, setForcedOther] = useState(false)
  const otherMode = forcedOther || (value !== '' && !isKnown(value))
  const otherInputRef = useRef<HTMLInputElement>(null)

  function choose(choice: string) {
    if (choice === OTHER) {
      setForcedOther(true)
      onChange(isKnown(value) ? '' : value)
      // Dá foco ao campo livre assim que aparecer.
      window.setTimeout(() => otherInputRef.current?.focus(), 0)
      return
    }
    setForcedOther(false)
    onChange(choice === NONE ? '' : choice)
  }

  const current = otherMode ? OTHER : value === '' ? (noneLabel ? NONE : '') : value

  return (
    <div className="flex flex-col gap-2">
      {variant === 'combobox' ? (
        <Combobox
          id={id}
          value={current === NONE ? '' : current}
          onChange={(v) => choose(v === '' && noneLabel ? NONE : v)}
          onBlur={onBlur}
          options={[...options, { value: OTHER, label: otherLabel }]}
          emptyLabel={noneLabel}
          invalid={invalid}
          aria-describedby={describedBy}
          disabled={disabled}
        />
      ) : (
        <Select value={current} onValueChange={choose} disabled={disabled}>
          <SelectTrigger
            id={id}
            onBlur={onBlur}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
          >
            <SelectValue placeholder="Seleccione…" />
          </SelectTrigger>
          <SelectContent>
            {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value={OTHER}>{otherLabel}</SelectItem>
          </SelectContent>
        </Select>
      )}
      {otherMode && (
        <Input
          ref={otherInputRef}
          id={`${id}-other`}
          aria-label={otherInputLabel}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          placeholder={otherPlaceholder}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
        />
      )}
    </div>
  )
}

/** `ChoiceWithOther` ligado ao React Hook Form (valor string). */
export function ChoiceWithOtherField<T extends FieldValues>({
  control,
  name,
  ...props
}: Omit<ChoiceWithOtherProps, 'value' | 'onChange' | 'onBlur' | 'describedBy'> & {
  control: Control<T>
  name: Path<T>
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <ChoiceWithOther
          {...props}
          value={typeof field.value === 'string' ? field.value : ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          describedBy={props.invalid ? `${props.id}-error` : undefined}
        />
      )}
    />
  )
}
