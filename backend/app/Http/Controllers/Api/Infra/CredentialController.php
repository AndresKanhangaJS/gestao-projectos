<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Infra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Infra\IndexCredentialRequest;
use App\Http\Requests\Infra\StoreCredentialRequest;
use App\Http\Requests\Infra\UpdateCredentialRequest;
use App\Http\Resources\Infra\CredentialAccessLogResource;
use App\Http\Resources\Infra\CredentialResource;
use App\Models\Infra\Credential;
use App\Models\Infra\CredentialAccessLog;
use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class CredentialController extends Controller
{
    public function index(IndexCredentialRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Credential::class);

        $type = $request->credentialableType();
        $machineId = $request->validated('machine_id');

        $credentials = Credential::query()
            ->when($type !== null, fn (Builder $q) => $q
                ->where('credentialable_type', $type?->modelClass())
                ->where('credentialable_id', (int) $request->validated('credentialable_id')))
            ->when($machineId !== null, fn (Builder $q) => $q->where(fn (Builder $w) => $w
                ->where(fn (Builder $m) => $m
                    ->where('credentialable_type', Machine::class)
                    ->where('credentialable_id', (int) $machineId))
                ->orWhere(fn (Builder $d) => $d
                    ->where('credentialable_type', Deployment::class)
                    ->whereIn('credentialable_id', Deployment::query()->select('id')->where('machine_id', (int) $machineId)))))
            ->orderBy('id')
            ->paginate();

        return CredentialResource::collection($credentials)->response();
    }

    public function store(StoreCredentialRequest $request): JsonResponse
    {
        $credentialableClass = $request->credentialableClass();
        $credentialable = $credentialableClass::find($request->validated('credentialable_id'));

        if (! $credentialable) {
            throw ValidationException::withMessages([
                'credentialable_id' => __('O recurso associado (:type) não existe.', [
                    'type' => $credentialableClass === Deployment::class ? 'deployment' : 'machine',
                ]),
            ]);
        }

        $credential = $credentialable->credentials()->create([
            ...$request->safe()->except(['credentialable_type', 'credentialable_id']),
        ]);

        return (new CredentialResource($credential))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateCredentialRequest $request, Credential $credential): JsonResponse
    {
        $credential->update($request->validated());

        return (new CredentialResource($credential))->response();
    }

    public function destroy(Credential $credential): Response
    {
        $this->authorize('delete', $credential);

        // Soft delete + segredo destruído (null); os access logs ficam como auditoria.
        $credential->revokeAndDelete();

        return response()->noContent();
    }

    /**
     * Descriptografa e devolve o segredo em texto simples, uma única vez.
     * Restrito a admin/infra e grava sempre um CredentialAccessLog antes de responder.
     */
    public function reveal(Request $request, Credential $credential): JsonResponse
    {
        $this->authorize('reveal', $credential);

        // Nunca devolver `secret: null` (credencial sem segredo guardado).
        abort_if($credential->secret === null, Response::HTTP_NOT_FOUND, 'Esta credencial não tem segredo guardado.');

        CredentialAccessLog::create([
            'credential_id' => $credential->id,
            'user_id' => $request->user()->id,
            'accessed_at' => now(),
            'ip_address' => $request->ip(),
        ]);

        // O segredo nunca deve ficar em cache (browser, proxies intermédios).
        return response()
            ->json(['secret' => $credential->secret])
            ->header('Cache-Control', 'no-store, private')
            ->header('Pragma', 'no-cache');
    }

    /** Registo de acessos (reveals) de uma credencial, mais recentes primeiro. Só admin. */
    public function accessLogs(Credential $credential): JsonResponse
    {
        $this->authorize('viewAccessLogs', $credential);

        $logs = $credential->accessLogs()
            ->with('user')
            ->orderByDesc('accessed_at')
            ->orderByDesc('id')
            ->paginate(20);

        return CredentialAccessLogResource::collection($logs)->response();
    }
}
