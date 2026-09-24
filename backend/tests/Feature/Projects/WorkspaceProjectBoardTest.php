<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorkspaceProjectBoardTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_workspace_project_board_and_column(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $workspaceResponse = $this->postJson('/api/projects/workspaces', [
            'name' => 'Equipa Web',
            'description' => 'Workspace de testes',
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Equipa Web')
            ->assertJsonPath('data.owner.id', $user->id);

        $workspaceId = $workspaceResponse->json('data.id');
        $this->assertDatabaseHas('workspaces', ['id' => $workspaceId, 'owner_id' => $user->id]);
        $this->assertDatabaseHas('workspace_user', [
            'workspace_id' => $workspaceId,
            'user_id' => $user->id,
            'role' => 'owner',
        ]);

        $projectResponse = $this->postJson("/api/projects/workspaces/{$workspaceId}/projects", [
            'key' => 'WEB',
            'name' => 'Portal do Cliente',
        ])->assertCreated()
            ->assertJsonPath('data.key', 'WEB')
            ->assertJsonPath('data.status', 'active');

        $projectId = $projectResponse->json('data.id');
        $this->assertDatabaseHas('projects', ['id' => $projectId, 'workspace_id' => $workspaceId]);

        $boardResponse = $this->postJson("/api/projects/{$projectId}/boards", [
            'name' => 'Quadro Principal',
            'is_default' => true,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'Quadro Principal');

        $boardId = $boardResponse->json('data.id');
        $this->assertDatabaseHas('boards', ['id' => $boardId, 'project_id' => $projectId]);

        $columnResponse = $this->postJson("/api/projects/boards/{$boardId}/columns", [
            'name' => 'A Fazer',
            'position' => 0,
        ])->assertCreated()
            ->assertJsonPath('data.name', 'A Fazer');

        $this->assertDatabaseHas('board_columns', [
            'id' => $columnResponse->json('data.id'),
            'board_id' => $boardId,
        ]);
    }

    public function test_user_without_workspace_membership_cannot_create_project(): void
    {
        $owner = User::factory()->create();
        $outsider = User::factory()->create();

        Sanctum::actingAs($owner);
        $workspaceId = $this->postJson('/api/projects/workspaces', ['name' => 'Equipa Privada'])
            ->assertCreated()
            ->json('data.id');

        Sanctum::actingAs($outsider);
        $this->postJson("/api/projects/workspaces/{$workspaceId}/projects", [
            'key' => 'PRIV',
            'name' => 'Projecto Privado',
        ])->assertForbidden();
    }
}
