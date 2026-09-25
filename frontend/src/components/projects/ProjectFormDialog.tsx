import { useMemo, useState, type ChangeEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createProject, getProjectLinkOptions, updateProject } from '@/api/projects'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { ComboboxField } from '@/components/ui/ComboboxField'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { FieldError, FormField, FormServerError } from '@/components/ui/FormField'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { SelectField } from '@/components/ui/SelectField'
import { Spinner } from '@/components/ui/Spinner'
import { Textarea } from '@/components/ui/Textarea'
import { applyServerErrors, emptyToNull, fieldA11y } from '@/lib/forms'
import { HELP } from '@/lib/help'
import type { Project, Workspace } from '@/types/projects'
import { normalizeProjectKey, suggestProjectKey } from './projectKey'
import { selectableModules } from './projectLink'
import { projectKey, projectLinkOptionsKey, projectsKey, workspacesKey } from './queryKeys'

const schema = z.object({
  workspace_id: z.string(),
  key: z
    .string()
    .trim()
    .min(1, 'A chave é obrigatória.')
    .min(2, 'A chave tem de ter pelo menos 2 caracteres.')
    .max(20, 'A chave não pode ter mais de 20 caracteres.')
    .regex(
      /^[A-Za-z0-9][A-Za-z0-9_-]*$/,
      'Use apenas letras, números, "-" ou "_", começando por letra ou número.',
    ),
  name: z
    .string()
    .trim()
    .min(1, 'O nome é obrigatório.')
    .max(255, 'O nome não pode ter mais de 255 caracteres.'),
  description: z.string(),
  software_product_id: z.string(),
  client_id: z.string(),
  module_ids: z.array(z.number()),
})
type FormValues = z.infer<typeof schema>

const FIELDS = [
  'workspace_id',
  'key',
  'name',
  'description',
  'software_product_id',
  'client_id',
  'module_ids',
] as const

/**
 * Criar (sem `project`) ou editar um projecto, incluindo a relação opcional com o cliente:
 * Software → Cliente (só quem tem esse software) → Módulos. Montar só quando aberto.
 */
