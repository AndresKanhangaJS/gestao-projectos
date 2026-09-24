<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Infra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Infra\StoreClientSoftwareRequest;
use App\Http\Requests\Infra\SyncClientSoftwareModulesRequest;
use App\Http\Requests\Infra\UpdateClientSoftwareRequest;
use App\Http\Resources\Infra\ClientSoftwareResource;
use App\Models\Infra\ClientSoftware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ClientSoftwareController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', ClientSoftware::class);

        return ClientSoftwareResource::collection(
            ClientSoftware::query()->with(['client', 'softwareProduct'])->paginate()
        )->response();
    }

    public function store(StoreClientSoftwareRequest $request): JsonResponse
    {
        $clientSoftware = ClientSoftware::create($request->validated());

        return (new ClientSoftwareResource($clientSoftware))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(ClientSoftware $clientSoftware): JsonResponse
    {
        $this->authorize('view', $clientSoftware);

        $clientSoftware->load(['client', 'softwareProduct', 'modules', 'deployments.machine']);

        return (new ClientSoftwareResource($clientSoftware))->response();
    }

    public function update(UpdateClientSoftwareRequest $request, ClientSoftware $clientSoftware): JsonResponse
    {
        $clientSoftware->update($request->validated());

        return (new ClientSoftwareResource($clientSoftware))->response();
    }

    public function destroy(ClientSoftware $clientSoftware): Response
    {
        $this->authorize('delete', $clientSoftware);

        $clientSoftware->delete();

        return response()->noContent();
    }

    /** Sincroniza os módulos activos/inactivos desta instância cliente↔software. */
    public function syncModules(SyncClientSoftwareModulesRequest $request, ClientSoftware $clientSoftware): JsonResponse
    {
        $syncData = collect($request->validated('modules'))
            ->mapWithKeys(fn (array $module) => [
                $module['software_module_id'] => ['active' => $module['active']],
            ])
            ->all();

        $clientSoftware->modules()->sync($syncData);

        $clientSoftware->load('modules');

        return (new ClientSoftwareResource($clientSoftware))->response();
    }
}
