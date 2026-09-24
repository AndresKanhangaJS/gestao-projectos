<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Infra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Infra\StoreMachineRequest;
use App\Http\Requests\Infra\UpdateMachineRequest;
use App\Http\Resources\Infra\DeploymentResource;
use App\Http\Resources\Infra\MachineResource;
use App\Models\Infra\Machine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class MachineController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Machine::class);

        return MachineResource::collection(Machine::query()->orderBy('name')->paginate())->response();
    }

    public function store(StoreMachineRequest $request): JsonResponse
    {
        $machine = Machine::create($request->validated());

        return (new MachineResource($machine))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Machine $machine): JsonResponse
    {
        $this->authorize('view', $machine);

        return (new MachineResource($machine))->response();
    }

    public function update(UpdateMachineRequest $request, Machine $machine): JsonResponse
    {
        $machine->update($request->validated());

        return (new MachineResource($machine))->response();
    }

    public function destroy(Machine $machine): Response
    {
        $this->authorize('delete', $machine);

        $machine->delete();

        return response()->noContent();
    }

    /** Vista cruzada: máquina + todos os deployments hospedados nela. */
    public function overview(Machine $machine): JsonResponse
    {
        $this->authorize('view', $machine);

        $machine->load([
            'deployments.clientSoftware.client',
            'deployments.clientSoftware.softwareProduct',
            'deployments.softwareModule',
        ]);

        return response()->json([
            'machine' => new MachineResource($machine),
            'deployments' => DeploymentResource::collection($machine->deployments),
        ]);
    }
}
