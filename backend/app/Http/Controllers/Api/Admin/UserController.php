<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\Admin;

use App\Enums\GlobalRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\DeactivateUserRequest;
use App\Http\Requests\Admin\IndexUsersRequest;
use App\Http\Requests\Admin\ResetUserPasswordRequest;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\UserAccountService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Gestão de utilizadores e papéis globais (partilhada pelos dois módulos).
 * Exclusiva do papel `admin` (UserPolicy) — 403 antes de qualquer validação.
 * Sem DELETE: desactivar é o mecanismo (preserva histórico de tarefas/actividade).
 */
class UserController extends Controller
{
    private const int PER_PAGE = 20;

    public function index(IndexUsersRequest $request): JsonResponse
    {
        $filters = $request->validated();
        $search = trim((string) ($filters['search'] ?? ''));

        $users = User::query()
            ->with('roles')
            ->withCount('workspaces')
            ->when($search !== '', fn (Builder $query) => $query->where(
                fn (Builder $q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%")
            ))
            ->when($filters['role'] ?? null, fn (Builder $query, string $role) => $query->whereHas(
                'roles',
                fn (Builder $q) => $q->where('name', $role),
            ))
            ->when($filters['status'] ?? null, fn (Builder $query, string $status) => $query->where('is_active', $status === 'active'))
            ->orderBy('name')
            ->orderBy('id')
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return AdminUserResource::collection($users)->response();
    }

    /** Papéis globais atribuíveis (client_viewer excluído — Fase 2). */
    public function roles(): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        return response()->json(array_map(fn (GlobalRole $role): array => [
            'name' => $role->value,
            'label_pt' => $role->labelPt(),
            'description_pt' => $role->descriptionPt(),
        ], GlobalRole::assignable()));
    }

    public function store(StoreUserRequest $request, UserAccountService $accounts): JsonResponse
    {
        /** @var array{name: string, email: string, password: string, roles: array<int, string>} $data */
        $data = $request->validated();
        $user = $accounts->create($data);

        return AdminUserResource::make($user->loadCount('workspaces'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateUserRequest $request, User $user, UserAccountService $accounts): JsonResponse
    {
        $accounts->update($user, $request->validated());

        return AdminUserResource::make($user->loadCount('workspaces'))->response();
    }

    /** Reposição de password pelo admin; termina sessões/tokens do utilizador. */
    public function resetPassword(ResetUserPasswordRequest $request, User $user, UserAccountService $accounts): Response
    {
        $accounts->resetPassword($user, (string) $request->validated('password'));

        return response()->noContent();
    }

    /** Desactiva a conta e revoga sessões/tokens existentes. */
    public function deactivate(DeactivateUserRequest $request, User $user, UserAccountService $accounts): JsonResponse
    {
        return AdminUserResource::make($accounts->deactivate($user)->loadCount('workspaces'))->response();
    }

    public function activate(User $user, UserAccountService $accounts): JsonResponse
    {
        $this->authorize('activate', $user);

        return AdminUserResource::make($accounts->activate($user)->loadCount('workspaces'))->response();
    }
}
