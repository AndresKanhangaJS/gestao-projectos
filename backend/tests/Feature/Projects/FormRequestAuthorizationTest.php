<?php

declare(strict_types=1);

namespace Tests\Feature\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Label;
use App\Models\Projects\Sprint;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Feature\Projects\Concerns\BuildsProjectContext;
use Tests\TestCase;

/**
 * A autorização vive no `authorize()` das Form Requests (via Policies): um
 * utilizador sem permissão recebe 403 mesmo com um payload inválido (a
 * autorização corre antes da validação — nunca 422 a quem não pode agir).
 */
class FormRequestAuthorizationTest extends TestCase
{
    use BuildsProjectContext, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buildProjectContext();
    }

    /**
     * Endpoints de escrita que um viewer do workspace NÃO pode usar.
     * Payload propositadamente inválido (`[]` ou valores errados).
     *
     * @return array<string, array{0: string, 1: string}>
     */
    public static function viewerForbiddenEndpoints(): array
    {
        return [
            'update workspace' => ['PUT', '/api/projects/workspaces/{workspace}'],
            'sync workspace members' => ['PUT', '/api/projects/workspaces/{workspace}/members'],
            'store project' => ['POST', '/api/projects/workspaces/{workspace}/projects'],
            'update project' => ['PUT', '/api/projects/{project}'],
            'store board' => ['POST', '/api/projects/{project}/boards'],
            'update board' => ['PUT', '/api/projects/boards/{board}'],
            'store column' => ['POST', '/api/projects/boards/{board}/columns'],
            'update column' => ['PUT', '/api/projects/columns/{column}'],
            'store sprint' => ['POST', '/api/projects/{project}/sprints'],
            'update sprint' => ['PUT', '/api/projects/sprints/{sprint}'],
            'store label' => ['POST', '/api/projects/{project}/labels'],
            'update label' => ['PUT', '/api/projects/labels/{label}'],
            'store task' => ['POST', '/api/projects/{project}/tasks'],
            'update task' => ['PUT', '/api/projects/tasks/{task}'],
            'move task' => ['POST', '/api/projects/tasks/{task}/move'],
            'store subtask' => ['POST', '/api/projects/tasks/{task}/subtasks'],
            'sync assignees' => ['PUT', '/api/projects/tasks/{task}/assignees'],
            'store relation' => ['POST', '/api/projects/tasks/{task}/relations'],
            'store attachment' => ['POST', '/api/projects/tasks/{task}/attachments'],
        ];
    }

    #[DataProvider('viewerForbiddenEndpoints')]
    public function test_viewer_gets_403_even_with_invalid_payload(string $method, string $uri): void
    {
        $viewer = $this->memberOf($this->workspace, WorkspaceRole::Viewer);
        Sanctum::actingAs($viewer);

        $this->json($method, $this->resolveUri($uri), ['name' => ['not-a-string'], 'status' => 'bogus'])
            ->assertForbidden();
    }

    /**
     * Um estranho ao workspace nem sequer pode comentar/listar (TaskPolicy::view).
     *
     * @return array<string, array{0: string, 1: string}>
     */
    public static function outsiderForbiddenEndpoints(): array
    {
        return [
            ...self::viewerForbiddenEndpoints(),
            'store comment' => ['POST', '/api/projects/tasks/{task}/comments'],
            'index tasks' => ['GET', '/api/projects/{project}/tasks?priority=bogus'],
        ];
    }

    #[DataProvider('outsiderForbiddenEndpoints')]
    public function test_outsider_gets_403_even_with_invalid_payload(string $method, string $uri): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->json($method, $this->resolveUri($uri), ['body' => ['x']])->assertForbidden();
    }

    public function test_viewer_can_still_comment_but_gets_422_on_invalid_payload(): void
    {
        $viewer = $this->memberOf($this->workspace, WorkspaceRole::Viewer);
        Sanctum::actingAs($viewer);
        $task = $this->makeTask();

        $this->postJson("/api/projects/tasks/{$task->id}/comments", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');
    }

    public function test_member_can_create_tasks_but_not_manage_board_or_sprints(): void
    {
        $member = $this->memberOf($this->workspace, WorkspaceRole::Member);
        Sanctum::actingAs($member);

        $this->postJson("/api/projects/{$this->project->id}/tasks", [
            'board_column_id' => $this->todoColumn->id,
            'type' => 'task',
            'title' => 'Criada por membro',
        ])->assertCreated();

        $this->postJson("/api/projects/boards/{$this->board->id}/columns", ['name' => 'Nova'])->assertForbidden();
        $this->postJson("/api/projects/{$this->project->id}/sprints", ['name' => 'S1'])->assertForbidden();
        $this->deleteJson("/api/projects/columns/{$this->todoColumn->id}")->assertForbidden();
    }

    private function resolveUri(string $uri): string
    {
        $task = $this->makeTask();
        $sprint = Sprint::factory()->create(['project_id' => $this->project->id, 'status' => 'planned']);
        $label = Label::factory()->create(['project_id' => $this->project->id]);

        return strtr($uri, [
            '{workspace}' => (string) $this->workspace->id,
            '{project}' => (string) $this->project->id,
            '{board}' => (string) $this->board->id,
            '{column}' => (string) $this->todoColumn->id,
            '{sprint}' => (string) $sprint->id,
            '{label}' => (string) $label->id,
            '{task}' => (string) $task->id,
        ]);
    }
}
