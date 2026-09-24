<?php

declare(strict_types=1);

namespace Tests\Feature\Infra;

use App\Models\Infra\Client;
use App\Models\Infra\ClientSoftware;
use App\Models\Infra\Machine;
use App\Models\Infra\SoftwareProduct;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

class MachineDeploymentCrudTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    public function test_infra_can_create_a_machine(): void
    {
        Sanctum::actingAs($this->userWithRole('infra'));

        $response = $this->postJson('/api/infra/machines', [
            'name' => 'Máquina 10',
            'ip_address' => '10.0.0.10',
            'environment' => 'docker',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Máquina 10')
            ->assertJsonMissingPath('data.secret');

        $this->assertDatabaseHas('machines', ['name' => 'Máquina 10']);
    }

    public function test_machine_name_must_be_unique(): void
    {
        Machine::factory()->create(['name' => 'Máquina 7']);

        Sanctum::actingAs($this->userWithRole('admin'));

        $this->postJson('/api/infra/machines', [
            'name' => 'Máquina 7',
            'environment' => 'docker',
        ])->assertUnprocessable();
    }

    public function test_infra_can_create_a_deployment_for_a_machine(): void
    {
        $machine = Machine::factory()->create();
        $clientSoftware = ClientSoftware::factory()->create([
            'client_id' => Client::factory(),
            'software_product_id' => SoftwareProduct::factory(),
        ]);

        Sanctum::actingAs($this->userWithRole('infra'));

        $response = $this->postJson('/api/infra/deployments', [
            'client_software_id' => $clientSoftware->id,
            'machine_id' => $machine->id,
            'component' => 'full',
            'port' => 8080,
            'environment_type' => 'docker',
            'status' => 'activo',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.machine_id', $machine->id)
            ->assertJsonPath('data.port', 8080);

        $this->assertDatabaseHas('deployments', [
            'client_software_id' => $clientSoftware->id,
            'machine_id' => $machine->id,
        ]);
    }

    public function test_member_cannot_create_a_deployment(): void
    {
        $machine = Machine::factory()->create();
        $clientSoftware = ClientSoftware::factory()->create();

        Sanctum::actingAs($this->userWithRole('member'));

        $this->postJson('/api/infra/deployments', [
            'client_software_id' => $clientSoftware->id,
            'machine_id' => $machine->id,
            'environment_type' => 'docker',
        ])->assertForbidden();
    }

    public function test_machine_overview_lists_its_deployments(): void
    {
        $machine = Machine::factory()->create();

        Sanctum::actingAs($this->userWithRole('project_manager'));

        $this->getJson("/api/infra/machines/{$machine->id}/overview")
            ->assertOk()
            ->assertJsonStructure(['machine', 'deployments']);
    }
}
