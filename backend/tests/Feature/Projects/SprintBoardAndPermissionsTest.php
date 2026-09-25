<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Sprint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\Models\Role;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

/** Kanban por sprint (`?sprint=`), `active_sprint`, `my_role` e `can` nas Resources. */
class SprintBoardAndPermissionsTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
    }

    public function test_tasks_can_be_filtered_by_active_sprint_backlog_or_all(): void
    {
        Sanctum::actingAs($this->owner);
        $active = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'active']);
        $planned = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'planned']);

        $inActive = $this->makeTask(['sprint_id' => $active->id, 'title' => 'Activo']);
        $inPlanned = $this->makeTask(['sprint_id' => $planned->id, 'title' => 'Planeado']);
        $backlog = $this->makeTask(['title' => 'Backlog']);

        $url = "/api/projects/{$this->project->id}/tasks";

        $this->assertSame([$inActive->id], array_column($this->getJson("{$url}?sprint=active")->assertOk()->json('data'), 'id'));
        $this->assertSame([$backlog->id], array_column($this->getJson("{$url}?sprint=backlog")->assertOk()->json('data'), 'id'));
        $this->assertEqualsCanonicalizing(
            [$inActive->id, $inPlanned->id, $backlog->id],
            array_column($this->getJson("{$url}?sprint=all")->assertOk()->json('data'), 'id'),
        );
        $this->assertCount(3, $this->getJson($url)->assertOk()->json('data'));
        $this->assertSame([$inPlanned->id], array_column($this->getJson("{$url}?sprint_id={$planned->id}")->json('data'), 'id'));

        $this->getJson("{$url}?sprint=bogus")->assertUnprocessable()->assertJsonValidationErrors('sprint');
    }

    public function test_active_filter_returns_empty_list_when_there_is_no_active_sprint(): void
    {
        Sanctum::actingAs($this->owner);
        $planned = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'planned']);
        $this->makeTask(['sprint_id' => $planned->id]);
        $this->makeTask();

        $this->getJson("/api/projects/{$this->project->id}/tasks?sprint=active")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_project_resource_exposes_active_sprint(): void
    {
        Sanctum::actingAs($this->owner);

        $this->getJson("/api/projects/{$this->project->id}")
            ->assertOk()
            ->assertJsonPath('data.active_sprint', null);

        $sprint = Sprint::factory()->create([
            'project_id' => $this->project->id,
            'name' => 'Sprint 7',
            'goal' => 'Fechar o MVP',
            'starts_at' => '2026-09-01',
            'ends_at' => '2026-09-14',
            'status' => 'active',
        ]);

        $this->getJson("/api/projects/{$this->project->id}")
            ->assertOk()
            ->assertJsonPath('data.active_sprint', [
                'id' => $sprint->id,
                'name' => 'Sprint 7',
                'starts_at' => '2026-09-01',
                'ends_at' => '2026-09-14',
                'goal' => 'Fechar o MVP',
            ]);

        $this->getJson("/api/projects/workspaces/{$this->workspace->id}/projects")
            ->assertOk()
            ->assertJsonPath('data.0.active_sprint.id', $sprint->id);
    }

    /**
     * @return array<string, array{0: WorkspaceRole|string|null, 1: string|null, 2: array<string, bool>}>
     */
    public static function permissionMatrix(): array
    {
        $all = ['create_task' => true, 'create_label' => true, 'delete_task' => true, 'manage_board' => true, 'manage_sprints' => true, 'manage_members' => true, 'update_project' => true];
        $none = ['create_task' => false, 'create_label' => false, 'delete_task' => false, 'manage_board' => false, 'manage_sprints' => false, 'manage_members' => false, 'update_project' => false];

        return [
            'owner' => [WorkspaceRole::Owner, 'owner', $all],
            'manager' => [WorkspaceRole::Manager, 'manager', $all],
            'member' => [WorkspaceRole::Member, 'member', [...$none, 'create_task' => true, 'create_label' => true]],
            'viewer' => [WorkspaceRole::Viewer, 'viewer', $none],
            'global admin (não membro)' => ['admin', null, $all],
            'global project_manager (não membro)' => ['project_manager', null, $all],
        ];
    }

    /**
     * @param  array<string, bool>  $expectedCan
     */
    #[DataProvider('permissionMatrix')]
    public function test_my_role_and_can_are_exposed_on_project_and_workspace(
        WorkspaceRole|string|null $role,
        ?string $expectedRole,
        array $expectedCan,
    ): void {
        if ($role instanceof WorkspaceRole) {
            $user = $role === WorkspaceRole::Owner ? $this->owner : $this->memberOf($this->workspace, $role);
        } else {
            Role::findOrCreate($role, 'web');
            $user = User::factory()->create();
            $user->assignRole($role);
        }
        Sanctum::actingAs($user);

        $this->getJson("/api/projects/{$this->project->id}")
            ->assertOk()
            ->assertJsonPath('data.my_role', $expectedRole)
            ->assertJsonPath('data.can', $expectedCan);

        // `can.update_project` corresponde ao que a API realmente permite.
        $this->patchJson("/api/projects/{$this->project->id}", ['description' => 'x'])
            ->assertStatus($expectedCan['update_project'] ? 200 : 403);

        $this->getJson("/api/projects/workspaces/{$this->workspace->id}/projects")
            ->assertOk()
            ->assertJsonPath('data.0.my_role', $expectedRole)
            ->assertJsonPath('data.0.can', $expectedCan);

        // O workspace acrescenta `create_project` (ProjectPolicy::create): mesma regra de gestão.
        $expectedWorkspaceCan = [
            ...array_diff_key($expectedCan, ['update_project' => true]),
            'create_project' => $expectedCan['manage_members'],
            'update_project' => $expectedCan['update_project'],
        ];

        $this->getJson("/api/projects/workspaces/{$this->workspace->id}")
            ->assertOk()
            ->assertJsonPath('data.my_role', $expectedRole)
            ->assertJsonPath('data.can', $expectedWorkspaceCan);

        $this->getJson('/api/projects/workspaces')
            ->assertOk()
            ->assertJsonPath('data.0.my_role', $expectedRole)
            ->assertJsonPath('data.0.can', $expectedWorkspaceCan);

        // `can.create_project` corresponde ao que a API realmente permite.
        $this->postJson("/api/projects/workspaces/{$this->workspace->id}/projects", ['key' => 'NEW'.$user->id, 'name' => 'Novo'])
            ->assertStatus($expectedWorkspaceCan['create_project'] ? 201 : 403);

        // ProjectResource não expõe create_project.
        $this->getJson("/api/projects/{$this->project->id}")->assertJsonMissingPath('data.can.create_project');
    }
}
