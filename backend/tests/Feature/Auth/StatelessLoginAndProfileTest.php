<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StatelessLoginAndProfileTest extends TestCase
{
    use RefreshDatabase;

    /** Sem Referer/Origin de um domínio stateful não há sessão: 419 controlado, nunca 500. */
    public function test_login_without_session_fails_with_419_and_a_clear_message(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct-password')]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'correct-password',
        ]);

        $response->assertStatus(419);
        $this->assertStringContainsString('Sessão indisponível', (string) $response->json('message'));
        $this->assertGuest();
    }

    public function test_register_without_session_fails_with_419_and_creates_no_user(): void
    {
        Role::findOrCreate('member', 'web');

        $this->postJson('/api/register', [
            'name' => 'X',
            'email' => 'x@level-soft.local',
            'password' => 'palavra-passe-segura',
            'password_confirmation' => 'palavra-passe-segura',
        ])->assertStatus(419);

        $this->assertDatabaseMissing('users', ['email' => 'x@level-soft.local']);
    }

    public function test_logout_with_token_auth_and_no_session_does_not_error(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->postJson('/api/logout')->assertOk();
    }

    public function test_me_exposes_roles_and_permissions_as_string_arrays(): void
    {
        Role::findOrCreate('infra', 'web')->givePermissionTo(Permission::findOrCreate('credentials.reveal', 'web'));
        $user = User::factory()->create();
        $user->assignRole('infra');
        Sanctum::actingAs($user);

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('id', $user->id)
            ->assertJsonPath('roles', ['infra'])
            ->assertJsonPath('permissions', ['credentials.reveal']);
    }
}
