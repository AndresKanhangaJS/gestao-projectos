<?php

declare(strict_types=1);

namespace Tests\Feature\Infra;

use App\Models\Infra\Credential;
use App\Models\Infra\CredentialAccessLog;
use App\Models\Infra\Machine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\TestCase;

class CredentialSoftDeleteTest extends TestCase
{
    use CreatesInfraRoles, RefreshDatabase;

    private function makeCredential(): Credential
    {
        $machine = Machine::factory()->create();

        return Credential::factory()->create([
            'credentialable_type' => Machine::class,
            'credentialable_id' => $machine->id,
            'secret' => 'super-secret-password',
        ]);
    }

    public function test_deleting_a_credential_is_a_soft_delete_and_preserves_access_logs(): void
    {
        $admin = $this->userWithRole('admin');
        $credential = $this->makeCredential();
        Sanctum::actingAs($admin);

        $this->postJson("/api/infra/credentials/{$credential->id}/reveal")->assertOk();
        $this->assertDatabaseCount('credential_access_logs', 1);

        $this->deleteJson("/api/infra/credentials/{$credential->id}")->assertNoContent();

        $this->assertSoftDeleted('credentials', ['id' => $credential->id]);
        // O segredo é destruído no delete (a linha fica só como âncora da auditoria).
        $this->assertNull(Credential::withTrashed()->findOrFail($credential->id)->secret);
        $this->assertNull(DB::table('credentials')->where('id', $credential->id)->value('secret'));
        $this->assertDatabaseCount('credential_access_logs', 1);
        $this->assertSame(1, CredentialAccessLog::where('credential_id', $credential->id)->count());
    }

    public function test_soft_deleted_credentials_are_hidden_from_listing_and_cannot_be_revealed(): void
    {
        $admin = $this->userWithRole('admin');
        $kept = $this->makeCredential();
        $deleted = $this->makeCredential();
        $deleted->delete();
        Sanctum::actingAs($admin);

        $this->getJson('/api/infra/credentials')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $kept->id);

        $this->getJson("/api/infra/credentials?machine_id={$deleted->credentialable_id}")
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->postJson("/api/infra/credentials/{$deleted->id}/reveal")->assertNotFound();
        $this->putJson("/api/infra/credentials/{$deleted->id}", ['username' => 'x'])->assertNotFound();
        $this->getJson("/api/infra/credentials/{$deleted->id}/access-logs")->assertNotFound();
        $this->deleteJson("/api/infra/credentials/{$deleted->id}")->assertNotFound();

        $this->assertDatabaseCount('credential_access_logs', 0);
    }

    public function test_soft_deleted_credentials_are_hidden_from_machine_relation(): void
    {
        $credential = $this->makeCredential();
        /** @var Machine $machine */
        $machine = $credential->credentialable;
        $credential->delete();

        $this->assertCount(0, $machine->credentials()->get());
        $this->assertSame(1, Credential::withTrashed()->count());
    }

    public function test_reveal_of_a_credential_without_secret_is_404_and_not_logged(): void
    {
        $credential = $this->makeCredential();
        $credential->forceFill(['secret' => null])->save();
        Sanctum::actingAs($this->userWithRole('admin'));

        $this->postJson("/api/infra/credentials/{$credential->id}/reveal")->assertNotFound();
        $this->assertDatabaseCount('credential_access_logs', 0);
    }
}
