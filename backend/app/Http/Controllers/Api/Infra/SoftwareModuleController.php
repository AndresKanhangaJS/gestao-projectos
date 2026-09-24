<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Infra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Infra\StoreSoftwareModuleRequest;
use App\Http\Requests\Infra\UpdateSoftwareModuleRequest;
use App\Http\Resources\Infra\SoftwareModuleResource;
use App\Models\Infra\SoftwareModule;
use App\Models\Infra\SoftwareProduct;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class SoftwareModuleController extends Controller
{
    /** Módulos de um produto (rota aninhada). */
    public function index(SoftwareProduct $softwareProduct): JsonResponse
    {
        $this->authorize('viewAny', SoftwareModule::class);

        return SoftwareModuleResource::collection($softwareProduct->modules()->orderBy('name')->get())->response();
    }

    /** Cria um módulo dentro de um produto (rota aninhada). */
    public function store(StoreSoftwareModuleRequest $request, SoftwareProduct $softwareProduct): JsonResponse
    {
        $module = $softwareProduct->modules()->create($request->validated());

        return (new SoftwareModuleResource($module))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(SoftwareModule $softwareModule): JsonResponse
    {
        $this->authorize('view', $softwareModule);

        return (new SoftwareModuleResource($softwareModule))->response();
    }

    public function update(UpdateSoftwareModuleRequest $request, SoftwareModule $softwareModule): JsonResponse
    {
        $softwareModule->update($request->validated());

        return (new SoftwareModuleResource($softwareModule))->response();
    }

    public function destroy(SoftwareModule $softwareModule): Response
    {
        $this->authorize('delete', $softwareModule);

        $softwareModule->delete();

        return response()->noContent();
    }
}
