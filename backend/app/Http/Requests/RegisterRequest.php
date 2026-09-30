<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public const string REGISTRATION_DISABLED_MESSAGE = 'O registo público está desactivado. Peça a um administrador para criar a sua conta.';

    /**
     * Corre antes da validação: com o registo desligado responde 403 sem
     * validar os dados (não revela se um email já existe).
     */
    public function authorize(): bool
    {
        return (bool) config('auth.registration_enabled');
    }

    protected function failedAuthorization(): void
    {
        throw new AuthorizationException(self::REGISTRATION_DISABLED_MESSAGE);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ];
    }
}
