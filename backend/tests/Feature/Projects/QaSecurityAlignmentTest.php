<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\ActivityLog;
use App\Models\Projects\Workspace;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Feature\Infra\Concerns\CreatesInfraRoles;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

/** Etiquetas, criação de workspaces, papel owner, reporter_id e limpeza de responsáveis. */
class QaSecurityAlignmentTest extends TestCase
{
    use BuildsProjectContext, CreatesInfraRoles, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
    }

    // --- Etiquetas -----------------------------------------------------------

    public function test_members_can_create_labels_but_only_managers_edit_or_delete(): void
    {
        $member = $this->memberOf($this->workspace, WorkspaceRole::Member);
        Sanctum::actingAs($member);

        $labelId = $this->postJson("/api/projects/{$this->project->id}/labels", ['name' => 'frontend'])
            ->assertCreated()
            ->json('data.id');

        $this->patchJson("/api/projects/labels/{$labelId}", ['name' => 'x'])->assertForbidden();
        $this->deleteJson("/api/projects/labels/{$labelId}")->assertForbidden();

        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Viewer));
        $this->postJson("/api/projects/{$this->project->id}/labels", ['name' => 'v'])->assertForbidden();

        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Manager));
        $this->patchJson("/api/projects/labels/{$labelId}", ['name' => 'ui'])->assertOk()->assertJsonPath('data.name', 'ui');
        $this->deleteJson("/api/projects/labels/{$labelId}")->assertNoContent();
        $this->assertDatabaseMissing('labels', ['id' => $labelId]);
    }

    // --- Criação de workspaces -------------------------------------------------

    public function test_only_global_admin_or_project_manager_can_create_workspaces(): void
    {
        foreach ([User::factory()->create(), $this->userWithRole('member'), $this->userWithRole('infra'), $this->owner] as $user) {
            Sanctum::actingAs($user);
            $this->postJson('/api/projects/workspaces', ['name' => ['invalido']])->assertForbidden();
        }

        foreach (['admin', 'project_manager'] as $role) {
            Sanctum::actingAs($this->userWithRole($role));
            $this->postJson('/api/projects/workspaces', ['name' => "WS {$role}"])
                ->assertCreated()
                ->assertJsonPath('data.my_role', 'owner');
        }
    }

    public function test_me_exposes_global_roles_for_the_frontend(): void
    {
        Sanctum::actingAs($this->userWithRole('project_manager'));

        $this->getJson('/api/me')->assertOk()->assertJsonPath('roles', ['project_manager']);
    }

    // --- Papel owner na sync de membros -------------------------------------

    public function test_only_workspace_owner_or_admin_can_grant_owner_role(): void
    {
        $manager = $this->memberOf($this->workspace, WorkspaceRole::Manager);
        $candidate = $this->memberOf($this->workspace, WorkspaceRole::Member);
        $url = "/api/projects/workspaces/{$this->workspace->id}/members";
        $payload = ['members' => [
            ['user_id' => $this->owner->id, 'role' => 'owner'],
            ['user_id' => $manager->id, 'role' => 'manager'],
            ['user_id' => $candidate->id, 'role' => 'owner'],
        ]];

        foreach ([$manager, $this->userWithRole('project_manager')] as $actor) {
            Sanctum::actingAs($actor);
            $this->putJson($url, $payload)
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['members.2.role' => 'Só o dono do workspace ou um administrador pode atribuir o papel de dono.']);
        }

        // Manager pode gravar a lista mantendo o dono actual como owner.
        Sanctum::actingAs($manager);
        $this->putJson($url, ['members' => [
            ['user_id' => $this->owner->id, 'role' => 'owner'],
            ['user_id' => $manager->id, 'role' => 'manager'],
            ['user_id' => $candidate->id, 'role' => 'member'],
        ]])->assertOk();

        Sanctum::actingAs($this->owner);
        $this->putJson($url, $payload)->assertOk();
        $this->assertDatabaseHas('workspace_user', ['workspace_id' => $this->workspace->id, 'user_id' => $candidate->id, 'role' => 'owner']);

        $other = $this->memberOf($this->workspace, WorkspaceRole::Member);
        Sanctum::actingAs($this->userWithRole('admin'));
        $this->putJson($url, ['members' => [...$payload['members'], ['user_id' => $other->id, 'role' => 'owner']]])->assertOk();
    }

    // --- reporter_id ---------------------------------------------------------

    public function test_reporter_is_always_the_authenticated_user(): void
    {
        $member = $this->memberOf($this->workspace, WorkspaceRole::Member);
        Sanctum::actingAs($member);

        $taskId = $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'Quem reporta?',
            'reporter_id' => $this->owner->id,
        ])->assertCreated()->json('data.id');

        $this->assertDatabaseHas('tasks', ['id' => $taskId, 'reporter_id' => $member->id]);
    }

    // --- Limpeza de responsáveis ao remover/despromover membros ---------------

    public function test_removed_or_viewer_members_are_unassigned_with_activity(): void
    {
        $alice = $this->memberOf($this->workspace, WorkspaceRole::Member);
        $bruno = $this->memberOf($this->workspace, WorkspaceRole::Member);
        $carla = $this->memberOf($this->workspace, WorkspaceRole::Member);

        $t1 = $this->makeTask(['title' => 'T1']);
        $t2 = $this->makeTask(['title' => 'T2']);
        $t3 = $this->makeTask(['title' => 'T3']);
        $t1->assignees()->attach([$alice->id, $carla->id]);
        $t2->assignees()->attach([$bruno->id]);
        $t3->assignees()->attach([$carla->id]);

        Sanctum::actingAs($this->owner);
        $this->putJson("/api/projects/workspaces/{$this->workspace->id}/members", ['members' => [
            ['user_id' => $this->owner->id, 'role' => 'owner'],
            ['user_id' => $bruno->id, 'role' => 'viewer'],   // despromovido a leitor
            ['user_id' => $carla->id, 'role' => 'member'],   // mantém-se
            // alice removida
        ]])->assertOk();

        $this->assertSame([$carla->id], $t1->assignees()->pluck('users.id')->all());
        $this->assertSame([], $t2->assignees()->pluck('users.id')->all());
        $this->assertSame([$carla->id], $t3->assignees()->pluck('users.id')->all());

        $logs = ActivityLog::query()->where('event', 'assignees_changed')->get();
        $this->assertCount(2, $logs);
        $byTask = $logs->keyBy('subject_id');
        $this->assertSame($this->owner->id, $byTask[$t1->id]->causer_id);
        $this->assertSame([$alice->id], array_column($byTask[$t1->id]->changes['assignees']['removed'], 'id'));
        $this->assertSame([$bruno->id], array_column($byTask[$t2->id]->changes['assignees']['removed'], 'id'));
    }

    public function test_tasks_of_other_workspaces_are_untouched(): void
    {
        $alice = $this->memberOf($this->workspace, WorkspaceRole::Member);
        $task = $this->makeTask();
        $task->assignees()->attach($alice->id);

        $otherOwner = User::factory()->create();
        $other = Workspace::factory()->create(['owner_id' => $otherOwner->id]);
        $other->members()->attach([$otherOwner->id => ['role' => 'owner'], $alice->id => ['role' => 'member']]);

        Sanctum::actingAs($otherOwner);
        $this->putJson("/api/projects/workspaces/{$other->id}/members", ['members' => [
            ['user_id' => $otherOwner->id, 'role' => 'owner'],
        ]])->assertOk();

        $this->assertSame([$alice->id], $task->assignees()->pluck('users.id')->all());
    }
}
