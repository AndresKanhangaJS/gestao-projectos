<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\TaskRelationType;
use App\Models\Projects\Task;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;

/**
 * A tarefa relacionada tem de pertencer a um projecto do MESMO workspace da
 * tarefa de origem e tem de ser visível ao utilizador (TaskPolicy::view).
 * Caso contrário devolve 422 com uma mensagem genérica — nunca revela se a
 * tarefa existe noutro workspace.
 */
class StoreTaskRelationRequest extends FormRequest
{
    private const string NOT_ACCESSIBLE = 'A tarefa relacionada não existe ou não pertence ao mesmo workspace.';

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

        return [
            'related_task_id' => [
                'required',
                'integer',
                Rule::notIn([$task->id]),
                function (string $attribute, mixed $value, Closure $fail) use ($task): void {
                    $related = Task::query()->with('project.workspace')->find((int) $value);

                    if ($related === null
                        || $related->project->workspace_id !== $task->project->workspace_id
                        || ! $this->user()?->can('view', $related)) {
                        $fail(self::NOT_ACCESSIBLE);
                    }
                },
                Rule::unique('task_relations', 'related_task_id')
                    ->where('task_id', $task->id)
                    ->where('type', (string) $this->input('type')),
            ],
            'type' => ['required', new Enum(TaskRelationType::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'related_task_id.not_in' => 'Uma tarefa não pode estar relacionada consigo própria.',
            'related_task_id.unique' => 'Esta relação já existe.',
        ];
    }
}
