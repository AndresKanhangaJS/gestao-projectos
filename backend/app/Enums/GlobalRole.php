<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * Papéis globais (spatie/laravel-permission, guard `web`), partilhados pelos
 * dois módulos. `client_viewer` existe como dado de referência mas NÃO é
 * atribuível (portal do cliente — Fase 2, ver specs/ROADMAP.md).
 */
enum GlobalRole: string
{
    case Admin = 'admin';
    case ProjectManager = 'project_manager';
    case Infra = 'infra';
    case Member = 'member';
    case ClientViewer = 'client_viewer';

    /** @return list<self> */
    public static function assignable(): array
    {
        return [self::Admin, self::ProjectManager, self::Infra, self::Member];
    }

    /** @return list<string> */
    public static function assignableValues(): array
    {
        return array_map(fn (self $role): string => $role->value, self::assignable());
    }

    public function labelPt(): string
    {
        return match ($this) {
            self::Admin => 'Administrador',
            self::ProjectManager => 'Gestor de projecto',
            self::Infra => 'Infraestrutura',
            self::Member => 'Membro',
            self::ClientViewer => 'Cliente (leitura)',
        };
    }

    public function descriptionPt(): string
    {
        return match ($this) {
            self::Admin => 'Acesso total: gere utilizadores e papéis, todos os projectos e todo o Controlo de Software, incluindo o registo de acessos a credenciais.',
            self::ProjectManager => 'Gere todos os workspaces e projectos (cria workspaces, sprints, quadros e membros) e tem leitura no Controlo de Software, sem credenciais.',
            self::Infra => 'Gere o Controlo de Software (clientes, máquinas, deployments, credenciais). Nos projectos só vê os workspaces de que é membro.',
            self::Member => 'Trabalha nos workspaces de que é membro, com as permissões do papel que tiver em cada workspace.',
            self::ClientViewer => 'Portal do cliente (ainda não disponível).',
        };
    }
}
