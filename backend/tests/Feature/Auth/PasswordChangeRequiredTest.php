<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

/** Mudança obrigatória de palavra-passe (conta criada/password reposta pelo admin) e `PUT /me/password`. */
class PasswordChangeRequiredTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    private const array BLOCKED = [
        'code' => 'password_change_required',
        'message' => 'Tem de alterar a sua palavra-passe antes de continuar.',
    ];

    private function userMustChange(string $role = 'admin'): User
    {
        $user = $this->userWithRole($role);
        $user->forceFill(['password' => Hash::make('password-antiga'), 'must_change_password' => true])->save();

        return $user->fresh() ?? $user;
    }

    public function test_admin_create_and_reset_turn_the_flag_on(): void
    {
        Sanctum::actingAs($this->userWithRole('admin'));

        $id = $this->postJson('/api/admin/users', [
            'name' => 'Nova',
            'email' => 'nova@example.test',
            'password' => 'segredo123',
            'password_confirmation' => 'segredo123',
            'roles' => ['member'],
        ])->assertCreated()
            ->assertJsonPath('data.must_change_password', true)
            ->json('data.id');

        $other = $this->userWithRole('member');
        $this->assertFalse((bool) $other->fresh()?->must_change_password);

        $this->postJson("/api/admin/users/{$other->id}/password", [
            'password' => 'reposta123',
            'password_confirmation' => 'reposta123',
        ])->assertNoContent();

        $this->assertTrue((bool) $other->fresh()?->must_change_password);
        $this->assertTrue((bool) User::findOrFail($id)->must_change_password);
    }

    public function test_public_registration_does_not_require_a_change(): void
    {
        $this->withHeader('Referer', 'http://localhost');
        config(['sanctum.middleware.validate_csrf_token' => null]);
        $this->userWithRole('member');

        $this->postJson('/api/register', [
            'name' => 'Própria',
            'email' => 'propria@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()->assertJsonPath('must_change_password', false);
    }

    public function test_flagged_user_is_blocked_everywhere_except_me_change_and_logout(): void
    {
        $user = $this->userMustChange('admin');
        Sanctum::actingAs($user);

        foreach ([
            ['GET', '/api/projects/workspaces'],
            ['GET', '/api/projects/dashboard'],
            ['GET', '/api/infra/clients'],
            ['GET', '/api/admin/users'],
            ['GET', '/api/notifications'],
        ] as [$method, $uri]) {
            $this->json($method, $uri)->assertForbidden()->assertExactJson(self::BLOCKED);
        }

        $this->getJson('/api/me')->assertOk()->assertJsonPath('must_change_password', true);
        $this->postJson('/api/logout')->assertOk();
    }

    public function test_change_validation(): void
    {
        $user = $this->userMustChange();
        Sanctum::actingAs($user);

        $this->putJson('/api/me/password', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password', 'password']);

        $this->putJson('/api/me/password', [
            'current_password' => 'errada',
            'password' => 'nova-password',
            'password_confirmation' => 'nova-password',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['current_password' => 'A palavra-passe actual está incorrecta.']);

        $this->putJson('/api/me/password', [
            'current_password' => 'password-antiga',
            'password' => 'password-antiga',
            'password_confirmation' => 'password-antiga',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['password' => 'A nova palavra-passe tem de ser diferente da actual.']);

        $this->putJson('/api/me/password', [
            'current_password' => 'password-antiga',
            'password' => 'curta',
            'password_confirmation' => 'outra',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->assertTrue((bool) $user->fresh()?->must_change_password);
    }

    public function test_change_clears_flag_restores_access_and_revokes_other_access(): void
    {
        $user = $this->userMustChange('admin');
        $current = $user->createToken('actual');
        $user->createToken('outro-dispositivo');
        DB::table('sessions')->insert([
            'id' => 'sessao-antiga', 'user_id' => $user->id, 'payload' => 'x', 'last_activity' => time(),
        ]);
        $rememberBefore = $user->remember_token;

        // Autenticado pelo token "actual" (Bearer): esse token tem de sobreviver.
        $this->withToken($current->plainTextToken)
            ->putJson('/api/me/password', [
                'current_password' => 'password-antiga',
                'password' => 'password-nova-1',
                'password_confirmation' => 'password-nova-1',
            ])->assertOk()
            ->assertJsonPath('id', $user->id)
            ->assertJsonPath('must_change_password', false);

        $fresh = $user->fresh();
        $this->assertNotNull($fresh);
        $this->assertTrue(Hash::check('password-nova-1', $fresh->password));
        $this->assertFalse($fresh->must_change_password);
        $this->assertNotSame($rememberBefore, $fresh->remember_token);
        $this->assertSame([$current->accessToken->id], $fresh->tokens()->pluck('id')->all());
        $this->assertDatabaseMissing('sessions', ['id' => 'sessao-antiga']);

        // Acesso restaurado com o mesmo token.
        $this->app['auth']->forgetGuards();
        $this->withToken($current->plainTextToken)->getJson('/api/admin/users')->assertOk();
    }

    public function test_session_user_keeps_current_session_after_change(): void
    {
        $this->withHeader('Referer', 'http://localhost');
        config(['sanctum.middleware.validate_csrf_token' => null]);
        $user = User::factory()->create(['email' => 'ana@example.test', 'password' => 'password-antiga']);

        $this->postJson('/api/login', ['email' => 'ana@example.test', 'password' => 'password-antiga'])->assertOk();

        $this->putJson('/api/me/password', [
            'current_password' => 'password-antiga',
            'password' => 'password-nova-1',
            'password_confirmation' => 'password-nova-1',
        ])->assertOk()->assertJsonPath('must_change_password', false);

        // A mesma sessão continua autenticada.
        $this->getJson('/api/me')->assertOk()->assertJsonPath('id', $user->id);
        $this->assertAuthenticatedAs($user->fresh() ?? $user, 'web');
    }

    public function test_regular_user_can_change_own_password(): void
    {
        $user = $this->userWithRole('member');
        $user->forceFill(['password' => Hash::make('password-antiga')])->save();
        Sanctum::actingAs($user->fresh() ?? $user);

        $this->putJson('/api/me/password', [
            'current_password' => 'password-antiga',
            'password' => 'password-nova-1',
            'password_confirmation' => 'password-nova-1',
        ])->assertOk()->assertJsonPath('must_change_password', false);

        $this->assertTrue(Hash::check('password-nova-1', (string) $user->fresh()?->password));
    }

    public function test_change_password_is_throttled(): void
    {
        $user = $this->userMustChange();
        Sanctum::actingAs($user);

        for ($i = 0; $i < 6; $i++) {
            $this->putJson('/api/me/password', ['current_password' => 'errada'])->assertUnprocessable();
        }

        $this->putJson('/api/me/password', ['current_password' => 'errada'])->assertStatus(429);
    }
}
