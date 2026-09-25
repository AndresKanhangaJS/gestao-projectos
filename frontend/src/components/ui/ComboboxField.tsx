import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form'
import { Combobox, type ComboboxOption } from './Combobox'

/**
 * `Combobox` ligado ao React Hook Form (valor string; `''` = nenhum). Usar em vez de `SelectField`
 * quando a lista pode ser longa. Associa-se à label e ao erro como os outros campos (`${id}-error`).
 */
export function ComboboxField<T extends FieldValues>({
  control,
  name,
  id,
  options,
  placeholder,
  emptyLabel,
  disabled,
  invalid,
  onValueChange,
}: {
  control: Control<T>
  name: Path<T>
  id: string
  options: ComboboxOption[]
  placeholder?: string
  emptyLabel?: string
  disabled?: boolean
  invalid?: boolean
  onValueChange?: (value: string) => void
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Combobox
          id={id}
          value={typeof field.value === 'string' ? field.value : String(field.value ?? '')}
          onChange={(value) => {
            field.onChange(value)
            onValueChange?.(value)
          }}
          onBlur={field.onBlur}
          options={options}
          placeholder={placeholder}
          emptyLabel={emptyLabel}
          disabled={disabled}
          invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
        />
      )}
    />
  )
}
