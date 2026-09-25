<?php

declare(strict_types=1);

namespace App\Http\Requests\Projects\Concerns;

/**
 * A chave do projecto é um código curto e único (ex.: GPS, RH, SCHOOL).
 * Guarda-se sempre em maiúsculas e sem espaços, para ser igual em toda a app.
 */
trait NormalizesProjectKey
{
    public const KEY_PATTERN = '/^[A-Z0-9][A-Z0-9_-]*$/';

    protected function prepareForValidation(): void
    {
        $key = $this->input('key');

        if (is_string($key)) {
            $this->merge(['key' => strtoupper((string) preg_replace('/\s+/', '', $key))]);
        }
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'key.regex' => 'A chave só pode ter letras, números, "-" ou "_", e tem de começar por letra ou número.',
            'key.unique' => 'Já existe um projecto com esta chave.',
        ];
    }
}
