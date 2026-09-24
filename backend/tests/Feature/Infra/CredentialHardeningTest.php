<?php

declare(strict_types=1);

namespace Tests\Feature\Infra;

use App\Models\Infra\Credential;
use App\Models\Infra\CredentialAccessLog;
use App\Models\Infra\Machine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

class CredentialHardeningTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    private Credential $credential;

    protected function setUp(): void
    {
        parent::setUp();

        $machine = Machine::factory()->create();
        $this->credential = Credential::factory()->create([
            'credentialable_type' => Machine::class,
            'credentialable_id' => $machine->id,
            'secret' => 'segredo-original',
        ]);
    }

    public function test_reveal_response_is_never_cacheable(): void
    {
        Sanctum::actingAs($this->userWithRole('infra'));

        $response = $this->postJson("/api/infra/credentials/{$this->credential->id}/reveal")->assertOk();

        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
        $this->assertSame('no-cache', $response->headers->get('Pragma'));
    }

    public function test_reveal_is_throttled_to_10_per_minute(): void
    {
        Sanctum::actingAs($this->userWithRole('infra'));

        for ($i = 0; $i < 10; $i++) {
            $this->postJson("/api/infra/credentials/{$this->credential->id}/reveal")->assertOk();
        }

        $this->postJson("/api/infra/credentials/{$this->credential->id}/reveal")->assertTooManyRequests();
        $this->assertDatabaseCount('credential_access_logs', 10);
    }

    public function test_update_cannot_clear_the_secret(): void
    {
        Sanctum::actingAs($this->userWithRole('infra'));

        $this->putJson("/api/infra/credentials/{$this->credential->id}", ['secret' => null])
            ->assertUnprocessable()->assertJsonValidationErrors('secret');
        $this->putJson("/api/infra/credentials/{$this->credential->id}", ['secret' => ''])
            ->assertUnprocessable()->assertJsonValidationErrors('secret');

        // Omitir o campo mantém o segredo actual.
        $this->putJson("/api/infra/credentials/{$this->credential->id}", ['username' => 'root'])
            ->assertOk()->assertJsonMissingPath('data.secret');
        $this->assertSame('segredo-original', $this->credential->fresh()?->secret);

        $this->putJson("/api/infra/credentials/{$this->credential->id}", ['secret' => 'novo'])->assertOk();
        $this->assertSame('novo', $this->credential->fresh()?->secret);
    }

    public function test_admin_can_list_access_logs_newest_first(): void
    {
        $infra = $this->userWithRole('infra');
        CredentialAccessLog::create([
            'credential_id' => $this->credential->id, 'user_id' => $infra->id,
            'accessed_at' => now()->subHour(), 'ip_address' => '10.0.0.1',
        ]);
        $latest = CredentialAccessLog::create([
            'credential_id' => $this->credential->id, 'user_id' => $infra->id,
            'accessed_at' => now(), 'ip_address' => '10.0.0.2',
        ]);

        Sanctum::actingAs($this->userWithRole('admin'));

        $response = $this->getJson("/api/infra/credentials/{$this->credential->id}/access-logs")
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $latest->id)
            ->assertJsonPath('data.0.user.id', $infra->id)
            ->assertJsonPath('data.0.user.name', $infra->name)
            ->assertJsonPath('data.0.ip_address', '10.0.0.2')
            ->assertJsonStructure(['data' => [['id', 'credential_id', 'user' => ['id', 'name'], 'ip_address', 'accessed_at', 'created_at']], 'meta', 'links']);

        $this->assertStringNotContainsString('segredo-original', $response->getContent());
    }

    public function test_non_admins_cannot_list_access_logs(): void
    {
        foreach (['infra', 'project_manager', 'member'] as $role) {
            Sanctum::actingAs($this->userWithRole($role));

            $this->getJson("/api/infra/credentials/{$this->credential->id}/access-logs")->assertForbidden();
        }
    }
}
