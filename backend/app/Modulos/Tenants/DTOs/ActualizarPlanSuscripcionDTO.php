<?php

declare(strict_types=1);

namespace App\Modulos\Tenants\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para la gestión de planes de suscripción y estados de membresía SaaS.
 * Alineado con las pantallas Figma:
 * - 64-membresias-planes (Planes Emprende, Crece y Pro)
 * - 65-cambio-plan
 * - 66-admin-empresas
 * - 67-empresa-suspendida
 */
final readonly class ActualizarPlanSuscripcionDTO
{
    public const PLAN_EMPRENDE = 'Emprende';
    public const PLAN_CRECE = 'Crece';
    public const PLAN_PRO = 'Pro';

    public const ESTADO_ACTIVA = 'Activa';
    public const ESTADO_SUSPENDIDA = 'Suspendida';
    public const ESTADO_CANCELADA = 'Cancelada';
    public const ESTADO_PRUEBA = 'Prueba';

    public const CATALOGO_PLANES = [
        self::PLAN_EMPRENDE => [
            'precio_cop_mes' => 39900,
            'max_usuarios' => 2,
            'max_bodegas' => 1,
            'max_productos' => 1000,
            'permite_carga_masiva_csv' => false,
        ],
        self::PLAN_CRECE => [
            'precio_cop_mes' => 89900,
            'max_usuarios' => 5,
            'max_bodegas' => 3,
            'max_productos' => 5000,
            'permite_carga_masiva_csv' => true,
        ],
        self::PLAN_PRO => [
            'precio_cop_mes' => 179900,
            'max_usuarios' => 15,
            'max_bodegas' => 10,
            'max_productos' => null, // Ilimitados
            'permite_carga_masiva_csv' => true,
        ],
    ];

    public function __construct(
        public string $tenantId,
        public string $nombrePlan,
        public string $estadoMembresia,
        public string $actorUsuarioId,
    ) {
        if (trim($this->tenantId) === '') {
            throw new InvalidArgumentException('El identificador de la organización (tenantId) es obligatorio.');
        }

        if (! isset(self::CATALOGO_PLANES[$this->nombrePlan])) {
            throw new InvalidArgumentException(
                'El plan seleccionado no es válido. Planes permitidos: Emprende, Crece, Pro.'
            );
        }

        $estadosPermitidos = [
            self::ESTADO_ACTIVA,
            self::ESTADO_SUSPENDIDA,
            self::ESTADO_CANCELADA,
            self::ESTADO_PRUEBA,
        ];

        if (! in_array($this->estadoMembresia, $estadosPermitidos, true)) {
            throw new InvalidArgumentException(
                'El estado de membresía debe ser Activa, Suspendida, Cancelada o Prueba.'
            );
        }
    }

    /**
     * @return array{
     *   precio_cop_mes: int,
     *   max_usuarios: int,
     *   max_bodegas: int,
     *   max_productos: int|null,
     *   permite_carga_masiva_csv: bool
     * }
     */
    public function obtenerLimitesPlan(): array
    {
        return self::CATALOGO_PLANES[$this->nombrePlan];
    }
}
