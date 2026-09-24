<?php

declare(strict_types=1);

namespace Tests\Feature\Projects\Concerns;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Board;
use App\Models\Projects\BoardColumn;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Models\Projects\Workspace;
use App\Models\User;

/**
 * Workspace + projecto + quadro com colunas "Por fazer"/"Concluído", e um
 * utilizador dono do workspace. Útil para Feature tests do módulo Projects.
 */
trait BuildsProjectContext
{
    protected User $owner;

    protected Workspace $workspace;

    protected Project $project;

    protected Board $board;

    protected BoardColumn $todoColumn;

    protected BoardColumn $doneColumn;

    protected function buildProjectContext(): void
    {
        $this->owner = User::factory()->create();

        $this->workspace = Workspace::factory()->create(['owner_id' => $this->owner->id]);
        $this->workspace->members()->attach($this->owner->id, ['role' => WorkspaceRole::Owner->value]);

        $this->project = Project::factory()->create(['workspace_id' => $this->workspace->id, 'status' => 'active']);
        $this->board = Board::factory()->create(['project_id' => $this->project->id, 'is_default' => true]);

        $this->todoColumn = BoardColumn::factory()->create([
            'board_id' => $this->board->id, 'name' => 'Por fazer', 'position' => 0, 'is_done_column' => false,
        ]);
        $this->doneColumn = BoardColumn::factory()->create([
            'board_id' => $this->board->id, 'name' => 'Concluído', 'position' => 1, 'is_done_column' => true,
        ]);
    }

    protected function memberOf(Workspace $workspace, WorkspaceRole $role = WorkspaceRole::Member): User
    {
        $user = User::factory()->create();
        $workspace->members()->attach($user->id, ['role' => $role->value]);

        return $user;
    }

    /** @param  array<string, mixed>  $attributes */
    protected function makeTask(array $attributes = []): Task
    {
        return Task::factory()->create([
            'project_id' => $this->project->id,
            'board_column_id' => $this->todoColumn->id,
            'sprint_id' => null,
            'parent_id' => null,
            'reporter_id' => $this->owner->id,
            ...$attributes,
        ]);
    }
}
