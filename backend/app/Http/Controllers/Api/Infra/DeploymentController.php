<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Infra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Infra\IndexDeploymentRequest;
use App\Http\Requests\Infra\StoreDeploymentRequest;
use App\Http\Requests\Infra\UpdateDeploymentRequest;
use App\Http\Resources\Infra\DeploymentResource;
use App\Models\Infra\Deployment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class DeploymentController extends Controller
{
    public function index(IndexDeploymentRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Deployment::class);

        $machineId = $request->validated('machine_id');

        $deployments = Deployment::query()
            ->with(['clientSoftware.client', 'clientSoftware.softwareProduct', 'machine'])
            ->when($machineId !== null, fn (Builder $q) => $q->where('machine_id', (int) $machineId))
            ->orderBy('id')
            ->paginate();

        return DeploymentResource::collection($deployments)->response();
    }

    public function store(StoreDeploymentRequest $request): JsonResponse
    {
        $deployment = Deployment::create($request->validated());

        return (new DeploymentResource($deployment))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Deployment $deployment): JsonResponse
    {
        $this->authorize('view', $deployment);

        $deployment->load(['clientSoftware.client', 'clientSoftware.softwareProduct', 'softwareModule', 'machine']);

        return (new DeploymentResource($deployment))->response();
    }

    public function update(UpdateDeploymentRequest $request, Deployment $deployment): JsonResponse
    {
        $deployment->update($request->validated());

        return (new DeploymentResource($deployment))->response();
    }

    public function destroy(Deployment $deployment): Response
    {
        $this->authorize('delete', $deployment);

        $deployment->delete();

        return response()->noContent();
    }
}
