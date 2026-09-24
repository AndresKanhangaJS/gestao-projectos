<?php

declare(strict_types=1);

namespace Tests\Feature\Infra;

use App\Enums\Infra\BackupFrequency;
use App\Models\Infra\BackupPolicy;
use App\Models\Infra\Client;
use App\Models\Infra\ClientSoftware;
use App\Models\Infra\Credential;
use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use App\Models\Infra\SoftwareProduct;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

class InfraIndexFiltersTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    private Machine $machine;

    private Machine $otherMachine;

    private Deployment $deployment;

    private Deployment $otherDeployment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->machine = Machine::factory()->create();
        $this->otherMachine = Machine::factory()->create();
        $this->deployment = Deployment::factory()->create(['machine_id' => $this->machine->id]);
        $this->otherDeployment = Deployment::factory()->create(['machine_id' => $this->otherMachine->id]);
    }

    private function credentialFor(Machine|Deployment $owner, string $secret = 'nao-mostrar'): Credential
    {
        return Credential::factory()->create([
            'credentialable_type' => $owner::class,
            'credentialable_id' => $owner->id,
            'secret' => $secret,
        ]);
    }

    /**
     * @param  array<int, int>  $expected
     * @param  array<int, array<string, mixed>>  $data
     */
    private function assertIds(array $expected, array $data): void
    {
        $ids = array_map(fn (array $row): int => $row['id'], $data);
        sort($ids);
        sort($expected);

        $this->assertSame($expected, $ids);
    }

    // --- Credenciais -----------------------------------------------------

    public function test_credentials_can_be_filtered_by_credentialable(): void
    {
        $onMachine = $this->credentialFor($this->machine);
        $onDeployment = $this->credentialFor($this->deployment);
        $this->credentialFor($this->otherMachine);

        Sanctum::actingAs($this->userWithRole('infra'));

        $response = $this->getJson("/api/infra/credentials?credentialable_type=machine&credentialable_id={$this->machine->id}")->assertOk();
        $this->assertIds([$onMachine->id], $response->json('data'));

        $response = $this->getJson("/api/infra/credentials?credentialable_type=deployment&credentialable_id={$this->deployment->id}")->assertOk();
        $this->assertIds([$onDeployment->id], $response->json('data'));
    }

    public function test_credentials_machine_filter_includes_its_deployments_and_never_the_secret(): void
    {
        $onMachine = $this->credentialFor($this->machine, 'segredo-maquina');
        $onDeployment = $this->credentialFor($this->deployment, 'segredo-deployment');
        $this->credentialFor($this->otherMachine);
        $this->credentialFor($this->otherDeployment);

        Sanctum::actingAs($this->userWithRole('admin'));

        $response = $this->getJson("/api/infra/credentials?machine_id={$this->machine->id}")
            ->assertOk()
            ->assertJsonMissingPath('data.0.secret');

        $this->assertIds([$onMachine->id, $onDeployment->id], $response->json('data'));
        $this->assertStringNotContainsString('segredo-maquina', (string) $response->getContent());
        $this->assertStringNotContainsString('segredo-deployment', (string) $response->getContent());
    }

    public function test_credentials_filters_are_validated(): void
    {
        Sanctum::actingAs($this->userWithRole('infra'));

        $this->getJson('/api/infra/credentials?credentialable_type=client&credentialable_id=1')
            ->assertUnprocessable()->assertJsonValidationErrors('credentialable_type');
        $this->getJson('/api/infra/credentials?credentialable_type=machine')
            ->assertUnprocessable()->assertJsonValidationErrors('credentialable_id');
        $this->getJson('/api/infra/credentials?credentialable_id=1')
            ->assertUnprocessable()->assertJsonValidationErrors('credentialable_type');
        $this->getJson("/api/infra/credentials?machine_id={$this->machine->id}&credentialable_type=machine&credentialable_id=1")
            ->assertUnprocessable()->assertJsonValidationErrors('credentialable_type');
        $this->getJson('/api/infra/credentials?machine_id=abc')
            ->assertUnprocessable()->assertJsonValidationErrors('machine_id');
    }

    public function test_member_gets_403_on_credentials_index_even_with_filters(): void
    {
        Sanctum::actingAs($this->userWithRole('member'));

        $this->getJson("/api/infra/credentials?machine_id={$this->machine->id}")->assertForbidden();
        // Autorização precede a validação: nunca 422 para quem não tem acesso.
        $this->getJson('/api/infra/credentials?credentialable_type=invalido')->assertForbidden();
    }

    // --- Deployments -----------------------------------------------------

    public function test_deployments_can_be_filtered_by_machine_and_include_nested_client_and_product(): void
    {
        $client = Client::factory()->create(['name' => 'Cliente Filtro']);
        $product = SoftwareProduct::factory()->create(['name' => 'Produto Filtro']);
        $clientSoftware = ClientSoftware::factory()->create([
            'client_id' => $client->id,
            'software_product_id' => $product->id,
        ]);
        $second = Deployment::factory()->create([
            'machine_id' => $this->machine->id,
            'client_software_id' => $clientSoftware->id,
        ]);

        Sanctum::actingAs($this->userWithRole('project_manager'));

        $response = $this->getJson("/api/infra/deployments?machine_id={$this->machine->id}")->assertOk();

        $this->assertIds([$this->deployment->id, $second->id], $response->json('data'));

        $row = collect($response->json('data'))->firstWhere('id', $second->id);
        $this->assertIsArray($row);
        $this->assertSame('Cliente Filtro', $row['client_software']['client']['name']);
        $this->assertSame('Produto Filtro', $row['client_software']['software_product']['name']);
    }

    public function test_deployments_index_does_not_query_per_row(): void
    {
        Deployment::factory()->count(5)->create(['machine_id' => $this->machine->id]);

        Sanctum::actingAs($this->userWithRole('project_manager'));

        DB::enableQueryLog();
        $this->getJson('/api/infra/deployments')->assertOk()->assertJsonCount(7, 'data');
        $queries = count(DB::getQueryLog());
        DB::disableQueryLog();

        // auth + roles + count + select + 4 eager loads — independente do nº de linhas.
        $this->assertLessThan(15, $queries);
    }

    public function test_deployments_machine_filter_is_validated(): void
    {
        Sanctum::actingAs($this->userWithRole('project_manager'));

        $this->getJson('/api/infra/deployments?machine_id=abc')
            ->assertUnprocessable()->assertJsonValidationErrors('machine_id');
    }

    // --- Políticas de backup ---------------------------------------------

    public function test_backup_policies_can_be_filtered_by_backupable(): void
    {
        $onMachine = BackupPolicy::factory()->create([
            'backupable_type' => Machine::class,
            'backupable_id' => $this->machine->id,
        ]);
        $onDeployment = BackupPolicy::factory()->create([
            'backupable_type' => Deployment::class,
            'backupable_id' => $this->deployment->id,
        ]);
        BackupPolicy::factory()->create([
            'backupable_type' => Machine::class,
            'backupable_id' => $this->otherMachine->id,
        ]);

        Sanctum::actingAs($this->userWithRole('project_manager'));

        $response = $this->getJson("/api/infra/backup-policies?backupable_type=machine&backupable_id={$this->machine->id}")->assertOk();
        $this->assertIds([$onMachine->id], $response->json('data'));

        $response = $this->getJson("/api/infra/backup-policies?backupable_type=deployment&backupable_id={$this->deployment->id}")->assertOk();
        $this->assertIds([$onDeployment->id], $response->json('data'));

        $this->getJson('/api/infra/backup-policies')->assertOk()->assertJsonCount(3, 'data');
    }

    public function test_backup_policies_filters_are_validated(): void
    {
        Sanctum::actingAs($this->userWithRole('infra'));

        $this->getJson('/api/infra/backup-policies?backupable_type=client&backupable_id=1')
            ->assertUnprocessable()->assertJsonValidationErrors('backupable_type');
        $this->getJson('/api/infra/backup-policies?backupable_type=machine')
            ->assertUnprocessable()->assertJsonValidationErrors('backupable_id');
    }

    public function test_member_cannot_create_update_or_delete_backup_policies(): void
    {
        $policy = BackupPolicy::factory()->create([
            'backupable_type' => Machine::class,
            'backupable_id' => $this->machine->id,
        ]);

        Sanctum::actingAs($this->userWithRole('member'));

        $this->postJson('/api/infra/backup-policies', [
            'backupable_type' => 'machine',
            'backupable_id' => $this->machine->id,
            'frequency' => BackupFrequency::cases()[0]->value,
            'retention_count' => 7,
        ])->assertForbidden();

        $this->patchJson("/api/infra/backup-policies/{$policy->id}", ['retention_count' => 99])->assertForbidden();
        $this->deleteJson("/api/infra/backup-policies/{$policy->id}")->assertForbidden();

        $this->assertDatabaseCount('backup_policies', 1);
        $this->assertDatabaseHas('backup_policies', ['id' => $policy->id, 'retention_count' => $policy->retention_count]);
    }

    public function test_infra_can_create_a_backup_policy(): void
    {
        Sanctum::actingAs($this->userWithRole('infra'));

        $this->postJson('/api/infra/backup-policies', [
            'backupable_type' => 'deployment',
            'backupable_id' => $this->deployment->id,
            'frequency' => BackupFrequency::cases()[0]->value,
            'retention_count' => 7,
        ])->assertCreated();

        $this->assertDatabaseHas('backup_policies', [
            'backupable_type' => Deployment::class,
            'backupable_id' => $this->deployment->id,
        ]);
    }
}
