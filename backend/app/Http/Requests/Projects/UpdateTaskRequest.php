<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use App\Models\Projects\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

class UpdateTaskRequest extends FormRequest
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
        /** @var Task $task */
        $task = $this->route('task');
        $project = $task->project;

        return [
            'sprint_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('sprints', 'id')->where('project_id', $project->id),
            ],
            'parent_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::notIn([$task->id]),
                Rule::exists('tasks', 'id')->where('project_id', $project->id),
            ],
            'type' => ['sometimes', new Enum(TaskType::class)],
            'priority' => ['sometimes', new Enum(TaskPriority::class)],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'estimate' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'due_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:starts_at'],
            'label_ids' => ['sometimes', 'array'],
            'label_ids.*' => [
                'integer',
                'distinct',
                Rule::exists('labels', 'id')->where('project_id', $project->id),
            ],
        ];
    }
}
