<?php

declare(strict_types=1);

namespace Tests\Feature\Infra\Concerns;

use App\Models\User;
use Spatie\Permission\Models\Role;

/**
 * Cria papéis spatie/laravel-permission sob demanda (a tabela `roles` está
 * vazia numa base de dados de teste `RefreshDatabase`) e atribui-os a um
 * utilizador de teste.
 */
trait CreatesInfraRoles
{
    protected function userWithRole(string $role): User
    {
        Role::findOrCreate($role, 'web');

        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }
}
