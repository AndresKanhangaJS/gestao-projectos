<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Infra\Client;
use App\Models\Infra\ClientSoftware;
use App\Models\Infra\SoftwareModule;
use App\Models\Infra\SoftwareProduct;
use App\Models\Projects\Project;
use App\Models\Projects\Workspace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

/** Ligação Projecto ↔ Controlo de Software (produto, cliente, módulos). */
class ProjectSoftwareLinkTest extends TestCase
{
    use BuildsProjectContext, CreatesInfraRoles, RefreshDatabase;

    private SoftwareProduct $school;

    private SoftwareModule $notas;

    private SoftwareModule $qr;

    private SoftwareModule $sms;

    private SoftwareModule $otherModule;

    /** Tem o Level-School com TODOS os módulos (sem linhas na pivot). */
    private Client $pitruca;

    /** Tem o Level-School só com Notas activo (QR inactivo). */
    private Client $bondo;

    /** Não tem o Level-School. */
    private Client $ispaj;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();

        $this->school = SoftwareProduct::factory()->create(['name' => 'Level-School']);
        $this->notas = SoftwareModule::factory()->create(['software_product_id' => $this->school->id, 'name' => 'Lançamento de Notas']);
        $this->qr = SoftwareModule::factory()->create(['software_product_id' => $this->school->id, 'name' => 'Leitura QR']);
        $this->sms = SoftwareModule::factory()->create(['software_product_id' => $this->school->id, 'name' => 'Notificação por SMS']);
        $rh = SoftwareProduct::factory()->create(['name' => 'Level-RH']);
        $this->otherModule = SoftwareModule::factory()->create(['software_product_id' => $rh->id, 'name' => 'Front-end']);

        $this->pitruca = Client::factory()->create(['name' => 'Pitruca']);
        $this->bondo = Client::factory()->create(['name' => 'Bondo']);
        $this->ispaj = Client::factory()->create(['name' => 'ISPAJ']);

        ClientSoftware::factory()->create(['client_id' => $this->pitruca->id, 'software_product_id' => $this->school->id]);
        $bondoSchool = ClientSoftware::factory()->create(['client_id' => $this->bondo->id, 'software_product_id' => $this->school->id]);
        $bondoSchool->modules()->attach([$this->notas->id => ['active' => true], $this->qr->id => ['active' => false]]);
        ClientSoftware::factory()->create(['client_id' => $this->ispaj->id, 'software_product_id' => $rh->id]);

