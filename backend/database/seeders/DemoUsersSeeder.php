<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Utilizadores de DEMONSTRAÇÃO (password "password"), um por papel global.
 * Só corre via DatabaseSeeder em local/testing ou com SEED_DEMO_DATA=true.
 * Requer RolesAndPermissionsSeeder executado antes.
 */
class DemoUsersSeeder extends Seeder
{
    /** @var array<string, array{name: string, role: string}> */
    private const array USERS = [
        'admin@level-soft.local' => ['name' => 'Administrador Level-Soft', 'role' => 'admin'],
        'infra@level-soft.local' => ['name' => 'Equipa de Infraestrutura', 'role' => 'infra'],
        'gestor@level-soft.local' => ['name' => 'Gestor de Projecto', 'role' => 'project_manager'],
        'membro@level-soft.local' => ['name' => 'Membro de Equipa', 'role' => 'member'],
    ];

    public function run(): void
    {
        foreach (self::USERS as $email => $definition) {
            $user = User::firstOrCreate(
                ['email' => $email],
                ['name' => $definition['name'], 'password' => bcrypt('password')],
            );
            $user->syncRoles([$definition['role']]);
        }
    }
}
