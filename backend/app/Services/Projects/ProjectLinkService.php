<?php

declare(strict_types=1);

namespace App\Services\Projects;

use App\Models\Infra\ClientSoftware;
use App\Models\Infra\SoftwareModule;
use App\Models\Infra\SoftwareProduct;
use Illuminate\Support\Collection;

/**
 * Ligação Projecto ↔ Controlo de Software (produto, cliente, módulos).
 *
 * Só lê ids/nomes do módulo Infra — nunca dados sensíveis (máquinas, IPs,
 * credenciais) — para que o módulo de Projectos não dependa das permissões
 * de leitura de Infra.
 */
class ProjectLinkService
{
    /**
     * Módulos activos para o cliente neste produto, ou null se o cliente
     * não tiver nenhuma instalação (client_software) do produto.
     * Se houver mais de uma instalação, os módulos activos são a união.
     *
     * @return array{all_modules: bool, module_ids: list<int>}|null
     */
    public function installation(int $clientId, int $productId): ?array
    {
        $installations = ClientSoftware::query()
            ->where('client_id', $clientId)
            ->where('software_product_id', $productId)
            ->with('modules')
            ->get();

        if ($installations->isEmpty()) {
            return null;
        }

        $productModuleIds = SoftwareModule::query()
            ->where('software_product_id', $productId)
            ->pluck('id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        return $this->summarise($installations, $productModuleIds);
    }

    /**
     * Opções para o formulário de projecto:
     * `[{id, name, modules: [{id, name}], clients: [{id, name, all_modules, module_ids}]}]`.
     *
     * @return list<array<string, mixed>>
     */
    public function linkOptions(): array
    {
        $products = SoftwareProduct::query()
            ->with([
                'modules' => fn ($query) => $query->orderBy('name')->orderBy('id'),
                'clientSoftware.client',
                'clientSoftware.modules',
            ])
            ->orderBy('name')
            ->orderBy('id')
            ->get();

        return $products->map(fn (SoftwareProduct $product): array => $this->productOption($product))->values()->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function productOption(SoftwareProduct $product): array
    {
        $productModuleIds = $product->modules->map(fn (SoftwareModule $module): int => (int) $module->id)->all();

        return [
            'id' => $product->id,
            'name' => $product->name,
            'modules' => $product->modules
                ->map(fn (SoftwareModule $module): array => ['id' => $module->id, 'name' => $module->name])
                ->values()
                ->all(),
            'clients' => $product->clientSoftware
                ->filter(fn (ClientSoftware $installation): bool => $installation->client !== null)
                ->groupBy('client_id')
                ->map(function (Collection $installations) use ($productModuleIds): array {
                    /** @var ClientSoftware $first */
                    $first = $installations->first();

                    return [
                        'id' => $first->client->id,
                        'name' => $first->client->name,
                        ...$this->summarise($installations, $productModuleIds),
                    ];
                })
                ->sortBy(fn (array $client): string => mb_strtolower((string) $client['name']))
                ->values()
                ->all(),
        ];
    }

    /**
     * `all_modules = true` ⇒ `module_ids` traz TODOS os módulos do produto
     * (o frontend pode usar sempre `module_ids` como lista de módulos permitidos).
     *
     * @param  Collection<int, ClientSoftware>  $installations
     * @param  list<int>  $productModuleIds
     * @return array{all_modules: bool, module_ids: list<int>}
     */
    private function summarise(Collection $installations, array $productModuleIds): array
    {
        $ids = [];

        foreach ($installations as $installation) {
            $active = $installation->activeModuleIds();

            if ($active === null) {
                $all = $productModuleIds;
                sort($all);

                return ['all_modules' => true, 'module_ids' => $all];
            }

            $ids = [...$ids, ...$active];
        }

        $ids = array_values(array_unique($ids));
        sort($ids);

        return ['all_modules' => false, 'module_ids' => $ids];
    }
}
