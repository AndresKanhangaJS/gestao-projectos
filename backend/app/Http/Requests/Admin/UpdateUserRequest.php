<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Enums\GlobalRole;
use App\Models\User;
use App\Services\UserAccountService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Salvaguardas (422 em `roles`): o admin não retira o seu próprio papel
 * `admin`; tem de ficar sempre pelo menos um admin activo.
 */
class UpdateUserRequest extends FormRequest
{
    public const string CANNOT_REMOVE_OWN_ADMIN = 'Não pode retirar o seu próprio papel de administrador.';

    public const string LAST_ACTIVE_ADMIN = 'Tem de existir sempre pelo menos um administrador activo.';

    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->target());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->target())],
            'roles' => ['sometimes', 'required', 'array', 'min:1'],
            'roles.*' => ['string', 'distinct', Rule::in(GlobalRole::assignableValues())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'roles.*.in' => 'Papel inválido ou não atribuível.',
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty() || ! $this->has('roles')) {
                    return;
                }

                $target = $this->target();
                $keepsAdmin = in_array(GlobalRole::Admin->value, (array) $this->input('roles'), true);

                if ($keepsAdmin || ! $target->hasRole(GlobalRole::Admin->value)) {
                    return;
                }

                if ($target->is($this->user())) {
                    $validator->errors()->add('roles', self::CANNOT_REMOVE_OWN_ADMIN);
                } elseif ($target->is_active && app(UserAccountService::class)->activeAdminCount($target) === 0) {
                    $validator->errors()->add('roles', self::LAST_ACTIVE_ADMIN);
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
