<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use Illuminate\Foundation\Http\FormRequest;

class SyncClientSoftwareModulesRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: sem permissão devolve 403, nunca 422.
        return (bool) $this->user()?->can('update', $this->route('clientSoftware'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'modules' => ['required', 'array'],
            'modules.*.software_module_id' => ['required', 'integer', 'exists:software_modules,id'],
            'modules.*.active' => ['required', 'boolean'],
        ];
    }
}
