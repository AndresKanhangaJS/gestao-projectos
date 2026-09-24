import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select'

/** Valor interno usado para a opção "nenhum" (o Radix Select não aceita string vazia). */
const NONE = '__none__'

export interface SelectOption {
  value: string
  label: string
}

/**
 * Select do design system ligado ao React Hook Form. O valor no formulário é sempre uma string;
 * `''` representa "nenhum" quando `emptyLabel` é indicado.
 */
export function SelectField<T extends FieldValues>({
  control,
  name,
  id,
  options,
  placeholder = 'Seleccione…',
  emptyLabel,
  disabled,
  invalid,
  onValueChange,
  className,
}: {
  control: Control<T>
  name: Path<T>
  id: string
  options: SelectOption[]
  placeholder?: string
  /** Se indicado, acrescenta uma opção para "nenhum" (valor `''`). */
  emptyLabel?: string
  disabled?: boolean
  invalid?: boolean
  onValueChange?: (value: string) => void
  className?: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const current = typeof field.value === 'string' ? field.value : String(field.value ?? '')
        return (
          <Select
            value={current === '' ? (emptyLabel ? NONE : '') : current}
            disabled={disabled}
            onValueChange={(value) => {
              const next = value === NONE ? '' : value
              field.onChange(next)
              onValueChange?.(next)
            }}
          >
            <SelectTrigger
              id={id}
              ref={field.ref}
              onBlur={field.onBlur}
              className={className}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? `${id}-error` : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {emptyLabel && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      }}
    />
  )
}
