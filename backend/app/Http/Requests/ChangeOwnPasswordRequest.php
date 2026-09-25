<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;

/** `PUT /me/password` — o próprio utilizador muda a sua palavra-passe. */
class ChangeOwnPasswordRequest extends FormRequest
{
    public const string WRONG_CURRENT = 'A palavra-passe actual está incorrecta.';

    public const string SAME_AS_CURRENT = 'A nova palavra-passe tem de ser diferente da actual.';

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $hash = (string) $this->user()?->getAuthPassword();

        return [
            'current_password' => [
                'required',
                'string',
                function (string $attribute, mixed $value, Closure $fail) use ($hash): void {
                    if (! is_string($value) || ! Hash::check($value, $hash)) {
                        $fail(self::WRONG_CURRENT);
                    }
                },
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                function (string $attribute, mixed $value, Closure $fail) use ($hash): void {
                    if (is_string($value) && Hash::check($value, $hash)) {
                        $fail(self::SAME_AS_CURRENT);
                    }
                },
            ],
        ];
    }
}
