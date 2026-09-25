<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

/** Gestão de membros do workspace + pesquisa de utilizadores (`GET /projects/users`). */
class WorkspaceMembersTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
    }

    private function globalUser(string $role): User
    {
        Role::findOrCreate($role, 'web');
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    public function test_workspace_resource_lists_members_with_role(): void
    {
        $member = $this->memberOf($this->workspace, WorkspaceRole::Member);
        Sanctum::actingAs($this->owner);

        $members = $this->getJson("/api/projects/workspaces/{$this->workspace->id}")
            ->assertOk()
            ->json('data.members');

        $this->assertEqualsCanonicalizing([
            ['id' => $this->owner->id, 'name' => $this->owner->name, 'email' => $this->owner->email, 'role' => 'owner'],
            ['id' => $member->id, 'name' => $member->name, 'email' => $member->email, 'role' => 'member'],
        ], $members);
    }

    public function test_manager_can_sync_members_with_user_id_and_role_payload(): void
    {
        $manager = $this->memberOf($this->workspace, WorkspaceRole::Manager);
        $newcomer = User::factory()->create();
        Sanctum::actingAs($manager);

        $this->putJson("/api/projects/workspaces/{$this->workspace->id}/members", [
            'members' => [
                ['user_id' => $this->owner->id, 'role' => 'owner'],
                ['user_id' => $manager->id, 'role' => 'manager'],
                ['user_id' => $newcomer->id, 'role' => 'viewer'],
            ],
        ])->assertOk()
            ->assertJsonCount(3, 'data.members')
            ->assertJsonFragment(['id' => $newcomer->id, 'role' => 'viewer']);

        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $this->workspace->id, 'user_id' => $newcomer->id, 'role' => 'viewer',
        ]);
    }

    public function test_owner_cannot_be_removed_or_demoted_except_by_admin(): void
    {
        $manager = $this->memberOf($this->workspace, WorkspaceRole::Manager);
        $url = "/api/projects/workspaces/{$this->workspace->id}/members";

        foreach ([$manager, $this->globalUser('project_manager'), $this->owner] as $actor) {
            Sanctum::actingAs($actor);

            // Remover o dono.
            $this->putJson($url, ['members' => [['user_id' => $manager->id, 'role' => 'manager']]])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['members' => 'O dono do workspace não pode ser removido nem despromovido.']);

            // Despromover o dono.
            $this->putJson($url, ['members' => [
                ['user_id' => $this->owner->id, 'role' => 'manager'],
                ['user_id' => $manager->id, 'role' => 'manager'],
            ]])->assertUnprocessable()->assertJsonValidationErrors('members');
        }

        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $this->workspace->id, 'user_id' => $this->owner->id, 'role' => 'owner',
        ]);

        Sanctum::actingAs($this->globalUser('admin'));
        $this->putJson($url, ['members' => [
            ['user_id' => $this->owner->id, 'role' => 'member'],
            ['user_id' => $manager->id, 'role' => 'manager'],
        ]])->assertOk();

        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $this->workspace->id, 'user_id' => $this->owner->id, 'role' => 'member',
        ]);
    }

    public function test_member_cannot_sync_members(): void
    {
        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Member));

        $this->putJson("/api/projects/workspaces/{$this->workspace->id}/members", ['members' => 'invalid'])
            ->assertForbidden();
    }

    public function test_user_search_is_paginated_and_filtered(): void
    {
        User::factory()->count(25)->create();
        $rita = User::factory()->create(['name' => 'Rita Zyxwqk', 'email' => 'rita.zyxwqk@example.test']);
        Sanctum::actingAs($this->owner);

        $this->getJson('/api/projects/users')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('meta.per_page', 20)
            ->assertJsonPath('meta.total', 27)
            ->assertJsonStructure(['data' => [['id', 'name', 'email']], 'links', 'meta']);

        $this->getJson('/api/projects/users?search=zyxwqk')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0', ['id' => $rita->id, 'name' => 'Rita Zyxwqk', 'email' => 'rita.zyxwqk@example.test']);

        $this->getJson('/api/projects/users?search=rita.zyxwqk@')
            ->assertOk()
            ->assertJsonPath('data.0.id', $rita->id)
            ->assertJsonCount(1, 'data');
    }

    public function test_user_search_access_rules(): void
    {
        // Manager de algum workspace: pode.
        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Manager));
        $this->getJson('/api/projects/users')->assertOk();

        // Membro/viewer (sem gestão em nenhum workspace): 403.
        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Member));
        $this->getJson('/api/projects/users')->assertForbidden();
        Sanctum::actingAs($this->memberOf($this->workspace, WorkspaceRole::Viewer));
        $this->getJson('/api/projects/users')->assertForbidden();
        Sanctum::actingAs(User::factory()->create());
        $this->getJson('/api/projects/users')->assertForbidden();

        // Papéis globais: podem.
        Sanctum::actingAs($this->globalUser('admin'));
        $this->getJson('/api/projects/users')->assertOk();
        Sanctum::actingAs($this->globalUser('project_manager'));
        $this->getJson('/api/projects/users')->assertOk();
    }

    public function test_user_search_requires_authentication(): void
    {
        $this->getJson('/api/projects/users')->assertUnauthorized();
    }
}
