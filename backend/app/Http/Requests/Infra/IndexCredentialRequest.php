<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Enums\Infra\InfraResourceType;
use App\Models\Infra\Credential;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Filtros de `GET /infra/credentials`:
 * - `credentialable_type=machine|deployment` + `credentialable_id=N` (sempre em conjunto);
 * - `machine_id=N` — credenciais da máquina e dos deployments dessa máquina
 *   (mutuamente exclusivo com o par anterior).
 *
 * Autorização (só admin/infra) via CredentialPolicy::viewAny, aqui e no controller.
 */
class IndexCredentialRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Autoriza antes de validar: um utilizador sem acesso recebe 403, nunca 422.
        return (bool) $this->user()?->can('viewAny', Credential::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'credentialable_type' => ['required_with:credentialable_id', 'prohibits:machine_id', Rule::enum(InfraResourceType::class)],
            'credentialable_id' => ['required_with:credentialable_type', 'integer', 'min:1'],
            'machine_id' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function credentialableType(): ?InfraResourceType
    {
        return $this->filled('credentialable_type')
            ? InfraResourceType::from($this->string('credentialable_type')->value())
            : null;
    }
}
