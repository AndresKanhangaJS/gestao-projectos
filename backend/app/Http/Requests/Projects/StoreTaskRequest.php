<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use App\Models\Projects\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
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
                'nullable',
                'integer',
                Rule::exists('sprints', 'id')->where('project_id', $project->id),
            ],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('tasks', 'id')->where('project_id', $project->id),
            ],
            'reporter_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
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
        ];
    }
}
