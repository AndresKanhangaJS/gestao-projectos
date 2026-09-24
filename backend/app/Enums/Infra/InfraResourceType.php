<?php

declare(strict_types=1);

namespace App\Enums\Infra;

use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use Illuminate\Database\Eloquent\Model;

/**
 * Alias público (`machine`/`deployment`) dos recursos polimórficos a que se
 * associam credenciais e políticas de backup. A BD guarda o FQCN no campo
 * `*_type` (sem morph map), por isso a conversão é feita aqui.
 */
enum InfraResourceType: string
{
    case Machine = 'machine';
    case Deployment = 'deployment';

    /**
     * @return class-string<Model>
     */
    public function modelClass(): string
    {
        return match ($this) {
            self::Machine => Machine::class,
            self::Deployment => Deployment::class,
        };
    }
}
