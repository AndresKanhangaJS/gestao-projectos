<?php

declare(strict_types=1);

namespace Tests\Feature\Infra;

use App\Models\Infra\Client;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

class ClientCrudTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    public function test_admin_can_create_a_client(): void
    {
        Sanctum::actingAs($this->userWithRole('admin'));

        $response = $this->postJson('/api/infra/clients', [
            'name' => 'Pitruca',
            'contact_email' => 'geral@pitruca.co.mz',
            'status' => 'active',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Pitruca')
            ->assertJsonPath('data.status', 'active');

        $this->assertDatabaseHas('clients', ['name' => 'Pitruca']);
    }

    public function test_member_cannot_create_a_client(): void
    {
        Sanctum::actingAs($this->userWithRole('member'));

        $response = $this->postJson('/api/infra/clients', ['name' => 'Bondo']);

        $response->assertForbidden();
    }

    public function test_project_manager_can_list_and_view_clients(): void
    {
        $client = Client::factory()->create();

        Sanctum::actingAs($this->userWithRole('project_manager'));

        $this->getJson('/api/infra/clients')->assertOk();

        $this->getJson("/api/infra/clients/{$client->id}")
            ->assertOk()
            ->assertJsonPath('data.id', $client->id);
    }

    public function test_infra_can_update_and_delete_a_client(): void
    {
        $client = Client::factory()->create(['name' => 'Old name']);

        Sanctum::actingAs($this->userWithRole('infra'));

        $this->putJson("/api/infra/clients/{$client->id}", ['name' => 'New name'])
            ->assertOk()
            ->assertJsonPath('data.name', 'New name');

        $this->assertDatabaseHas('clients', ['id' => $client->id, 'name' => 'New name']);

        $this->deleteJson("/api/infra/clients/{$client->id}")->assertNoContent();

        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
    }

    public function test_client_overview_returns_software_instances(): void
    {
        $client = Client::factory()->create();

        Sanctum::actingAs($this->userWithRole('project_manager'));

        $this->getJson("/api/infra/clients/{$client->id}/overview")
            ->assertOk()
            ->assertJsonStructure(['client', 'software']);
    }
}
