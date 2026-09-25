<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Infra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Infra\StoreClientRequest;
use App\Http\Requests\Infra\UpdateClientRequest;
use App\Http\Resources\Infra\ClientResource;
use App\Http\Resources\Infra\ClientSoftwareResource;
use App\Http\Resources\Projects\ProjectSummaryResource;
use App\Models\Infra\Client;
use App\Models\Projects\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ClientController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Client::class);

        return ClientResource::collection(Client::query()->orderBy('name')->paginate())->response();
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        $client = Client::create($request->validated());

        return (new ClientResource($client))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Client $client): JsonResponse
    {
        $this->authorize('view', $client);

        return (new ClientResource($client))->response();
    }

    public function update(UpdateClientRequest $request, Client $client): JsonResponse
    {
        $client->update($request->validated());

        return (new ClientResource($client))->response();
    }

    public function destroy(Client $client): Response
    {
        $this->authorize('delete', $client);

        $client->delete();

        return response()->noContent();
    }

    /** Vista cruzada: cliente + todas as suas instâncias de software com módulos activos e estado. */
    public function overview(Request $request, Client $client): JsonResponse
    {
        $this->authorize('view', $client);

        $client->load([
            'clientSoftware.softwareProduct',
            'clientSoftware.modules',
            'clientSoftware.deployments.machine',
        ]);

        // Vista cruzada: projectos ligados a este cliente, visíveis ao utilizador.
        $projects = Project::query()
            ->visibleTo($request->user())
            ->where('client_id', $client->id)
            ->orderBy('name')
            ->get();

        return response()->json([
            'client' => new ClientResource($client),
            'software' => ClientSoftwareResource::collection($client->clientSoftware),
            'projects' => ProjectSummaryResource::collection($projects),
        ]);
    }
}