        Sanctum::actingAs($this->owner);
    }

    /** @param  array<string, mixed>  $payload */
    private function storeProject(array $payload): TestResponse
    {
        return $this->postJson("/api/projects/workspaces/{$this->workspace->id}/projects", [
            'key' => 'LNK'.random_int(100, 999),
            'name' => 'Projecto ligado',
            ...$payload,
        ]);
    }

    public function test_project_can_be_linked_to_product_client_and_modules(): void
    {
        $response = $this->storeProject([
            'software_product_id' => $this->school->id,
            'client_id' => $this->pitruca->id,
            'module_ids' => [$this->sms->id, $this->notas->id],
        ])->assertCreated();

        $response
            ->assertJsonPath('data.software_product', ['id' => $this->school->id, 'name' => 'Level-School'])
            ->assertJsonPath('data.client', ['id' => $this->pitruca->id, 'name' => 'Pitruca'])
            ->assertJsonPath('data.modules', [
                ['id' => $this->notas->id, 'name' => 'Lançamento de Notas'],
                ['id' => $this->sms->id, 'name' => 'Notificação por SMS'],
            ]);

        $this->assertDatabaseHas('projects', [
            'id' => $response->json('data.id'),
            'software_product_id' => $this->school->id,
            'client_id' => $this->pitruca->id,
        ]);
        $this->assertDatabaseCount('project_software_module', 2);
    }

    public function test_unlinked_project_resource_has_null_links(): void
    {
        $this->getJson("/api/projects/{$this->project->id}")
            ->assertOk()
            ->assertJsonPath('data.software_product', null)
            ->assertJsonPath('data.client', null)
            ->assertJsonPath('data.modules', []);
    }

    public function test_client_must_have_the_software_installed(): void
    {
        $this->storeProject(['software_product_id' => $this->school->id, 'client_id' => $this->ispaj->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client_id' => 'Este cliente não tem este software instalado.']);

        $this->storeProject(['client_id' => $this->pitruca->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client_id' => 'Escolha primeiro o software do projecto.']);

        $this->storeProject(['software_product_id' => 999999])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('software_product_id');
    }

    public function test_modules_must_belong_to_the_product(): void
    {
        $this->storeProject(['software_product_id' => $this->school->id, 'module_ids' => [$this->notas->id, $this->otherModule->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['module_ids.1' => 'O módulo não pertence a este software.'])
            ->assertJsonMissingValidationErrors('module_ids.0');

        $this->storeProject(['module_ids' => [$this->notas->id]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['module_ids' => 'Escolha primeiro o software do projecto.']);
    }

    public function test_modules_must_be_active_for_the_client(): void
    {
        // Bondo: só "Lançamento de Notas" activo (QR inactivo, SMS sem linha).
        foreach ([$this->qr, $this->sms] as $module) {
            $this->storeProject([
                'software_product_id' => $this->school->id,
                'client_id' => $this->bondo->id,
                'module_ids' => [$module->id],
            ])->assertUnprocessable()
                ->assertJsonValidationErrors(['module_ids.0' => 'O módulo não está activo para este cliente.']);
        }

        $this->storeProject([
            'software_product_id' => $this->school->id,
            'client_id' => $this->bondo->id,
            'module_ids' => [$this->notas->id],
        ])->assertCreated();
    }

    public function test_client_without_module_rows_has_all_modules(): void
    {
        $this->storeProject([
            'software_product_id' => $this->school->id,
            'client_id' => $this->pitruca->id,
            'module_ids' => [$this->notas->id, $this->qr->id, $this->sms->id],
        ])->assertCreated()->assertJsonCount(3, 'data.modules');
    }

    public function test_update_omitted_keeps_null_or_empty_clears_and_product_change_resets(): void
    {
        $this->project->update(['software_product_id' => $this->school->id, 'client_id' => $this->pitruca->id]);
        $this->project->modules()->attach([$this->notas->id, $this->qr->id]);
        $url = "/api/projects/{$this->project->id}";

        // Omitido: não mexe.
        $this->patchJson($url, ['name' => 'Novo nome'])
            ->assertOk()
            ->assertJsonPath('data.client.id', $this->pitruca->id)
            ->assertJsonCount(2, 'data.modules');

        // Trocar para Bondo sem enviar módulos: QR (actual) não está activo para Bondo → 422.
        $this->patchJson($url, ['client_id' => $this->bondo->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['module_ids.1' => 'O módulo não está activo para este cliente.']);

        // [] limpa módulos; null limpa cliente.
        $this->patchJson($url, ['module_ids' => []])->assertOk()->assertJsonPath('data.modules', []);
        $this->patchJson($url, ['client_id' => null])->assertOk()->assertJsonPath('data.client', null);

        // Mudar de produto sem enviar cliente/módulos limpa-os.
        $this->patchJson($url, ['client_id' => $this->pitruca->id, 'module_ids' => [$this->sms->id]])->assertOk();
        $rh = SoftwareProduct::where('name', 'Level-RH')->firstOrFail();
        $this->patchJson($url, ['software_product_id' => $rh->id])
            ->assertOk()
            ->assertJsonPath('data.software_product.id', $rh->id)
            ->assertJsonPath('data.client', null)
            ->assertJsonPath('data.modules', []);

        // null no produto limpa tudo.
        $this->patchJson($url, ['software_product_id' => null])
            ->assertOk()
            ->assertJsonPath('data.software_product', null);
    }

    public function test_project_index_filters_by_client_and_software(): void
    {
        $linked = Project::factory()->create([
            'workspace_id' => $this->workspace->id,
            'software_product_id' => $this->school->id,
            'client_id' => $this->pitruca->id,
        ]);
        $schoolOnly = Project::factory()->create([
            'workspace_id' => $this->workspace->id,
            'software_product_id' => $this->school->id,
        ]);
        $url = "/api/projects/workspaces/{$this->workspace->id}/projects";

        $this->assertSame([$linked->id], array_column($this->getJson("{$url}?client_id={$this->pitruca->id}")->assertOk()->json('data'), 'id'));
        $this->assertEqualsCanonicalizing(
            [$linked->id, $schoolOnly->id],
            array_column($this->getJson("{$url}?software_product_id={$this->school->id}")->assertOk()->json('data'), 'id'),
        );
        $this->assertCount(3, $this->getJson($url)->json('data'));
        $this->getJson("{$url}?client_id=abc")->assertUnprocessable()->assertJsonValidationErrors('client_id');
    }

    public function test_link_options_shape_and_module_semantics(): void
    {
        $response = $this->getJson('/api/projects/link-options')->assertOk();

        $school = collect($response->json('software_products'))->firstWhere('id', $this->school->id);
        $this->assertSame([
            'id' => $this->school->id,
            'name' => 'Level-School',
            'modules' => [
                ['id' => $this->notas->id, 'name' => 'Lançamento de Notas'],
                ['id' => $this->qr->id, 'name' => 'Leitura QR'],
                ['id' => $this->sms->id, 'name' => 'Notificação por SMS'],
            ],
            'clients' => [
                ['id' => $this->bondo->id, 'name' => 'Bondo', 'all_modules' => false, 'module_ids' => [$this->notas->id]],
                ['id' => $this->pitruca->id, 'name' => 'Pitruca', 'all_modules' => true, 'module_ids' => [$this->notas->id, $this->qr->id, $this->sms->id]],
            ],
        ], $school);

        // Nada sensível do módulo Infra.
        $this->assertStringNotContainsString('ip_address', $response->getContent());
        $this->assertStringNotContainsString('contact_email', $response->getContent());
    }

    public function test_link_options_access(): void
    {
        foreach ([WorkspaceRole::Member, WorkspaceRole::Viewer] as $role) {
            Sanctum::actingAs($this->memberOf($this->workspace, $role));
            $this->getJson('/api/projects/link-options')->assertForbidden();
        }
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/projects/link-options')->assertForbidden();
        // infra lê o módulo Infra mas não gere projectos.
        Sanctum::actingAs($this->userWithRole('infra'));
        $this->getJson('/api/projects/link-options')->assertForbidden();

        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Manager));
        $this->getJson('/api/projects/link-options')->assertOk();
        Sanctum::actingAs($this->userWithRole('project_manager'));
        $this->getJson('/api/projects/link-options')->assertOk();
    }

    public function test_infra_overviews_list_projects_visible_to_the_user(): void
    {
        $visible = Project::factory()->create([
            'workspace_id' => $this->workspace->id,
            'software_product_id' => $this->school->id,
            'client_id' => $this->pitruca->id,
            'key' => 'VIS',
            'name' => 'Visível',
            'status' => 'active',
        ]);
        $otherWorkspace = Workspace::factory()->create(['owner_id' => User::factory()->create()->id]);
        $hidden = Project::factory()->create([
            'workspace_id' => $otherWorkspace->id,
            'software_product_id' => $this->school->id,
            'client_id' => $this->pitruca->id,
        ]);

        // Utilizador infra, membro só do workspace do projecto visível.
        $infra = $this->userWithRole('infra');
        $this->workspace->members()->attach($infra->id, ['role' => WorkspaceRole::Viewer->value]);
        Sanctum::actingAs($infra);

        $expected = [['id' => $visible->id, 'key' => 'VIS', 'name' => 'Visível', 'status' => 'active', 'workspace_id' => $this->workspace->id]];

        $this->getJson("/api/infra/clients/{$this->pitruca->id}/overview")
            ->assertOk()
            ->assertJsonPath('projects', $expected);
        $this->getJson("/api/infra/software-products/{$this->school->id}/overview")
            ->assertOk()
            ->assertJsonPath('projects', $expected);

        // Admin global vê os dois.
        Sanctum::actingAs($this->userWithRole('admin'));
        $this->assertEqualsCanonicalizing(
            [$visible->id, $hidden->id],
            array_column($this->getJson("/api/infra/clients/{$this->pitruca->id}/overview")->json('projects'), 'id'),
        );
        $this->getJson("/api/infra/clients/{$this->ispaj->id}/overview")->assertOk()->assertJsonPath('projects', []);
    }
}