export function ProjectFormDialog({
  open,
  onOpenChange,
  workspaces = [],
  project = null,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Workspaces onde se pode criar (só na criação). */
  workspaces?: Workspace[]
  project?: Project | null
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const editing = project != null
  const optionsQuery = useQuery({ queryKey: projectLinkOptionsKey, queryFn: getProjectLinkOptions })
  const products = useMemo(() => optionsQuery.data?.software_products ?? [], [optionsQuery.data])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      editing
        ? schema
        : schema.refine((v) => v.workspace_id !== '', {
            path: ['workspace_id'],
            message: 'Seleccione o workspace.',
          }),
    ),
    defaultValues: {
      workspace_id: project
        ? String(project.workspace_id)
        : workspaces.length === 1
          ? String(workspaces[0].id)
          : '',
      key: project?.key ?? '',
      name: project?.name ?? '',
      description: project?.description ?? '',
      software_product_id: project?.software_product ? String(project.software_product.id) : '',
      client_id: project?.client ? String(project.client.id) : '',
      module_ids: (project?.modules ?? []).map((m) => m.id),
    },
  })

  /** Passa a true quando o utilizador escreve a chave; a partir daí deixa de ser sugerida. */
  const [keyEdited, setKeyEdited] = useState(editing)

  const productId = useWatch({ control, name: 'software_product_id' })
  const clientId = useWatch({ control, name: 'client_id' })
  const product = products.find((p) => String(p.id) === productId)
  const modules = selectableModules(product, clientId)

  /** Mantém só os módulos que continuam disponíveis depois de mudar o software ou o cliente. */
  function keepAllowedModules(nextProductId: string, nextClientId: string) {
    const allowed = new Set(
      selectableModules(
        products.find((p) => String(p.id) === nextProductId),
        nextClientId,
      ).map((m) => m.id),
    )
    setValue(
      'module_ids',
      getValues('module_ids').filter((id) => allowed.has(id)),
    )
  }

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const link = {
        software_product_id: values.software_product_id ? Number(values.software_product_id) : null,
        client_id: values.client_id ? Number(values.client_id) : null,
        module_ids: values.software_product_id ? values.module_ids : [],
      }
      const common = {
        key: values.key.toUpperCase(),
        name: values.name,
        description: emptyToNull(values.description),
        ...link,
      }
      return project
        ? updateProject(project.id, common)
        : createProject({ ...common, workspace_id: Number(values.workspace_id) })
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: projectsKey })
      void queryClient.invalidateQueries({ queryKey: workspacesKey })
      // As vistas de Infra (cliente/software) listam os projectos ligados.
      void queryClient.invalidateQueries({ queryKey: ['infra'] })
      if (project) {
        queryClient.setQueryData<Project>(projectKey(project.id), (old) =>
          old ? { ...old, ...saved } : saved,
        )
      }
      onOpenChange(false)
      if (!project) navigate(`/projects/${saved.id}`)
    },
    onError: (error) =>
      applyServerErrors(error, setError, {
        fields: FIELDS,
        fallback: project
          ? 'Não foi possível guardar o projecto.'
          : 'Não foi possível criar o projecto.',
      }),
  })

  const productOptions = products.map((p) => ({ value: String(p.id), label: p.name }))
  const clientOptions = (product?.clients ?? []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar projecto' : 'Novo projecto'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Altere os dados do projecto ou a sua relação com o cliente.'
              : 'O projecto nasce com um quadro de 4 colunas (Por fazer, Em curso, Em revisão, Concluído). Todos os membros do workspace escolhido passam a vê-lo.'}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          noValidate
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
        >
          {!editing && (
            <FormField
              id="p-workspace"
              label="Workspace"
              error={errors.workspace_id}
              help={HELP.workspace}
            >
              <SelectField
                control={control}
                name="workspace_id"
                id="p-workspace"
                invalid={!!errors.workspace_id}
                options={workspaces.map((w) => ({ value: String(w.id), label: w.name }))}
              />
            </FormField>
          )}
          <FormField id="p-name" label="Nome" error={errors.name}>
            <Input
              {...fieldA11y('p-name', errors.name)}
              {...register('name', {
                onChange: (event: ChangeEvent<HTMLInputElement>) => {
                  // Na criação, a chave acompanha o nome até o utilizador a editar à mão.
                  if (!editing && !keyEdited) {
                    setValue('key', suggestProjectKey(event.target.value))
                  }
                },
              })}
            />
          </FormField>
          <FormField id="p-key" label="Chave" error={errors.key} help={HELP.projectKey}>
            <Input
              maxLength={20}
              placeholder="ex.: GPS"
              autoCapitalize="characters"
              {...fieldA11y('p-key', errors.key)}
              {...register('key', {
                setValueAs: (value: string) => normalizeProjectKey(value),
                onChange: (event: ChangeEvent<HTMLInputElement>) => {
                  setKeyEdited(event.target.value.trim() !== '')
                  const normalized = normalizeProjectKey(event.target.value)
                  if (normalized !== event.target.value) event.target.value = normalized
                },
              })}
            />
          </FormField>
          <FormField id="p-description" label="Descrição" error={errors.description}>
            <Textarea
              {...fieldA11y('p-description', errors.description)}
              {...register('description')}
            />
          </FormField>

          <fieldset className="flex flex-col gap-3 rounded-md border border-border p-3">
            <legend className="flex items-center gap-1 px-1 text-sm font-semibold">
              Relação com o cliente <InfoTooltip {...HELP.projectLink} />
            </legend>
            {optionsQuery.isLoading ? (
              <Spinner />
            ) : optionsQuery.isError ? (
              <p className="text-sm text-destructive">
                Não foi possível carregar os softwares e clientes. Pode guardar o projecto sem esta
                relação e voltar a tentar depois.
              </p>
            ) : (
              <>
                <FormField
                  id="p-software"
                  label="Software"
                  error={errors.software_product_id}
                  help={HELP.projectSoftware}
                >
                  <ComboboxField
                    control={control}
                    name="software_product_id"
                    id="p-software"
                    emptyLabel="Nenhum (projecto sem software)"
                    placeholder="Pesquise o software…"
                    invalid={!!errors.software_product_id}
                    options={productOptions}
                    onValueChange={(value) => {
                      // Outro software: o cliente e os módulos anteriores deixam de fazer sentido.
                      setValue('client_id', '')
                      keepAllowedModules(value, '')
                    }}
                  />
                </FormField>
                <FormField
                  id="p-client"
                  label="Cliente"
                  error={errors.client_id}
                  help={HELP.projectClient}
                  hint={
                    productId
                      ? 'Deixe vazio para projectos internos do produto.'
                      : 'Escolha primeiro o software.'
                  }
                >
                  <ComboboxField
                    control={control}
                    name="client_id"
                    id="p-client"
                    disabled={!productId}
                    emptyLabel="Nenhum (projecto interno do produto)"
                    placeholder={
                      productId && clientOptions.length === 0
                        ? 'Nenhum cliente tem este software'
                        : 'Pesquise o cliente…'
                    }
                    invalid={!!errors.client_id}
                    options={clientOptions}
                    onValueChange={(value) => keepAllowedModules(productId, value)}
                  />
                </FormField>
                <fieldset className="flex flex-col gap-1.5" disabled={!productId}>
                  <legend className="mb-1 flex items-center gap-1 text-sm font-medium">
                    Módulos <InfoTooltip {...HELP.projectModules} />
                  </legend>
                  {!productId ? (
                    <p className="text-xs text-muted-foreground">
                      Os módulos aparecem depois de escolher o software.
                    </p>
                  ) : modules.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {clientId
                        ? 'Este cliente não tem módulos activos deste software.'
                        : 'Este software não tem módulos registados.'}
                    </p>
                  ) : (
                    <Controller
                      control={control}
                      name="module_ids"
                      render={({ field }) => (
                        <ul
                          className="flex flex-wrap gap-x-4 gap-y-2"
                          aria-label="Módulos do projecto"
                        >
                          {modules.map((module) => {
                            const inputId = `p-module-${module.id}`
                            const checked = field.value.includes(module.id)
                            return (
                              <li key={module.id} className="flex items-center gap-1.5">
                                <Checkbox
                                  id={inputId}
                                  checked={checked}
                                  onCheckedChange={(next) =>
                                    field.onChange(
                                      next === true
                                        ? [...field.value, module.id]
                                        : field.value.filter((id) => id !== module.id),
                                    )
                                  }
                                />
                                <Label htmlFor={inputId} className="font-normal">
                                  {module.name}
                                </Label>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    />
                  )}
                  <FieldError id="p-modules-error" message={errors.module_ids?.message} />
                </fieldset>
              </>
            )}
          </fieldset>

          <FormServerError message={errors.root?.server?.message} />
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar…' : editing ? 'Guardar alterações' : 'Criar projecto'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
