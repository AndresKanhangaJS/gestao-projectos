<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Infra\Client;
use App\Models\Projects\Project;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeder_runs_on_sqlite_in_testing_with_demo_data_and_is_idempotent(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        foreach (['admin', 'project_manager', 'infra', 'member', 'client_viewer'] as $role) {
            $this->assertTrue(Role::where('name', $role)->exists(), "Papel {$role} em falta");
        }

        $admin = User::where('email', 'admin@level-soft.local')->firstOrFail();
        $this->assertTrue($admin->hasRole('admin'));
        $this->assertTrue(User::where('email', 'gestor@level-soft.local')->firstOrFail()->hasRole('project_manager'));
        $this->assertSame(4, User::count());
        $this->assertGreaterThan(0, Client::count());
        $this->assertSame(1, Project::count());
    }

    public function test_demo_users_and_data_are_skipped_in_production_without_flag(): void
    {
        $this->app['env'] = 'production';
        config(['app.seed_demo_data' => false]);

        // Invocado directamente: `db:seed` pediria confirmação interactiva fora de local.
        $this->runSeederDirectly();

        $this->assertTrue(Role::where('name', 'admin')->exists());
        $this->assertSame(0, User::count());
        $this->assertSame(0, Client::count());
        $this->assertSame(0, Project::count());
    }

    public function test_explicit_flag_enables_demo_data_outside_local(): void
    {
        $this->app['env'] = 'staging';
        config(['app.seed_demo_data' => true]);

        // Invocado directamente: `db:seed` pediria confirmação interactiva fora de local.
        $this->runSeederDirectly();

        $this->assertTrue(User::where('email', 'admin@level-soft.local')->exists());
    }

    private function runSeederDirectly(): void
    {
        $this->app->make(DatabaseSeeder::class)->setContainer($this->app)->__invoke();
    }
}
