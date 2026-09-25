<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use App\Models\Projects\Project;
use App\Models\Projects\Task;
use App\Rules\Projects\OpenSprint;
use App\Rules\Projects\WorkspaceMember;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Project $project */
        $project = $this->route('project');

        return (bool) $this->user()?->can('create', [Task::class, $project]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Project $project */
        $project = $this->route('project');

        return [
            'board_column_id' => [
                'required',
                'integer',
                Rule::exists('board_columns', 'id')->where(
                    fn ($query) => $query->whereIn('board_id', $project->boards()->pluck('id'))
                ),
            ],
            'sprint_id' => [
                'bail',
                'nullable',
                'integer',
                Rule::exists('sprints', 'id')->where('project_id', $project->id),
                new OpenSprint,
            ],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('tasks', 'id')->where('project_id', $project->id),
            ],
            'type' => ['required', new Enum(TaskType::class)],
            'priority' => ['nullable', new Enum(TaskPriority::class)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'estimate' => ['nullable', 'numeric', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'position' => ['nullable', 'integer', 'min:0'],
            'label_ids' => ['sometimes', 'array'],
            'label_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('labels', 'id')->where('project_id', $project->id),
            ],
            // Responsáveis iniciais: têm de ser membros do workspace do projecto.
            'assignee_ids' => ['sometimes', 'array'],
            'assignee_ids.*' => ['integer', 'distinct', new WorkspaceMember($project->workspace)],
        ];
    }
}
