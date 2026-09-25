<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\GlobalRole;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

/**
 * Gestão de contas pelo admin (partilhado pelos dois módulos): criar, editar,
 * atribuir papéis globais, repor password, activar/desactivar.
 * Não há DELETE de utilizadores — desactivar preserva o histórico.
 */
class UserAccountService
{
    /**
     * @param  array{name: string, email: string, password: string, roles: array<int, string>}  $data
     */
    public function create(array $data): User
    {
        return DB::transaction(function () use ($data): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            // Password escolhida pelo admin: o utilizador tem de a mudar no 1.º login.
            $user->forceFill(['must_change_password' => true])->save();
            $this->syncRoles($user, $data['roles']);

            return $user->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data  name?, email?, roles?
     */
    public function update(User $user, array $data): User
    {
        DB::transaction(function () use ($user, $data): void {
            $user->update(array_intersect_key($data, array_flip(['name', 'email'])));

            if (array_key_exists('roles', $data)) {
                $this->syncRoles($user, (array) $data['roles']);
            }
        });

        return $user->refresh();
    }

    /** Reposição de password pelo admin: termina todas as sessões/tokens do utilizador. */
    public function resetPassword(User $user, string $password): void
    {
        DB::transaction(function () use ($user, $password): void {
            $user->forceFill(['password' => Hash::make($password), 'must_change_password' => true])->save();
            $this->revokeAccess($user);
        });
    }

    /**
     * O próprio utilizador muda a sua palavra-passe (`PUT /me/password`):
     * limpa `must_change_password` e revoga os OUTROS acessos (tokens e
     * sessões), mantendo o actual (`$keepSessionId` / `$keepTokenId`).
     */
    public function changeOwnPassword(User $user, string $password, ?string $keepSessionId, ?int $keepTokenId): User
    {
        DB::transaction(function () use ($user, $password, $keepSessionId, $keepTokenId): void {
            $user->forceFill([
                'password' => Hash::make($password),
                'must_change_password' => false,
                'remember_token' => Str::random(60),
            ])->save();

            $user->tokens()
                ->when($keepTokenId !== null, fn ($query) => $query->whereKeyNot($keepTokenId))
                ->delete();

            DB::table((string) config('session.table', 'sessions'))
                ->where('user_id', $user->getKey())
                ->when($keepSessionId !== null, fn ($query) => $query->where('id', '!=', $keepSessionId))
                ->delete();
        });

        return $user->refresh();
    }

    public function deactivate(User $user): User
    {
        DB::transaction(function () use ($user): void {
            $user->forceFill(['is_active' => false])->save();
            $this->revokeAccess($user);
        });

        return $user->refresh();
    }

    public function activate(User $user): User
    {
        $user->forceFill(['is_active' => true])->save();

        return $user->refresh();
    }

    /** Admins activos, excluindo opcionalmente um utilizador (para as salvaguardas). */
    public function activeAdminCount(?User $except = null): int
    {
        return User::query()
            ->role(GlobalRole::Admin->value)
            ->where('is_active', true)
            ->when($except, fn ($query, User $user) => $query->whereKeyNot($user->getKey()))
            ->count();
    }

    /**
     * Revoga todo o acesso existente: tokens Sanctum, sessões guardadas na BD
     * e o "remember me" (novo remember_token invalida o cookie de recordação).
     */
    public function revokeAccess(User $user): void
    {
        $user->tokens()->delete();

        DB::table((string) config('session.table', 'sessions'))
            ->where('user_id', $user->getKey())
            ->delete();

        $user->forceFill(['remember_token' => Str::random(60)])->save();
    }

    /**
     * @param  array<int, string>  $roles  nomes já validados (GlobalRole::assignable)
     */
    private function syncRoles(User $user, array $roles): void
    {
        $user->syncRoles(array_map(
            fn (string $role) => Role::findOrCreate($role, 'web'),
            array_values(array_unique($roles)),
        ));
    }
}
