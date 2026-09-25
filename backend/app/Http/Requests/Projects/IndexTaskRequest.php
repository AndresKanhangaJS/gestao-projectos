<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filtros de `GET /projects/{project}/tasks`: board_column_id, sprint_id,
 * sprint (active|backlog|all — por omissão todas), priority, type,
 * assignee_id, label_id (todos opcionais, combináveis).
 */
class IndexTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Project $project */
        $project = $this->route('project');

        return (bool) $this->user()?->can('view', $project);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'board_column_id' => ['nullable', 'integer', 'min:1'],
            'sprint_id' => ['nullable', 'integer', 'min:1'],
            'sprint' => ['nullable', 'string', Rule::in(Task::SPRINT_FILTERS)],
            'priority' => ['nullable', Rule::enum(TaskPriority::class)],
            'type' => ['nullable', Rule::enum(TaskType::class)],
            'assignee_id' => ['nullable', 'integer', 'min:1'],
            'label_id' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
