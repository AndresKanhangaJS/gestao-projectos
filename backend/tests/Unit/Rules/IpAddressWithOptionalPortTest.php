<?php

namespace Tests\Unit\Rules;

use App\Rules\Infra\IpAddressWithOptionalPort;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class IpAddressWithOptionalPortTest extends TestCase
{
    /** @return array<string, array{string, bool}> */
    public static function addresses(): array
    {
        return [
            'ipv4' => ['10.10.10.2', true],
            'ipv4 com porta (painel Proxmox)' => ['10.10.10.2:8006', true],
            'ipv6' => ['2001:db8::1', true],
            'ipv6 com porta' => ['[2001:db8::1]:8006', true],
            'porta zero' => ['10.10.10.2:0', false],
            'porta acima do limite' => ['10.10.10.2:70000', false],
            'ipv4 inválido' => ['10.10.10.300', false],
            'hostname' => ['servidor.local', false],
            'porta sem ip' => [':8006', false],
        ];
    }

    #[DataProvider('addresses')]
    public function test_validates_ip_with_optional_port(string $value, bool $expected): void
    {
        $this->assertSame($expected, IpAddressWithOptionalPort::isValid($value));
    }
}
