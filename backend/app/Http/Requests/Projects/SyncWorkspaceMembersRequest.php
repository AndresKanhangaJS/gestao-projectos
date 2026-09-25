<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects;

use App\Enums\Projects\WorkspaceRole;
use App\Models\Projects\Workspace;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;
use Illuminate\Validation\Validator;

/**
 * `PUT /projects/workspaces/{workspace}/members` — substitui a lista completa
 * de membros: `{ members: [{ user_id, role }] }`.
 *
 * O dono do workspace (`workspaces.owner_id`) tem de continuar na lista com
 * papel `owner`: só um `admin` global o pode remover ou despromover (422).
 */
class SyncWorkspaceMembersRequest extends FormRequest
{
    public const string OWNER_PROTECTED = 'O dono do workspace não pode ser removido nem despromovido.';

    public const string OWNER_ROLE_FORBIDDEN = 'Só o dono do workspace ou um administrador pode atribuir o papel de dono.';

    public function authorize(): bool
    {
        return (bool) $this->user()?->can('manageMembers', $this->workspace());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'members' => ['present', 'array'],
            'members.*.user_id' => ['required', 'integer', 'distinct', 'exists:users,id'],
            'members.*.role' => ['required', new Enum(WorkspaceRole::class)],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $this->ensureOwnerRoleOnlyGrantedByOwner($validator);

                if ($this->user()?->hasRole('admin')) {
                    return;
                }

                $ownerId = $this->workspace()->owner_id;
                $ownerEntry = collect((array) $this->input('members'))
                    ->first(fn (mixed $member): bool => is_array($member) && (int) ($member['user_id'] ?? 0) === (int) $ownerId);

                if ($ownerEntry === null || ($ownerEntry['role'] ?? null) !== WorkspaceRole::Owner->value) {
                    $validator->errors()->add('members', self::OWNER_PROTECTED);
                }
            },
        ];
    }

    /**
     * Atribuir `owner` a quem ainda não o é (promoção) exige WorkspacePolicy::assignOwnerRole.
     * Manter o(s) dono(s) actual(is) como `owner` é sempre permitido.
     */
    private function ensureOwnerRoleOnlyGrantedByOwner(Validator $validator): void
    {
        $workspace = $this->workspace();

        if ($this->user()?->can('assignOwnerRole', $workspace)) {
            return;
        }

        $currentOwners = $workspace->members()
            ->wherePivot('role', WorkspaceRole::Owner->value)
            ->pluck('users.id')
            ->map(fn ($id): int => (int) $id)
            ->all();

        foreach ((array) $this->input('members') as $index => $member) {
            if (is_array($member)
                && ($member['role'] ?? null) === WorkspaceRole::Owner->value
                && ! in_array((int) ($member['user_id'] ?? 0), $currentOwners, true)) {
                $validator->errors()->add("members.{$index}.role", self::OWNER_ROLE_FORBIDDEN);
            }
        }
    }

    private function workspace(): Workspace
    {
        /** @var Workspace $workspace */
        $workspace = $this->route('workspace');

        return $workspace;
    }
}
