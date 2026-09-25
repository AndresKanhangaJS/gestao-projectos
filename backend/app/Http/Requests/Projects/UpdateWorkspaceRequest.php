<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\Workspace;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkspaceRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Workspace $workspace */
        $workspace = $this->route('workspace');

        return (bool) $this->user()?->can('update', $workspace);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $workspace = $this->route('workspace');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:255', 'alpha_dash', Rule::unique('workspaces', 'slug')->ignore($workspace)],
            'description' => ['sometimes', 'nullable', 'string'],
        ];
    }
}
