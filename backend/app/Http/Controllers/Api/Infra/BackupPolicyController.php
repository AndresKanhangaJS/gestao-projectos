<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Infra;

use App\Http\Controllers\Controller;
use App\Http\Requests\Infra\IndexBackupPolicyRequest;
use App\Http\Requests\Infra\StoreBackupPolicyRequest;
use App\Http\Requests\Infra\UpdateBackupPolicyRequest;
use App\Http\Resources\Infra\BackupPolicyResource;
use App\Models\Infra\BackupPolicy;
use App\Models\Infra\Deployment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Validation\ValidationException;

class BackupPolicyController extends Controller
{
    public function index(IndexBackupPolicyRequest $request): JsonResponse
    {
        $this->authorize('viewAny', BackupPolicy::class);

        $type = $request->backupableType();

        $policies = BackupPolicy::query()
            ->when($type !== null, fn (Builder $q) => $q
                ->where('backupable_type', $type?->modelClass())
                ->where('backupable_id', (int) $request->validated('backupable_id')))
            ->orderBy('id')
            ->paginate();

        return BackupPolicyResource::collection($policies)->response();
    }

    public function store(StoreBackupPolicyRequest $request): JsonResponse
    {
        $backupableClass = $request->backupableClass();
        $backupable = $backupableClass::find($request->validated('backupable_id'));

        if (! $backupable) {
            throw ValidationException::withMessages([
                'backupable_id' => __('O recurso associado (:type) não existe.', [
                    'type' => $backupableClass === Deployment::class ? 'deployment' : 'machine',
                ]),
            ]);
        }

        $policy = $backupable->backupPolicies()->create([
            ...$request->safe()->except(['backupable_type', 'backupable_id']),
        ]);

        return (new BackupPolicyResource($policy))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(BackupPolicy $backupPolicy): JsonResponse
    {
        $this->authorize('view', $backupPolicy);

        return (new BackupPolicyResource($backupPolicy))->response();
    }

    public function update(UpdateBackupPolicyRequest $request, BackupPolicy $backupPolicy): JsonResponse
    {
        $backupPolicy->update($request->validated());

        return (new BackupPolicyResource($backupPolicy))->response();
    }

    public function destroy(BackupPolicy $backupPolicy): Response
    {
        $this->authorize('delete', $backupPolicy);

        $backupPolicy->delete();

        return response()->noContent();
    }
}
