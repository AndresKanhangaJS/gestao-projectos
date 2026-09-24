<?php

declare(strict_types=1);

namespace App\Http\Requests\Infra;

use App\Models\Infra\Deployment;
use Illuminate\Foundation\Http\FormRequest;

/** Filtros de `GET /infra/deployments`: `machine_id=N`. */
class IndexDeploymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('viewAny', Deployment::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'machine_id' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
