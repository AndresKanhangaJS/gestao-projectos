<?php

declare(strict_types=1);

namespace Tests\Feature\Console;

use App\Models\Infra\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CreateAdminCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_creates_admin_from_options_without_forcing_password_change(): void
    {
        $this->artisan('app:create-admin', [
            '--name' => 'Operador Infra',
            '--email' => 'operador@level-soft.local',
            '--password' => 'uma-password-forte',
            '--no-interaction' => true,
        ])
            ->expectsOutputToContain('Administrador criado: operador@level-soft.local')
            ->assertSuccessful();

        $user = User::where('email', 'operador@level-soft.local')->firstOrFail();
        $this->assertSame('Operador Infra', $user->name);
        $this->assertTrue($user->hasRole('admin'));
        $this->assertTrue($user->is_active);
        $this->assertFalse($user->must_change_password);
        $this->assertTrue(Hash::check('uma-password-forte', $user->password));
    }

    public function test_force_change_option_requires_password_change_on_first_login(): void
    {
        $this->artisan('app:create-admin', [
            '--name' => 'Novo Admin',
            '--email' => 'novo@level-soft.local',
            '--password' => 'uma-password-forte',
            '--force-change' => true,
            '--no-interaction' => true,
        ])->assertSuccessful();

        $this->assertTrue(User::where('email', 'novo@level-soft.local')->firstOrFail()->must_change_password);
    }

    public function test_interactive_mode_asks_for_data_and_hidden_password_with_confirmation(): void
    {
        $this->artisan('app:create-admin')
            ->expectsQuestion('Nome', 'Admin Interactivo')
            ->expectsQuestion('Email', 'interactivo@level-soft.local')
            ->expectsQuestion('Palavra-passe (mínimo 8 caracteres)', 'segredo-123')
            ->expectsQuestion('Confirmar palavra-passe', 'segredo-123')
            ->assertSuccessful();

        $user = User::where('email', 'interactivo@level-soft.local')->firstOrFail();
        $this->assertTrue($user->hasRole('admin'));
        $this->assertTrue(Hash::check('segredo-123', $user->password));
    }

    public function test_fails_when_confirmation_does_not_match(): void
    {
        $this->artisan('app:create-admin')
            ->expectsQuestion('Nome', 'Admin')
            ->expectsQuestion('Email', 'admin2@level-soft.local')
            ->expectsQuestion('Palavra-passe (mínimo 8 caracteres)', 'segredo-123')
            ->expectsQuestion('Confirmar palavra-passe', 'outra-coisa')
            ->expectsOutputToContain('As palavras-passe não coincidem.')
            ->assertFailed();

        $this->assertSame(0, User::count());
    }

    public function test_fails_when_email_already_exists(): void
    {
        $existing = User::factory()->create(['email' => 'repetido@level-soft.local']);

        $this->artisan('app:create-admin', [
            '--name' => 'Outro',
            '--email' => 'repetido@level-soft.local',
            '--password' => 'uma-password-forte',
            '--no-interaction' => true,
        ])->assertFailed();

        $this->assertSame(1, User::count());
        $this->assertFalse($existing->fresh()?->hasRole('admin'));
    }

    public function test_fails_with_invalid_data_or_missing_options_when_not_interactive(): void
    {
        $this->artisan('app:create-admin', [
            '--name' => 'Admin',
            '--email' => 'nao-e-um-email',
            '--password' => 'curta',
            '--no-interaction' => true,
        ])->assertFailed();

        $this->artisan('app:create-admin', ['--no-interaction' => true])->assertFailed();

        $this->assertSame(0, User::count());
    }

    public function test_production_seed_only_creates_roles_so_first_admin_comes_from_command(): void
    {
        $this->app['env'] = 'production';
        config(['app.seed_demo_data' => false]);

        $this->artisan('db:seed', ['--force' => true])->assertSuccessful();

        $this->assertTrue(Role::where('name', 'admin')->exists());
        $this->assertSame(0, User::count());
        $this->assertSame(0, Client::count());

        $this->artisan('app:create-admin', [
            '--name' => 'Primeiro Admin',
            '--email' => 'primeiro@level-soft.local',
            '--password' => 'uma-password-forte',
            '--no-interaction' => true,
        ])->assertSuccessful();

        $this->assertSame(1, User::count());
        $this->assertTrue(User::firstOrFail()->hasRole('admin'));
    }
}
