<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Infra\Client;
use App\Models\Infra\Deployment;
use App\Models\Infra\Machine;
use App\Models\Infra\SoftwareModule;
use App\Models\Infra\SoftwareProduct;
use Illuminate\Database\Seeder;

/**
 * Popula o módulo de Controlo de Software com o inventário real da Level-Soft,
 * descrito em specs/DATA_MODEL.md e no documento original "Documentação das
 * Máquinas no Servidor" (André Vasconcelos Kanhanga, 08/06/2026).
 *
 * Algumas associações cliente/máquina não estão explícitas no documento
 * original (ex.: a que cliente pertence o Level-Patrimonio da Máquina 17).
 * Nesses casos foi feita uma inferência razoável a partir do contexto,
 * assinalada com o comentário "(inferido)" — nunca inventando clientes ou
 * softwares novos além dos listados no documento.
 */
class DemoInfraSeeder extends Seeder
{
    public function run(): void
    {
        $clients = $this->seedClients();
        [$products, $modules] = $this->seedSoftwareProducts();
        $machines = $this->seedMachines();

        $this->seedLevelSchool($clients, $products, $machines);
        $this->seedLevelRh($clients, $products, $modules, $machines);
        $this->seedIspajAndBiblioteca($clients, $products, $machines);
        $this->seedFinanceiro($clients, $products, $machines);
        $this->seedLevelHealthEPatrimonio($clients, $products, $machines);
        $this->seedAvk($clients, $products, $machines);
        $this->seedBackupPolicies($machines);
    }

    /** @return array<string, Client> */
    private function seedClients(): array
    {
        $names = [
            'ISPAJ', 'Pitruca', 'Pitruquinha', 'Bondo', 'ENSASI',
            'JOELMAKIDS', 'Flor de Liz', 'Artjan', 'Neurobrink', 'AVK',
        ];

        $clients = [];
        foreach ($names as $name) {
            $clients[$name] = Client::firstOrCreate(
                ['name' => $name],
                ['status' => 'active'],
            );
        }

        return $clients;
    }

    /** @return array{0: array<string, SoftwareProduct>, 1: array<string, SoftwareModule>} */
    private function seedSoftwareProducts(): array
    {
        $definitions = [
            'Level-School' => 'Gestão Escolar',
            'Level-RH' => 'Gestão de Recursos Humanos',
            'RH Grupo Pitruca' => 'Gestão de Recursos Humanos',
            'Level-Health' => 'Gestão Clínica',
            'Level-Patrimonio' => 'Gestão Patrimonial',
            'Gestão Bibliotecária' => 'Biblioteca',
            'Gestão de Cobranças' => 'Financeiro',
            'Gestão de Finanças' => 'Financeiro',
            'Site institucional (ISPAJ)' => 'Website institucional',
            'AVK_1' => 'Projecto interno',
        ];

        $products = [];
        foreach ($definitions as $name => $category) {
            $products[$name] = SoftwareProduct::firstOrCreate(['name' => $name], ['category' => $category]);
        }

        $modules = [
            'Level-RH:Front-end' => SoftwareModule::firstOrCreate([
                'software_product_id' => $products['Level-RH']->id,
                'name' => 'Front-end',
            ], ['description' => 'Interface Angular consumida pelos clientes do Level-RH.']),
            'Level-RH:Back-end' => SoftwareModule::firstOrCreate([
                'software_product_id' => $products['Level-RH']->id,
                'name' => 'Back-end',
            ], ['description' => 'API Laravel do Level-RH.']),
        ];

        return [$products, $modules];
    }

