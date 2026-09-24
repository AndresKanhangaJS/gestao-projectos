<?php

declare(strict_types=1);

namespace Tests\Feature\Infra;

use App\Models\Infra\BackupPolicy;
use App\Models\Infra\ClientSoftware;
use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

class AlertsTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    public function test_alerts_list_tradicional_machines_software_without_backup_and_stale_deployments(): void
    {
        $tradicional = Machine::factory()->create(['environment' => 'tradicional']);
        $docker = Machine::factory()->create(['environment' => 'docker']);

        $withBackup = ClientSoftware::factory()->create();
        $withoutBackup = ClientSoftware::factory()->create();

        $fresh = Deployment::factory()->create([
            'client_software_id' => $withBackup->id,
            'machine_id' => $docker->id,
            'last_checked_at' => now()->subDay(),
        ]);
        BackupPolicy::factory()->create(['backupable_type' => Deployment::class, 'backupable_id' => $fresh->id]);

        $stale = Deployment::factory()->create([
            'client_software_id' => $withoutBackup->id,
            'machine_id' => $tradicional->id,
            'last_checked_at' => now()->subDays(45),
        ]);
        $never = Deployment::factory()->create([
            'client_software_id' => $withoutBackup->id,
            'machine_id' => $docker->id,
            'last_checked_at' => null,
        ]);

        Sanctum::actingAs($this->userWithRole('project_manager'));

        $response = $this->getJson('/api/infra/alerts')->assertOk()
            ->assertJsonStructure(['machines_tradicional', 'software_without_backup', 'deployments_not_recently_checked']);

        $this->assertSame([$tradicional->id], array_column($response->json('machines_tradicional'), 'id'));
        $this->assertSame([$withoutBackup->id], array_column($response->json('software_without_backup'), 'id'));

        $staleIds = array_column($response->json('deployments_not_recently_checked'), 'id');
        sort($staleIds);
        $this->assertSame([$stale->id, $never->id], $staleIds);
    }

    public function test_member_cannot_see_alerts(): void
    {
        Sanctum::actingAs($this->userWithRole('member'));

        $this->getJson('/api/infra/alerts')->assertForbidden();
    }
}
