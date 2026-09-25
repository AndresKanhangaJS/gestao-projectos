<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Infra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Infra\StoreSoftwareProductRequest;
use App\Http\Requests\Infra\UpdateSoftwareProductRequest;
use App\Http\Resources\Infra\ClientSoftwareResource;
use App\Http\Resources\Infra\SoftwareProductResource;
use App\Http\Resources\Projects\ProjectSummaryResource;
use App\Models\Infra\SoftwareProduct;
use App\Models\Projects\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class SoftwareProductController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', SoftwareProduct::class);

        return SoftwareProductResource::collection(
            SoftwareProduct::query()->with('modules')->orderBy('name')->paginate()
        )->response();
    }

    public function store(StoreSoftwareProductRequest $request): JsonResponse
    {
        $product = SoftwareProduct::create($request->validated());

        return (new SoftwareProductResource($product))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(SoftwareProduct $softwareProduct): JsonResponse
    {
        $this->authorize('view', $softwareProduct);

        $softwareProduct->load('modules');

        return (new SoftwareProductResource($softwareProduct))->response();
    }

    public function update(UpdateSoftwareProductRequest $request, SoftwareProduct $softwareProduct): JsonResponse
    {
        $softwareProduct->update($request->validated());

        return (new SoftwareProductResource($softwareProduct))->response();
    }

    public function destroy(SoftwareProduct $softwareProduct): Response
    {
        $this->authorize('delete', $softwareProduct);

        $softwareProduct->delete();

        return response()->noContent();
    }

    /** Vista cruzada: produto + todas as instâncias de clientes que o usam, com máquina/porta via deployments. */
    public function overview(Request $request, SoftwareProduct $softwareProduct): JsonResponse
    {
        $this->authorize('view', $softwareProduct);

        $softwareProduct->load([
            'clientSoftware.client',
            'clientSoftware.deployments.machine',
        ]);

        // Vista cruzada: projectos sobre este software, visíveis ao utilizador.
        $projects = Project::query()
            ->visibleTo($request->user())
            ->where('software_product_id', $softwareProduct->id)
            ->orderBy('name')
            ->get();

        return response()->json([
            'software_product' => new SoftwareProductResource($softwareProduct),
            'instances' => ClientSoftwareResource::collection($softwareProduct->clientSoftware),
            'projects' => ProjectSummaryResource::collection($projects),
        ]);
    }
}
