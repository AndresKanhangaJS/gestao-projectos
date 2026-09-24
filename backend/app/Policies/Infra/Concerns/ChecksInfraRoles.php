<?php

declare(strict_types=1);

namespace App\Policies\Infra\Concerns;

use App\Models\User;

/**
 * Regra única de acesso ao módulo "Controlo de Software":
 * - leitura (viewAny/view/overview/alerts): admin, infra, project_manager;
 * - escrita (create/update/delete): admin, infra.
 * Credenciais têm regras próprias e mais restritas (CredentialPolicy).
 */
trait ChecksInfraRoles
{
    /** @var list<string> */
    protected const array INFRA_READ_ROLES = ['admin', 'infra', 'project_manager'];

    /** @var list<string> */
    protected const array INFRA_WRITE_ROLES = ['admin', 'infra'];

    protected function canReadInfra(User $user): bool
    {
        return $user->hasAnyRole(self::INFRA_READ_ROLES);
    }

    protected function canWriteInfra(User $user): bool
    {
        return $user->hasAnyRole(self::INFRA_WRITE_ROLES);
    }
}
