<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\WorkspaceRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class SyncWorkspaceMembersRequest extends FormRequest
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
            'members' => ['present', 'array'],
            'members.*.user_id' => ['required', 'integer', 'exists:users,id'],
            'members.*.role' => ['required', new Enum(WorkspaceRole::class)],
        ];
    }
}
