<?php

declare(strict_types=1);

namespace App\Rules\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Workspace;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * O utilizador indicado tem de poder ser responsável por tarefas no
 * workspace: membro da pivot `workspace_user` com papel owner|manager|member.
 * Viewers são só leitores (não editam/movem tarefas), logo não são elegíveis.
 * Papéis globais (admin/project_manager) NÃO tornam um utilizador elegível
 * automaticamente.
 */
class WorkspaceMember implements ValidationRule
{
    public const string MESSAGE = 'O utilizador não é membro deste workspace.';

    public const string VIEWER_MESSAGE = 'O utilizador não pode ser responsável: é apenas leitor neste workspace.';

    public function __construct(private readonly Workspace $workspace) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $member = is_numeric($value)
            ? $this->workspace->members()->where('users.id', (int) $value)->first()
            : null;

        $role = $member?->getAttribute('pivot')?->getAttribute('role');

        if ($role === null) {
            $fail(self::MESSAGE);

            return;
        }

        if ($role === WorkspaceRole::Viewer->value) {
            $fail(self::VIEWER_MESSAGE);
        }
    }
}
