<?php

declare(strict_types=1);

namespace Tests\Feature\Infra;

use App\Models\Infra\Credential;
use App\Models\Infra\Machine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

class CredentialRevealTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    public function test_secret_is_never_present_in_the_default_credential_response(): void
    {
        $machine = Machine::factory()->create();
        $credential = Credential::factory()->create([
            'credentialable_type' => Machine::class,
            'credentialable_id' => $machine->id,
            'secret' => 'super-secret-password',
        ]);

        Sanctum::actingAs($this->userWithRole('infra'));

        $response = $this->getJson('/api/infra/credentials');

        $response->assertOk()
            ->assertJsonMissingPath('data.0.secret');

        $this->assertStringNotContainsString('super-secret-password', $response->getContent());
    }

    public function test_member_role_is_forbidden_from_revealing_a_secret(): void
    {
        $machine = Machine::factory()->create();
        $credential = Credential::factory()->create([
            'credentialable_type' => Machine::class,
            'credentialable_id' => $machine->id,
            'secret' => 'super-secret-password',
        ]);

        Sanctum::actingAs($this->userWithRole('member'));

        $response = $this->postJson("/api/infra/credentials/{$credential->id}/reveal");

        $response->assertForbidden();

        $this->assertDatabaseCount('credential_access_logs', 0);
    }

    public function test_member_role_is_forbidden_from_listing_credentials(): void
    {
        Sanctum::actingAs($this->userWithRole('member'));

        $this->getJson('/api/infra/credentials')->assertForbidden();
    }

    public function test_infra_role_can_reveal_a_secret_and_an_access_log_is_created(): void
    {
        $machine = Machine::factory()->create();
        $credential = Credential::factory()->create([
            'credentialable_type' => Machine::class,
            'credentialable_id' => $machine->id,
            'secret' => 'super-secret-password',
        ]);

        $user = $this->userWithRole('infra');
        Sanctum::actingAs($user);

        $response = $this->postJson("/api/infra/credentials/{$credential->id}/reveal");

        $response->assertOk()
            ->assertExactJson(['secret' => 'super-secret-password']);

        $this->assertDatabaseHas('credential_access_logs', [
            'credential_id' => $credential->id,
            'user_id' => $user->id,
        ]);
    }

    public function test_admin_role_can_create_a_credential_for_a_machine(): void
    {
        $machine = Machine::factory()->create();

        Sanctum::actingAs($this->userWithRole('admin'));

        $response = $this->postJson('/api/infra/credentials', [
            'credentialable_type' => 'machine',
            'credentialable_id' => $machine->id,
            'type' => 'ssh',
            'username' => 'root',
            'secret' => 'my-password',
        ]);

        $response->assertCreated()
            ->assertJsonMissingPath('data.secret');

        $this->assertDatabaseHas('credentials', [
            'credentialable_type' => Machine::class,
            'credentialable_id' => $machine->id,
            'username' => 'root',
        ]);
    }
}