    /** @return array<string, Machine> */
    private function seedMachines(): array
    {
        $definitions = [
            2 => ['os' => null, 'access_type' => 'web', 'ip' => '10.10.10.2:8006', 'env' => 'tradicional', 'notes' => 'Painel Geral de Administração do Data Center.'],
            3 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.3', 'env' => 'docker'],
            4 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.4', 'env' => 'docker'],
            7 => ['os' => 'Windows 10', 'access_type' => 'rdp', 'ip' => null, 'env' => 'tradicional', 'notes' => 'Acesso remoto via Proxmox.'],
            8 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.8', 'env' => 'docker'],
            10 => ['os' => 'Windows 10', 'access_type' => 'rdp', 'ip' => '10.10.10.10', 'env' => 'tradicional', 'notes' => 'Acesso remoto via Proxmox.'],
            11 => ['os' => 'Windows 10', 'access_type' => 'rdp', 'ip' => '10.10.10.11', 'env' => 'tradicional', 'notes' => 'Acesso remoto via Proxmox.'],
            12 => ['os' => 'Windows 10', 'access_type' => 'rdp', 'ip' => '10.10.10.12', 'env' => 'tradicional', 'notes' => 'Acesso remoto via Proxmox. SGBD HeidSQL, host Laragon.'],
            13 => ['os' => 'Windows 10', 'access_type' => 'rdp', 'ip' => '10.10.10.13', 'env' => 'tradicional', 'notes' => 'Acesso remoto via Proxmox. SGBD HeidSQL, host Laragon.'],
            14 => ['os' => 'Windows 10', 'access_type' => 'rdp', 'ip' => '10.10.10.14', 'env' => 'tradicional', 'notes' => 'Acesso remoto via Proxmox. SGBD HeidSQL, host Laragon.'],
            15 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.15', 'env' => 'docker'],
            17 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.17', 'env' => 'docker'],
            18 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.18', 'env' => 'docker'],
            19 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.19', 'env' => 'docker'],
            20 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.20', 'env' => 'docker', 'notes' => 'Ambiente de testes dedicado ao Level-School — único servidor de testes do parque actual.'],
            22 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.22', 'env' => 'docker'],
            23 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.23', 'env' => 'docker'],
            28 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.28', 'env' => 'docker'],
            29 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.29', 'env' => 'docker'],
            31 => ['os' => 'Linux Ubuntu', 'access_type' => 'ssh', 'ip' => '10.10.10.31', 'env' => 'docker'],
        ];

        $machines = [];
        foreach ($definitions as $number => $def) {
            $machines["Máquina {$number}"] = Machine::firstOrCreate(
                ['name' => "Máquina {$number}"],
                [
                    'ip_address' => $def['ip'],
                    'operating_system' => $def['os'],
                    'access_type' => $def['access_type'],
                    'environment' => $def['env'],
                    'notes' => $def['notes'] ?? null,
                ],
            );
        }

        // Computador dedicado a backups, mencionado nas observações do documento
        // original mas sem número de máquina atribuído no inventário.
        $machines['Servidor de Backups'] = Machine::firstOrCreate(
            ['name' => 'Servidor de Backups'],
            [
                'environment' => 'tradicional',
                'notes' => 'Computador dedicado a backups: 1 cópia diária (retenção de 3 dias), 1 semanal e 1 mensal.',
            ],
        );

        return $machines;
    }

    /**
     * @param  array<string, Client>  $clients
     * @param  array<string, SoftwareProduct>  $products
     * @param  array<string, Machine>  $machines
     */
    private function seedLevelSchool(array $clients, array $products, array $machines): void
    {
        $instances = [
            'Pitruca' => ['machine' => 'Máquina 3', 'port' => 8084, 'stack' => 'Laravel 7'],
            'Pitruquinha' => ['machine' => 'Máquina 4', 'port' => null, 'stack' => null],
            'Bondo' => ['machine' => 'Máquina 8', 'port' => null, 'stack' => null],
            'ENSASI' => ['machine' => 'Máquina 22', 'port' => null, 'stack' => null],
            'JOELMAKIDS' => ['machine' => 'Máquina 23', 'port' => null, 'stack' => null],
            'Flor de Liz' => ['machine' => 'Máquina 28', 'port' => null, 'stack' => null],
        ];

        foreach ($instances as $clientName => $def) {
            $clientSoftware = $clients[$clientName]->clientSoftware()->firstOrCreate([
                'software_product_id' => $products['Level-School']->id,
            ], ['status' => 'producao']);

            Deployment::firstOrCreate([
                'client_software_id' => $clientSoftware->id,
                'machine_id' => $machines[$def['machine']]->id,
            ], [
                'component' => 'full',
                'port' => $def['port'],
                'stack' => $def['stack'],
                'environment_type' => 'docker',
                'status' => 'activo',
            ]);
        }
    }

