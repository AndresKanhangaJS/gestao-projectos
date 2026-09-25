<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects\Concerns;

use App\Models\Infra\SoftwareModule;
use App\Models\Projects\Project;
use App\Services\Projects\ProjectLinkService;
use Illuminate\Validation\Validator;

/**
 * Regras de ligação Projecto ↔ Controlo de Software (todas opcionais):
 * - `software_product_id`: produto existente;
 * - `client_id`: exige produto e uma instalação (client_software) desse produto no cliente;
 * - `module_ids`: exige produto; cada módulo pertence ao produto e, havendo
 *   cliente, está entre os módulos activos da instalação do cliente.
 *
 * Omitido = não mexe; `null`/`[]` limpa. Na edição valida os valores
 * EFECTIVOS (enviados ou actuais), para nunca deixar o projecto incoerente.
 */
trait ValidatesProjectLinks
{
    public const string CLIENT_NEEDS_PRODUCT = 'Escolha primeiro o software do projecto.';

    public const string CLIENT_WITHOUT_SOFTWARE = 'Este cliente não tem este software instalado.';

    public const string MODULES_NEED_PRODUCT = 'Escolha primeiro o software do projecto.';

    public const string MODULE_OF_OTHER_PRODUCT = 'O módulo não pertence a este software.';

    public const string MODULE_NOT_ACTIVE_FOR_CLIENT = 'O módulo não está activo para este cliente.';

    /**
     * @return array<string, mixed>
     */
    protected function projectLinkRules(): array
    {
        return [
            'software_product_id' => ['sometimes', 'nullable', 'integer', 'exists:software_products,id'],
            'client_id' => ['sometimes', 'nullable', 'integer', 'exists:clients,id'],
            'module_ids' => ['sometimes', 'nullable', 'array'],
            'module_ids.*' => ['integer', 'distinct'],
        ];
    }

    protected function validateProjectLinks(Validator $validator, ?Project $project): void
    {
        $errors = $validator->errors();
        if ($errors->has('software_product_id') || $errors->has('client_id') || $errors->has('module_ids') || $errors->has('module_ids.*')) {
            return;
        }

        [$productId, $clientId, $moduleIds] = $this->effectiveProjectLinks($project);

        if ($clientId !== null) {
            if ($productId === null) {
                $errors->add('client_id', self::CLIENT_NEEDS_PRODUCT);

                return;
            }

            $installation = app(ProjectLinkService::class)->installation($clientId, $productId);
            if ($installation === null) {
                $errors->add('client_id', self::CLIENT_WITHOUT_SOFTWARE);

                return;
            }
        }

        if ($moduleIds === []) {
            return;
        }

        if ($productId === null) {
            $errors->add('module_ids', self::MODULES_NEED_PRODUCT);

            return;
        }

        $productModuleIds = SoftwareModule::query()
            ->where('software_product_id', $productId)
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();
        $allowed = isset($installation) ? $installation['module_ids'] : $productModuleIds;

        foreach ($moduleIds as $index => $moduleId) {
            if (! in_array($moduleId, $productModuleIds, true)) {
                $errors->add("module_ids.{$index}", self::MODULE_OF_OTHER_PRODUCT);
            } elseif (! in_array($moduleId, $allowed, true)) {
                $errors->add("module_ids.{$index}", self::MODULE_NOT_ACTIVE_FOR_CLIENT);
            }
        }
    }

    /**
     * Valores efectivos após o pedido: [produto, cliente, módulos].
     * Mudar/limpar o produto sem enviar cliente/módulos limpa-os (ver ProjectService).
     *
     * @return array{0: int|null, 1: int|null, 2: array<int, int>}
     */
    protected function effectiveProjectLinks(?Project $project): array
    {
        $productSent = $this->exists('software_product_id');
        $productId = $productSent
            ? $this->nullableInt($this->input('software_product_id'))
            : $this->nullableInt($project?->software_product_id);
        $productChanged = $project !== null && $productSent && $productId !== $this->nullableInt($project->software_product_id);

        if ($this->exists('client_id')) {
            $clientId = $this->nullableInt($this->input('client_id'));
        } else {
            $clientId = $productChanged || $productId === null ? null : $this->nullableInt($project?->client_id);
        }

        if ($this->exists('module_ids')) {
            $moduleIds = array_map('intval', (array) ($this->input('module_ids') ?? []));
        } else {
            $moduleIds = $productChanged || $project === null
                ? []
                : $project->modules()->pluck('software_modules.id')->map(fn ($id): int => (int) $id)->all();
        }

        return [$productId, $clientId, $moduleIds];
    }

    private function nullableInt(mixed $value): ?int
    {
        return $value === null || $value === '' ? null : (int) $value;
    }
}
