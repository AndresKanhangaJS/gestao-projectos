<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Infra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Infra\StoreClientRequest;
use App\Http\Requests\Infra\UpdateClientRequest;
use App\Http\Resources\Infra\ClientResource;
use App\Http\Resources\Infra\ClientSoftwareResource;
use App\Models\Infra\Client;
use Illuminate\Http\JsonResponse;
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
    public function overview(Client $client): JsonResponse
    {
        $this->authorize('view', $client);

        $client->load([
            'clientSoftware.softwareProduct',
            'clientSoftware.modules',
            'clientSoftware.deployments.machine',
        ]);

        return response()->json([
            'client' => new ClientResource($client),
            'software' => ClientSoftwareResource::collection($client->clientSoftware),
        ]);
    }
}
