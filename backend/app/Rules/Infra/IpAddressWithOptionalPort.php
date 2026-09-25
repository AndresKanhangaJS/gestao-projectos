<?php

declare(strict_types=1);

namespace App\Rules\Infra;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Endereço IP (v4 ou v6), opcionalmente com porta: `10.10.10.2`, `10.10.10.2:8006`,
 * `[2001:db8::1]:8006`. O inventário real inclui painéis web acedidos por porta
 * (ex.: Proxmox na Máquina 2), por isso a porta faz parte do endereço registado.
 */
class IpAddressWithOptionalPort implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! self::isValid($value)) {
            $fail('O campo :attribute tem de ser um endereço IP válido, opcionalmente com porta (ex.: 10.10.10.2:8006).');
        }
    }

    public static function isValid(string $value): bool
    {
        if (filter_var($value, FILTER_VALIDATE_IP) !== false) {
            return true;
        }

        if (preg_match('/^\[(?<ip>[^\]]+)\]:(?<port>\d{1,5})$/', $value, $m) === 1) {
            return filter_var($m['ip'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false
                && self::isPort($m['port']);
        }

        if (preg_match('/^(?<ip>[^:]+):(?<port>\d{1,5})$/', $value, $m) === 1) {
            return filter_var($m['ip'], FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false
                && self::isPort($m['port']);
        }

        return false;
    }

    private static function isPort(string $port): bool
    {
        $number = (int) $port;

        return $number >= 1 && $number <= 65535;
    }
}
