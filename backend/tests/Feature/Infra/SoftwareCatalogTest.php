<?php

declare(strict_types=1);

namespace Tests\Feature\Infra;

use App\Models\Infra\Client;
use App\Models\Infra\ClientSoftware;
use App\Models\Infra\SoftwareModule;
use App\Models\Infra\SoftwareProduct;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

/** Produtos de software, módulos e instâncias cliente↔software (+ syncModules). */
class SoftwareCatalogTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Sanctum::actingAs($this->userWithRole('infra'));
    }

    public function test_software_product_crud_and_overview(): void
    {
        $productId = $this->postJson('/api/infra/software-products', [
            'name' => 'Level-RH',
            'category' => 'ERP',
        ])->assertCreated()->assertJsonPath('data.name', 'Level-RH')->json('data.id');

        $this->getJson('/api/infra/software-products')->assertOk()->assertJsonPath('data.0.id', $productId);
        $this->putJson("/api/infra/software-products/{$productId}", ['name' => 'Level-RH 2'])
            ->assertOk()->assertJsonPath('data.name', 'Level-RH 2');

        $client = Client::factory()->create();
        ClientSoftware::factory()->create(['client_id' => $client->id, 'software_product_id' => $productId]);

        $this->getJson("/api/infra/software-products/{$productId}/overview")
            ->assertOk()
            ->assertJsonStructure(['software_product' => ['id', 'name'], 'instances'])
            ->assertJsonPath('instances.0.client.id', $client->id);

        $this->postJson('/api/infra/software-products', [])->assertUnprocessable()->assertJsonValidationErrors('name');
    }

    public function test_software_module_nested_crud(): void
    {
        $product = SoftwareProduct::factory()->create();

        $moduleId = $this->postJson("/api/infra/software-products/{$product->id}/modules", [
            'name' => 'Salários',
            'description' => 'Processamento salarial',
        ])->assertCreated()->assertJsonPath('data.name', 'Salários')->json('data.id');

        $this->assertDatabaseHas('software_modules', ['id' => $moduleId, 'software_product_id' => $product->id]);

        $this->getJson("/api/infra/software-products/{$product->id}/modules")->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/infra/software-modules/{$moduleId}")->assertOk()->assertJsonPath('data.id', $moduleId);
        $this->patchJson("/api/infra/software-modules/{$moduleId}", ['name' => 'Payroll'])
            ->assertOk()->assertJsonPath('data.name', 'Payroll');
        $this->deleteJson("/api/infra/software-modules/{$moduleId}")->assertNoContent();
        $this->assertDatabaseMissing('software_modules', ['id' => $moduleId]);

        $this->deleteJson("/api/infra/software-products/{$product->id}")->assertNoContent();
    }

    public function test_client_software_crud(): void
    {
        $client = Client::factory()->create();
        $product = SoftwareProduct::factory()->create();

        $id = $this->postJson('/api/infra/client-software', [
            'client_id' => $client->id,
            'software_product_id' => $product->id,
        ])->assertCreated()
            ->assertJsonPath('data.client_id', $client->id)
            ->json('data.id');

        $this->getJson('/api/infra/client-software')->assertOk()->assertJsonPath('data.0.client.id', $client->id);
        $this->getJson("/api/infra/client-software/{$id}")->assertOk()->assertJsonPath('data.software_product.id', $product->id);
        $this->patchJson("/api/infra/client-software/{$id}", ['notes' => 'Nota'])->assertOk()->assertJsonPath('data.notes', 'Nota');

        $this->postJson('/api/infra/client-software', ['client_id' => 999999])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client_id', 'software_product_id']);

        $this->deleteJson("/api/infra/client-software/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('client_software', ['id' => $id]);
    }

    public function test_sync_modules_replaces_active_modules(): void
    {
        $clientSoftware = ClientSoftware::factory()->create();
        $a = SoftwareModule::factory()->create(['software_product_id' => $clientSoftware->software_product_id]);
        $b = SoftwareModule::factory()->create(['software_product_id' => $clientSoftware->software_product_id]);

        $this->putJson("/api/infra/client-software/{$clientSoftware->id}/modules", [
            'modules' => [
                ['software_module_id' => $a->id, 'active' => true],
                ['software_module_id' => $b->id, 'active' => false],
            ],
        ])->assertOk()->assertJsonCount(2, 'data.modules');

        $this->assertDatabaseHas('client_software_modules', ['client_software_id' => $clientSoftware->id, 'software_module_id' => $a->id, 'active' => true]);
        $this->assertDatabaseHas('client_software_modules', ['client_software_id' => $clientSoftware->id, 'software_module_id' => $b->id, 'active' => false]);

        $this->putJson("/api/infra/client-software/{$clientSoftware->id}/modules", [
            'modules' => [['software_module_id' => $b->id, 'active' => true]],
        ])->assertOk()->assertJsonCount(1, 'data.modules');

        $this->assertDatabaseMissing('client_software_modules', ['client_software_id' => $clientSoftware->id, 'software_module_id' => $a->id]);

        $this->putJson("/api/infra/client-software/{$clientSoftware->id}/modules", [
            'modules' => [['software_module_id' => 999999, 'active' => 'talvez']],
        ])->assertUnprocessable()->assertJsonValidationErrors(['modules.0.software_module_id', 'modules.0.active']);
    }
}
