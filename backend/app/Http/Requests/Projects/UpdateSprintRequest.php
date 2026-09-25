<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\SprintStatus;
use App\Models\Projects\Sprint;
use App\Rules\Projects\SingleActiveSprint;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpdateSprintRequest extends FormRequest
{
    public const string USE_COMPLETE_ACTION = 'Use a acção Concluir sprint.';

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
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'goal' => ['sometimes', 'nullable', 'string'],
            'starts_at' => ['sometimes', 'nullable', 'date'],
            'ends_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:starts_at'],
            'status' => [
                'sometimes',
                'nullable',
                new Enum(SprintStatus::class),
                new SingleActiveSprint($sprint->project, $sprint),
                // Concluir tem efeitos (mover tarefas pendentes): só pela acção dedicada.
                function (string $attribute, mixed $value, Closure $fail) use ($sprint): void {
                    if ($value === SprintStatus::Completed->value && $sprint->status !== SprintStatus::Completed) {
                        $fail(self::USE_COMPLETE_ACTION);
                    }
                },
            ],
        ];
    }

    private function sprint(): Sprint
    {
        /** @var Sprint $sprint */
        $sprint = $this->route('sprint');

        return $sprint;
    }
}
