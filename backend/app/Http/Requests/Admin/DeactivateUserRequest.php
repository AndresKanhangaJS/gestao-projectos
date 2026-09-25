<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\GlobalRole;
use App\Models\User;
use App\Services\UserAccountService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

/** Salvaguardas (422 em `user`): não se desactivar a si próprio; nunca ficar sem admin activo. */
class DeactivateUserRequest extends FormRequest
{
    public const string CANNOT_DEACTIVATE_SELF = 'Não pode desactivar a sua própria conta.';

    public function authorize(): bool
    {
        return (bool) $this->user()?->can('deactivate', $this->target());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $target = $this->target();

                if ($target->is($this->user())) {
                    $validator->errors()->add('user', self::CANNOT_DEACTIVATE_SELF);

                    return;
                }

                if ($target->is_active
                    && $target->hasRole(GlobalRole::Admin->value)
                    && app(UserAccountService::class)->activeAdminCount($target) === 0) {
                    $validator->errors()->add('user', UpdateUserRequest::LAST_ACTIVE_ADMIN);
                }
            },
        ];
    }

    private function target(): User
    {
        /** @var User $user */
        $user = $this->route('user');

        return $user;
    }
}
