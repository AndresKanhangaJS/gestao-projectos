<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Papéis globais do sistema (ver specs/PRD.md §3).
     *
     * @var list<string>
     */
    private const ROLES = ['admin', 'project_manager', 'infra', 'member', 'client_viewer'];

    public function run(): void
    {
        foreach (self::ROLES as $role) {
            Role::findOrCreate($role, 'web');
        }

        // Permissoes finas ficam para Fase 2 (specs/ROADMAP.md); nesta fase a
        // autorizacao assenta sobretudo em papeis globais + Policies por modelo.
        foreach (['credentials.reveal'] as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        // Necessário para que as permissões recém-criadas fiquem visíveis a
        // givePermissionTo() dentro do mesmo processo (cache do Spatie).
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        /** @var Role $admin */
        $admin = Role::findByName('admin', 'web');
        /** @var Role $infra */
        $infra = Role::findByName('infra', 'web');
        $admin->givePermissionTo('credentials.reveal');
        $infra->givePermissionTo('credentials.reveal');
    }
}
