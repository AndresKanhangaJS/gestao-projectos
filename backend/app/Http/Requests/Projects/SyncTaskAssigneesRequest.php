<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\Task;
use App\Rules\Projects\WorkspaceMember;
use Illuminate\Foundation\Http\FormRequest;

/** Os responsáveis têm de ser membros do workspace do projecto da tarefa. */
class SyncTaskAssigneesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->task());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'user_ids' => ['present', 'array'],
            'user_ids.*' => ['integer', 'distinct', new WorkspaceMember($this->task()->project->workspace)],
        ];
    }

    private function task(): Task
    {
        /** @var Task $task */
        $task = $this->route('task');

        return $task;
    }
}
