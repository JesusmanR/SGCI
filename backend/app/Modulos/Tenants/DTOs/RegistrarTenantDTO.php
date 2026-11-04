<?php

declare(strict_types=1);

namespace App\Modulos\Tenants\DTOs;

use InvalidArgumentException;
use Illuminate\Support\Str;

/**
 * DTO inmutable para el registro y aprovisionamiento de un nuevo Tenant en SGCI.
 */
final readonly class RegistrarTenantDTO
{
    public const METODOS_VALORACION_VALIDOS = [
        'PEPS',
        'UEPS',
        'PROMEDIO_PONDERADO',
    ];

    public function __construct(
        public string $id,
        public string $tenant_id,
        public string $codigo,
        public string $razon_social,
        public string $identificacion_fiscal,
        public string $email_corporativo,
        public string $metodo_valoracion_defecto,
        public bool $permite_stock_negativo,
        public int $limite_almacenes,
        public int $limite_usuarios,
        public string $admin_nombre_completo,
        public string $admin_email,
        public string $admin_password_hash,
        public ?string $created_by = null,
    ) {
        if (trim($this->codigo) === '') {
            throw new InvalidArgumentException('El código del tenant no puede estar vacío.');
        }

        if (trim($this->razon_social) === '') {
            throw new InvalidArgumentException('La razón social del tenant es obligatoria.');
        }

        if (! in_array($this->metodo_valoracion_defecto, self::METODOS_VALORACION_VALIDOS, true)) {
            throw new InvalidArgumentException(sprintf(
                'Método de valoración inválido [%s]. Valores permitidos: %s.',
                $this->metodo_valoracion_defecto,
                implode(', ', self::METODOS_VALORACION_VALIDOS)
            ));
        }

        if ($this->limite_almacenes < 1 || $this->limite_usuarios < 1) {
            throw new InvalidArgumentException('Los límites de almacenes y usuarios deben ser mayores o iguales a 1.');
        }
    }

    /**
     * Crea una instancia inmutable validada desde un arreglo asociativo.
     *
     * @param array<string, mixed> $datos
     */
    public static function fromArray(array $datos): self
    {
        $id = isset($datos['id']) && is_string($datos['id']) && $datos['id'] !== ''
            ? $datos['id']
            : (string) Str::uuid();

        return new self(
            id: $id,
            tenant_id: $id, // En la tabla raíz tenants, tenant_id referencia su propio UUID
            codigo: strtoupper(trim((string) ($datos['codigo'] ?? ''))),
            razon_social: trim((string) ($datos['razon_social'] ?? '')),
            identificacion_fiscal: trim((string) ($datos['identificacion_fiscal'] ?? '')),
            email_corporativo: strtolower(trim((string) ($datos['email_corporativo'] ?? ''))),
            metodo_valoracion_defecto: (string) ($datos['metodo_valoracion_defecto'] ?? 'PROMEDIO_PONDERADO'),
            permite_stock_negativo: (bool) ($datos['permite_stock_negativo'] ?? false),
            limite_almacenes: (int) ($datos['limite_almacenes'] ?? 5),
            limite_usuarios: (int) ($datos['limite_usuarios'] ?? 25),
            admin_nombre_completo: trim((string) ($datos['admin_nombre_completo'] ?? '')),
            admin_email: strtolower(trim((string) ($datos['admin_email'] ?? ''))),
            admin_password_hash: (string) ($datos['admin_password_hash'] ?? ''),
            created_by: isset($datos['created_by']) ? (string) $datos['created_by'] : null,
        );
    }
}
