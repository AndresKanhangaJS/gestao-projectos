<?php

declare(strict_types=1);

namespace Tests\Feature\Infra;

use App\Models\Infra\BackupPolicy;
use App\Models\Infra\Client;
use App\Models\Infra\ClientSoftware;
use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use App\Models\Infra\SoftwareModule;
use App\Models\Infra\SoftwareProduct;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

/**
 * Matriz de acesso ao módulo Infra: leitura admin/infra/project_manager,
 * escrita admin/infra; member/client_viewer sem acesso nenhum.
 */
class InfraRoleAccessTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    /** @return list<string> */
    private function readUrls(): array
    {
        $client = Client::factory()->create();
        $product = SoftwareProduct::factory()->create();
        $module = SoftwareModule::factory()->create(['software_product_id' => $product->id]);
        $clientSoftware = ClientSoftware::factory()->create(['client_id' => $client->id, 'software_product_id' => $product->id]);
        $machine = Machine::factory()->create();
        $deployment = Deployment::factory()->create(['machine_id' => $machine->id, 'client_software_id' => $clientSoftware->id]);
        $policy = BackupPolicy::factory()->create(['backupable_type' => Machine::class, 'backupable_id' => $machine->id]);

        return [
            '/api/infra/clients',
            "/api/infra/clients/{$client->id}",
            "/api/infra/clients/{$client->id}/overview",
            '/api/infra/software-products',
            "/api/infra/software-products/{$product->id}",
            "/api/infra/software-products/{$product->id}/overview",
            "/api/infra/software-products/{$product->id}/modules",
            "/api/infra/software-modules/{$module->id}",
            '/api/infra/client-software',
            "/api/infra/client-software/{$clientSoftware->id}",
            '/api/infra/machines',
            "/api/infra/machines/{$machine->id}",
            "/api/infra/machines/{$machine->id}/overview",
            '/api/infra/deployments',
            "/api/infra/deployments/{$deployment->id}",
            '/api/infra/backup-policies',
            "/api/infra/backup-policies/{$policy->id}",
            '/api/infra/alerts',
        ];
    }

    public function test_member_and_client_viewer_get_403_on_every_infra_read_endpoint(): void
    {
        $urls = $this->readUrls();

        foreach (['member', 'client_viewer'] as $role) {
            Sanctum::actingAs($this->userWithRole($role));

            foreach ($urls as $url) {
                $this->getJson($url)->assertForbidden();
            }
        }
    }

    public function test_project_manager_infra_and_admin_can_read_every_infra_endpoint(): void
    {
        $urls = $this->readUrls();

        foreach (['project_manager', 'infra', 'admin'] as $role) {
            Sanctum::actingAs($this->userWithRole($role));

            foreach ($urls as $url) {
                $this->getJson($url)->assertOk();
            }
        }
    }

    public function test_project_manager_cannot_write(): void
    {
        $client = Client::factory()->create();
        $machine = Machine::factory()->create();
        $product = SoftwareProduct::factory()->create();

        Sanctum::actingAs($this->userWithRole('project_manager'));

        $this->postJson('/api/infra/clients', ['name' => 'Novo'])->assertForbidden();
        $this->putJson("/api/infra/clients/{$client->id}", ['name' => 'X'])->assertForbidden();
        $this->deleteJson("/api/infra/clients/{$client->id}")->assertForbidden();
        $this->postJson('/api/infra/machines', ['name' => 'M', 'environment' => 'docker'])->assertForbidden();
        $this->patchJson("/api/infra/machines/{$machine->id}", ['name' => 'X'])->assertForbidden();
        $this->postJson("/api/infra/software-products/{$product->id}/modules", ['name' => 'Mod'])->assertForbidden();

        $this->assertDatabaseHas('clients', ['id' => $client->id, 'name' => $client->name]);
    }

    public function test_project_manager_cannot_access_credentials(): void
    {
        Sanctum::actingAs($this->userWithRole('project_manager'));

        $this->getJson('/api/infra/credentials')->assertForbidden();
    }

    /** S4: a autorização acontece no Form Request, ANTES da validação — sem permissão é 403, nunca 422. */
    public function test_member_with_invalid_payload_gets_403_not_422_on_every_infra_write(): void
    {
        $client = Client::factory()->create();
        $product = SoftwareProduct::factory()->create();
        $module = SoftwareModule::factory()->create(['software_product_id' => $product->id]);
        $clientSoftware = ClientSoftware::factory()->create();
        $machine = Machine::factory()->create();
        $deployment = Deployment::factory()->create(['machine_id' => $machine->id]);
        $policy = BackupPolicy::factory()->create(['backupable_type' => Machine::class, 'backupable_id' => $machine->id]);

        Sanctum::actingAs($this->userWithRole('member'));

        $invalid = ['name' => str_repeat('x', 999), 'environment' => 'nope', 'status' => 'nope', 'frequency' => 'nope'];

        $this->postJson('/api/infra/clients', $invalid)->assertForbidden();
        $this->putJson("/api/infra/clients/{$client->id}", $invalid)->assertForbidden();
        $this->postJson('/api/infra/software-products', [])->assertForbidden();
        $this->putJson("/api/infra/software-products/{$product->id}", $invalid)->assertForbidden();
        $this->postJson("/api/infra/software-products/{$product->id}/modules", [])->assertForbidden();
        $this->putJson("/api/infra/software-modules/{$module->id}", $invalid)->assertForbidden();
        $this->postJson('/api/infra/client-software', [])->assertForbidden();
        $this->putJson("/api/infra/client-software/{$clientSoftware->id}", $invalid)->assertForbidden();
        $this->putJson("/api/infra/client-software/{$clientSoftware->id}/modules", ['modules' => 'x'])->assertForbidden();
        $this->postJson('/api/infra/machines', $invalid)->assertForbidden();
        $this->putJson("/api/infra/machines/{$machine->id}", $invalid)->assertForbidden();
        $this->postJson('/api/infra/deployments', [])->assertForbidden();
        $this->putJson("/api/infra/deployments/{$deployment->id}", $invalid)->assertForbidden();
        $this->postJson('/api/infra/backup-policies', [])->assertForbidden();
        $this->putJson("/api/infra/backup-policies/{$policy->id}", $invalid)->assertForbidden();
        $this->postJson('/api/infra/credentials', [])->assertForbidden();
    }

    public function test_infra_with_invalid_payload_gets_422(): void
    {
        $machine = Machine::factory()->create();
        Sanctum::actingAs($this->userWithRole('infra'));

        $this->postJson('/api/infra/clients', [])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->putJson("/api/infra/machines/{$machine->id}", ['environment' => 'nope'])
            ->assertUnprocessable()->assertJsonValidationErrors('environment');
    }
}
