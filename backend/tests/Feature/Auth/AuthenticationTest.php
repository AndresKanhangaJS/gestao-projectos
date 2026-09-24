<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * O Sanctum só trata o pedido como "stateful" (e arranca a sessão) quando
     * o Referer/Origin corresponde a um domínio em SANCTUM_STATEFUL_DOMAINS —
     * tal como um pedido real do SPA. Sem isto, $request->session() falha.
     *
     * A validação de CSRF faz parte desse mesmo pipeline "stateful" e depende
     * de um cookie XSRF-TOKEN que só um browser real (ou um cliente que passe
     * primeiro por /sanctum/csrf-cookie) teria — desligamo-la aqui tal como a
     * documentação do Sanctum sugere para testes, sem tocar em código/config
     * de produção.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost');
        config(['sanctum.middleware.validate_csrf_token' => null]);
    }

    public function test_a_user_can_register_and_is_assigned_the_member_role(): void
    {
        Role::findOrCreate('member', 'web');

        $response = $this->postJson('/api/register', [
            'name' => 'Nova Utilizadora',
            'email' => 'nova@level-soft.local',
            'password' => 'palavra-passe-segura',
            'password_confirmation' => 'palavra-passe-segura',
        ]);

        $response->assertCreated()->assertJsonPath('email', 'nova@level-soft.local');

        $user = User::where('email', 'nova@level-soft.local')->firstOrFail();
        $this->assertTrue($user->hasRole('member'));
        $this->assertAuthenticatedAs($user);
    }

    public function test_a_user_can_login_with_correct_credentials(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct-password')]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'correct-password',
        ]);

        $response->assertOk()->assertJsonPath('id', $user->id);
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_fails_with_incorrect_password(): void
    {
        $user = User::factory()->create(['password' => bcrypt('correct-password')]);

        $response = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertUnprocessable();
        $this->assertGuest();
    }

    public function test_an_authenticated_user_can_fetch_their_own_profile(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/me');

        $response->assertOk()->assertJsonPath('id', $user->id);
    }

    public function test_an_authenticated_user_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/api/logout');

        $response->assertOk();
    }

    public function test_guests_cannot_access_protected_routes(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
    }
}
