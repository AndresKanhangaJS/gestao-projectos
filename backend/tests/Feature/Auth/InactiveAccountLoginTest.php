<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InactiveAccountLoginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Pedido "stateful" do SPA (ver AuthenticationTest).
        $this->withHeader('Referer', 'http://localhost');
        config(['sanctum.middleware.validate_csrf_token' => null]);
    }

    public function test_login_sets_last_login_at_and_me_reports_active(): void
    {
        $user = User::factory()->create(['email' => 'ana@example.test', 'password' => 'password']);
        $this->assertNull($user->fresh()?->last_login_at);

        $this->postJson('/api/login', ['email' => 'ana@example.test', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('is_active', true);

        $this->assertNotNull($user->fresh()?->last_login_at);
    }

    public function test_inactive_account_cannot_log_in(): void
    {
        $user = User::factory()->create(['email' => 'ana@example.test', 'password' => 'password']);
        $user->forceFill(['is_active' => false])->save();

        $this->postJson('/api/login', ['email' => 'ana@example.test', 'password' => 'password'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'A sua conta está desactivada. Contacte um administrador.']);

        $this->assertGuest('web');
        $this->assertNull($user->fresh()?->last_login_at);
    }

    public function test_wrong_password_on_inactive_account_does_not_reveal_its_state(): void
    {
        $user = User::factory()->create(['email' => 'ana@example.test', 'password' => 'password']);
        $user->forceFill(['is_active' => false])->save();

        $this->postJson('/api/login', ['email' => 'ana@example.test', 'password' => 'errada'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'As credenciais fornecidas não correspondem aos nossos registos.']);
    }
}