    /**
     * @param  array<string, Client>  $clients
     * @param  array<string, SoftwareProduct>  $products
     * @param  array<string, SoftwareModule>  $modules
     * @param  array<string, Machine>  $machines
     */
    private function seedLevelRh(array $clients, array $products, array $modules, array $machines): void
    {
        // Front-ends Angular partilhados na Máquina 7 (portas 3000/3001/3002).
        $frontends = [
            'ISPAJ' => 3000,
            'Pitruca' => 3001,
            'Pitruquinha' => 3002,
        ];

        $levelRhByClient = [];
        foreach ($frontends as $clientName => $port) {
            $clientSoftware = $clients[$clientName]->clientSoftware()->firstOrCreate([
                'software_product_id' => $products['Level-RH']->id,
            ], ['status' => 'producao']);
            $levelRhByClient[$clientName] = $clientSoftware;

            Deployment::firstOrCreate([
                'client_software_id' => $clientSoftware->id,
                'software_module_id' => $modules['Level-RH:Front-end']->id,
                'machine_id' => $machines['Máquina 7']->id,
            ], [
                'component' => 'frontend',
                'port' => $port,
                'stack' => 'Angular',
                'environment_type' => 'tradicional',
                'start_command' => "ng serve --port={$port}",
                'status' => 'activo',
            ]);
        }

        // Back-ends Laravel de cada instância (Máquinas 10, 11 e 12).
        $backends = [
            'Pitruca' => ['machine' => 'Máquina 10', 'port' => 8083],
            'Pitruquinha' => ['machine' => 'Máquina 11', 'port' => 8003],
            // "Back-end Level-RH – Clínica" no documento original: cliente
            // já listado no grupo "RH Grupo Pitruca" (inferido).
            'Neurobrink' => ['machine' => 'Máquina 11', 'port' => 9014],
            'ISPAJ' => ['machine' => 'Máquina 12', 'port' => 8081],
        ];

        foreach ($backends as $clientName => $def) {
            $clientSoftware = $levelRhByClient[$clientName]
                ?? $clients[$clientName]->clientSoftware()->firstOrCreate([
                    'software_product_id' => $products['Level-RH']->id,
                ], ['status' => 'producao']);

            Deployment::firstOrCreate([
                'client_software_id' => $clientSoftware->id,
                'software_module_id' => $modules['Level-RH:Back-end']->id,
                'machine_id' => $machines[$def['machine']]->id,
            ], [
                'component' => 'backend',
                'port' => $def['port'],
                'stack' => 'Laravel 7',
                'environment_type' => 'tradicional',
                'start_command' => "php artisan serve --port={$def['port']}",
                'database_engine' => 'MySQL',
                'database_host' => 'Laragon (host)',
                'status' => 'activo',
            ]);
        }

        // "RH Grupo Pitruca (Pitruca, Pitruquinha, Artjan, Neurobrink)" — produto
        // partilhado por um grupo de clientes; registado sob o cliente Pitruca,
        // com nota a indicar os restantes clientes servidos pelo mesmo deployment.
        $grupoPitruca = $clients['Pitruca']->clientSoftware()->firstOrCreate([
            'software_product_id' => $products['RH Grupo Pitruca']->id,
        ], [
            'status' => 'producao',
            'notes' => 'Serve também Pitruquinha, Artjan e Neurobrink a partir do mesmo deployment.',
        ]);

        Deployment::firstOrCreate([
            'client_software_id' => $grupoPitruca->id,
            'machine_id' => $machines['Máquina 7']->id,
        ], [
            'component' => 'full',
            'port' => 3001,
            'stack' => 'Laravel + React',
            'environment_type' => 'tradicional',
            'status' => 'activo',
        ]);
    }

    /**
     * @param  array<string, Client>  $clients
     * @param  array<string, SoftwareProduct>  $products
     * @param  array<string, Machine>  $machines
     */
    private function seedIspajAndBiblioteca(array $clients, array $products, array $machines): void
    {
        $bibliotecaTradicional = $clients['ISPAJ']->clientSoftware()->firstOrCreate([
            'software_product_id' => $products['Gestão Bibliotecária']->id,
        ], ['status' => 'producao']);

        Deployment::firstOrCreate([
            'client_software_id' => $bibliotecaTradicional->id,
            'machine_id' => $machines['Máquina 12']->id,
        ], [
            'component' => 'full',
            'port' => 8086,
            'stack' => 'Laravel 7',
            'database_engine' => 'MySQL',
            'database_name' => 'biblioteca',
            'database_host' => 'Laragon (host)',
            'environment_type' => 'tradicional',
            'status' => 'activo',
        ]);

        // Migração em curso para Docker (Máquina 31), em paralelo ao ambiente
        // tradicional da Máquina 12 — reflecte a recomendação do documento
        // original de padronizar em Docker.
        Deployment::firstOrCreate([
            'client_software_id' => $bibliotecaTradicional->id,
            'machine_id' => $machines['Máquina 31']->id,
        ], [
            'component' => 'full',
            'stack' => 'Laravel 7',
            'database_name' => 'biblioteca',
            'environment_type' => 'docker',
            'status' => 'testes',
        ]);

        $siteInstitucional = $clients['ISPAJ']->clientSoftware()->firstOrCreate([
            'software_product_id' => $products['Site institucional (ISPAJ)']->id,
        ], ['status' => 'producao']);

        Deployment::firstOrCreate([
            'client_software_id' => $siteInstitucional->id,
            'machine_id' => $machines['Máquina 13']->id,
        ], [
            'component' => 'backend',
            'port' => 9000,
            'stack' => 'Laravel 8.83.27',
            'database_engine' => 'MySQL',
            'database_name' => 'site_ispaj',
            'database_host' => 'Laragon (host)',
            'environment_type' => 'tradicional',
            'status' => 'activo',
        ]);

        // Migração em curso para Docker (Máquina 19).
        Deployment::firstOrCreate([
            'client_software_id' => $siteInstitucional->id,
            'machine_id' => $machines['Máquina 19']->id,
        ], [
            'component' => 'backend',
            'database_name' => 'site_ispaj',
            'environment_type' => 'docker',
            'status' => 'testes',
        ]);
    }

