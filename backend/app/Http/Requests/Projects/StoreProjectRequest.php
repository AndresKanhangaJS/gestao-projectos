<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\ProjectStatus;
use App\Http\Requests\Projects\Concerns\ValidatesProjectLinks;
use App\Models\Projects\Project;
use App\Models\Projects\Workspace;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Validator;

class StoreProjectRequest extends FormRequest
{
    use ValidatesProjectLinks;

    public function authorize(): bool
    {
        /** @var Workspace $workspace */
        $workspace = $this->route('workspace');

        return (bool) $this->user()?->can('create', [Project::class, $workspace]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'key' => ['required', 'string', 'max:20', Rule::unique('projects', 'key')],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['nullable', new Enum(ProjectStatus::class)],
            ...$this->projectLinkRules(),
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            fn (Validator $validator) => $this->validateProjectLinks($validator, null),
        ];
    }
}
