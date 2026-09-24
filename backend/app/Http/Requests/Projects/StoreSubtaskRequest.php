<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use App\Models\Projects\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

/** Criação de uma subtarefa a partir de `POST /tasks/{task}/subtasks`. */
class StoreSubtaskRequest extends FormRequest
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
            'board_column_id' => [
                'nullable',
                'integer',
                Rule::exists('board_columns', 'id')->where(
                    fn ($query) => $query->whereIn('board_id', $project->boards()->pluck('id'))
                ),
            ],
            'type' => ['nullable', new Enum(TaskType::class)],
            'priority' => ['nullable', new Enum(TaskPriority::class)],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'estimate' => ['nullable', 'numeric', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
        ];
    }
}