    /**
     * @param  array<string, Client>  $clients
     * @param  array<string, SoftwareProduct>  $products
     * @param  array<string, Machine>  $machines
     */
    private function seedFinanceiro(array $clients, array $products, array $machines): void
    {
        // Cliente não explícito no documento original para a Máquina 14;
        // inferido como ISPAJ (sistemas de gestão administrativa/financeira
        // de uma instituição de ensino).
        $cobrancas = $clients['ISPAJ']->clientSoftware()->firstOrCreate([
            'software_product_id' => $products['Gestão de Cobranças']->id,
        ], ['status' => 'producao']);

        Deployment::firstOrCreate([
            'client_software_id' => $cobrancas->id,
            'machine_id' => $machines['Máquina 14']->id,
        ], [
            'component' => 'full',
            'port' => 9010,
            'stack' => 'Laravel 10.50.2 + React 19.2.4',
            'database_engine' => 'MySQL',
            'database_name' => 'control-cobranca',
            'database_host' => 'Laragon (host)',
            'environment_type' => 'tradicional',
            'status' => 'activo',
        ]);

        $financas = $clients['ISPAJ']->clientSoftware()->firstOrCreate([
            'software_product_id' => $products['Gestão de Finanças']->id,
        ], ['status' => 'producao']);

        Deployment::firstOrCreate([
            'client_software_id' => $financas->id,
            'machine_id' => $machines['Máquina 14']->id,
        ], [
            'component' => 'full',
            'port' => 9012,
            'stack' => 'Laravel 10.50.2 + React 19.2.4',
            'database_engine' => 'MySQL',
            'database_name' => 'control-financas',
            'database_host' => 'Laragon (host)',
            'environment_type' => 'tradicional',
            'status' => 'activo',
        ]);
    }

    /**
     * @param  array<string, Client>  $clients
     * @param  array<string, SoftwareProduct>  $products
     * @param  array<string, Machine>  $machines
     */
    private function seedLevelHealthEPatrimonio(array $clients, array $products, array $machines): void
    {
        // Cliente inferido para "Level-RH – Clínica" / Level-Health: Neurobrink
        // (já referido no grupo Pitruca do documento original).
        $levelHealth = $clients['Neurobrink']->clientSoftware()->firstOrCreate([
            'software_product_id' => $products['Level-Health']->id,
        ], ['status' => 'producao']);

        Deployment::firstOrCreate([
            'client_software_id' => $levelHealth->id,
            'machine_id' => $machines['Máquina 15']->id,
        ], ['component' => 'full', 'environment_type' => 'docker', 'status' => 'activo']);

        Deployment::firstOrCreate([
            'client_software_id' => $levelHealth->id,
            'machine_id' => $machines['Máquina 18']->id,
        ], ['component' => 'worker', 'environment_type' => 'docker', 'status' => 'activo']);

        // Cliente inferido para o Level-Patrimonio: ISPAJ (gestão de
        // equipamento/património de uma instituição de ensino).
        $patrimonio = $clients['ISPAJ']->clientSoftware()->firstOrCreate([
            'software_product_id' => $products['Level-Patrimonio']->id,
        ], ['status' => 'producao']);

        Deployment::firstOrCreate([
            'client_software_id' => $patrimonio->id,
            'machine_id' => $machines['Máquina 17']->id,
        ], ['component' => 'full', 'environment_type' => 'docker', 'status' => 'activo']);
    }

    /**
     * @param  array<string, Client>  $clients
     * @param  array<string, SoftwareProduct>  $products
     * @param  array<string, Machine>  $machines
     */
    private function seedAvk(array $clients, array $products, array $machines): void
    {
        $avk1 = $clients['AVK']->clientSoftware()->firstOrCreate([
            'software_product_id' => $products['AVK_1']->id,
        ], ['status' => 'desenvolvimento']);

        Deployment::firstOrCreate([
            'client_software_id' => $avk1->id,
            'machine_id' => $machines['Máquina 29']->id,
        ], ['component' => 'full', 'environment_type' => 'docker', 'status' => 'activo']);
    }

    /** @param array<string, Machine> $machines */
    private function seedBackupPolicies(array $machines): void
    {
        $server = $machines['Servidor de Backups'];

        $policies = [
            ['frequency' => 'diario', 'retention_count' => 3],
            ['frequency' => 'semanal', 'retention_count' => 1],
            ['frequency' => 'mensal', 'retention_count' => 1],
        ];

        foreach ($policies as $policy) {
            $server->backupPolicies()->firstOrCreate([
                'frequency' => $policy['frequency'],
            ], ['retention_count' => $policy['retention_count']]);
        }
    }
}
