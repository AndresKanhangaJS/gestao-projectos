<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MoveTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Task $task */
        $task = $this->route('task');

        return (bool) $this->user()?->can('update', $task);
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
                'required',
                'integer',
                Rule::exists('board_columns', 'id')->where(
                    fn ($query) => $query->whereIn('board_id', $project->boards()->pluck('id'))
                ),
            ],
            'position' => ['required', 'integer', 'min:0'],
        ];
    }
}
