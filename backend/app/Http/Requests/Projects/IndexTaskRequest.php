<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\TaskPriority;
use App\Enums\Projects\TaskType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filtros de `GET /projects/{project}/tasks`: board_column_id, sprint_id,
 * priority, type, assignee_id, label_id (todos opcionais, combináveis).
 */
class IndexTaskRequest extends FormRequest
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
        return [
            'board_column_id' => ['nullable', 'integer', 'min:1'],
            'sprint_id' => ['nullable', 'integer', 'min:1'],
            'priority' => ['nullable', Rule::enum(TaskPriority::class)],
            'type' => ['nullable', Rule::enum(TaskType::class)],
            'assignee_id' => ['nullable', 'integer', 'min:1'],
            'label_id' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
