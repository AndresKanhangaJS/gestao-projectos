<?php

declare(strict_types=1);

namespace App\Policies\Infra;

use App\Models\Infra\Credential;
use App\Models\User;
use App\Policies\Infra\Concerns\ChecksInfraRoles;

/**
 * Ninguém além de `admin`/`infra` gere credenciais — nem sequer leitura da
 * lista (sem o segredo) é permitida a outros papéis (incl. project_manager,
 * que tem leitura no resto do módulo Infra). O registo de acessos
 * (quem revelou o quê) é só para `admin`.
 */
class CredentialPolicy
{
    use ChecksInfraRoles;

    public function viewAny(User $user): bool
    {
        return $this->canWriteInfra($user);
    }

    public function view(User $user, Credential $credential): bool
    {
        return $this->canWriteInfra($user);
    }

    public function create(User $user): bool
    {
        return $this->canWriteInfra($user);
    }

    public function update(User $user, Credential $credential): bool
    {
        return $this->canWriteInfra($user);
    }

    public function delete(User $user, Credential $credential): bool
    {
        return $this->canWriteInfra($user);
    }

    /** Descriptografar e visualizar o segredo em texto simples (endpoint dedicado). */
    public function reveal(User $user, Credential $credential): bool
    {
        return $this->canWriteInfra($user);
    }

    /** Consultar o registo de acessos (reveals) de uma credencial. */
    public function viewAccessLogs(User $user, Credential $credential): bool
    {
        return $user->hasRole('admin');
    }
}
