<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Http\Requests\RegisterRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RegistrationToggleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withHeader('Referer', 'http://localhost');
        config(['sanctum.middleware.validate_csrf_token' => null]);
        Role::findOrCreate('member', 'web');
    }

    /**
     * @return array<string, string>
     */
    private function payload(string $email = 'nova@level-soft.local'): array
    {
        return [
            'name' => 'Nova Utilizadora',
            'email' => $email,
            'password' => 'palavra-passe-segura',
            'password_confirmation' => 'palavra-passe-segura',
        ];
    }

    public function test_register_returns_403_when_disabled_and_creates_no_user(): void
    {
        config(['auth.registration_enabled' => false]);

        $this->postJson('/api/register', $this->payload())
            ->assertForbidden()
            ->assertJsonPath('message', RegisterRequest::REGISTRATION_DISABLED_MESSAGE);

        $this->assertDatabaseMissing('users', ['email' => 'nova@level-soft.local']);
        $this->assertGuest();
    }

    public function test_register_returns_403_before_validation_when_disabled(): void
    {
        config(['auth.registration_enabled' => false]);
        $existing = User::factory()->create();

        // Nem dados inválidos nem um email existente mudam a resposta: não revela contas.
        $this->postJson('/api/register', [])->assertForbidden();
        $this->postJson('/api/register', $this->payload($existing->email))->assertForbidden();
    }

    public function test_register_works_when_enabled(): void
    {
        config(['auth.registration_enabled' => true]);

        $this->postJson('/api/register', $this->payload())
            ->assertCreated()
            ->assertJsonPath('email', 'nova@level-soft.local');

        $this->assertTrue(User::where('email', 'nova@level-soft.local')->firstOrFail()->hasRole('member'));
    }

    public function test_options_are_public_and_reflect_the_flag(): void
    {
        config(['auth.registration_enabled' => false]);
        $this->getJson('/api/auth/options')
            ->assertOk()
            ->assertExactJson(['registration_enabled' => false]);

        config(['auth.registration_enabled' => true]);
        $this->getJson('/api/auth/options')
            ->assertOk()
            ->assertExactJson(['registration_enabled' => true]);
    }

    public function test_options_are_throttled(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/auth/options')->assertOk();
        }

        $this->getJson('/api/auth/options')->assertTooManyRequests();
    }
}
