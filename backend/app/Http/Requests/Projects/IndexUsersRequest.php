<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Models\Projects\Workspace;
use Illuminate\Foundation\Http\FormRequest;

/**
 * `GET /projects/users?search=` — pesquisa de utilizadores para adicionar a um
 * workspace. Só para quem gere membros em pelo menos um workspace ou é
 * admin/project_manager global (WorkspacePolicy::searchUsers).
 */
class IndexUsersRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('searchUsers', Workspace::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function term(): ?string
    {
        $term = trim((string) $this->validated('search'));

        return $term === '' ? null : $term;
    }
}
