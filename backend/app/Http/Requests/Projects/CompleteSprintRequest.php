<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\SprintStatus;
use App\Models\Projects\Sprint;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * `POST /projects/sprints/{sprint}/complete`
 * `{ move_unfinished_to: 'backlog'|'sprint', target_sprint_id?: int }`.
 * `target_sprint_id` é obrigatório se `sprint` e tem de ser um sprint
 * PLANEADO do mesmo projecto.
 */
class CompleteSprintRequest extends FormRequest
{
    public const string MOVE_TO_BACKLOG = 'backlog';

    public const string MOVE_TO_SPRINT = 'sprint';

    public const string ALREADY_COMPLETED = 'O sprint já está concluído.';

    public const string INVALID_TARGET = 'O sprint de destino tem de ser um sprint planeado deste projecto.';

    public function authorize(): bool
    {
        return (bool) $this->user()?->can('manageSprints', $this->sprint()->project);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $sprint = $this->sprint();

        return [
            'move_unfinished_to' => ['required', Rule::in([self::MOVE_TO_BACKLOG, self::MOVE_TO_SPRINT])],
            'target_sprint_id' => [
                'bail',
                'nullable',
                Rule::requiredIf($this->input('move_unfinished_to') === self::MOVE_TO_SPRINT),
                Rule::prohibitedIf($this->input('move_unfinished_to') === self::MOVE_TO_BACKLOG),
                'integer',
                Rule::exists('sprints', 'id')
                    ->where('project_id', $sprint->project_id)
                    ->where('status', SprintStatus::Planned->value)
                    ->whereNot('id', $sprint->id),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'target_sprint_id.exists' => self::INVALID_TARGET,
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->sprint()->status === SprintStatus::Completed) {
                    $validator->errors()->add('sprint', self::ALREADY_COMPLETED);
                }
            },
        ];
    }

    public function targetSprint(): ?Sprint
    {
        $id = $this->validated('target_sprint_id');

        return $this->validated('move_unfinished_to') === self::MOVE_TO_SPRINT && $id !== null
            ? Sprint::query()->findOrFail((int) $id)
            : null;
    }

    public function sprint(): Sprint
    {
        /** @var Sprint $sprint */
        $sprint = $this->route('sprint');

        return $sprint;
    }
}
