<?php

declare(strict_types=1);

namespace App\Modulos\FacturacionCaja\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para confirmar un cobro de factura en Caja y descontar existencias en Kardex.
 * Alineado con las pantallas Figma:
 * - 25-pagos-pendientes
 * - 26-pago-efectivo (Efectivo recibido y cálculo de cambio a devolver)
 * - 27-pago-tarjeta (Código de autorización obligatorio)
 * - 28-pago-transferencia (Número de transferencia obligatorio)
 * - 29-pago-confirmado
 */
final readonly class RegistrarCobroCajaDTO
{
    public const METODO_EFECTIVO = 'Efectivo';
    public const METODO_TARJETA = 'Tarjeta';
    public const METODO_TRANSFERENCIA = 'Transferencia';

    public const METODOS_PERMITIDOS = [
        self::METODO_EFECTIVO,
        self::METODO_TARJETA,
        self::METODO_TRANSFERENCIA,
    ];

    /**
     * @param list<array{sku: string, cantidad: int, precio_unitario: float}> $lineasFactura
     */
    public function __construct(
        public string $tenantId,
        public string $almacenId,
        public string $referenciaFactura,
        public array $lineasFactura,
        public float $totalFactura,
        public string $metodoPago,
        public float $efectivoRecibido,
        public string $referenciaPago,
        public string $cajeroUsuarioId,
    ) {
        if (! in_array($this->metodoPago, self::METODOS_PERMITIDOS, true)) {
            throw new InvalidArgumentException(
                'El medio de pago debe ser Efectivo, Tarjeta o Transferencia.'
            );
        }

        if ($this->lineasFactura === []) {
            throw new InvalidArgumentException('La factura debe contener al menos un producto.');
        }

        if ($this->totalFactura <= 0) {
            throw new InvalidArgumentException('El total a cobrar debe ser mayor a cero.');
        }

        if ($this->metodoPago === self::METODO_EFECTIVO) {
            if ($this->efectivoRecibido < $this->totalFactura) {
                throw new InvalidArgumentException('El efectivo recibido no cubre el total.');
            }
        } elseif (trim($this->referenciaPago) === '') {
            throw new InvalidArgumentException('Ingresa la referencia del pago.');
        }
    }

    public function calcularCambioDevolver(): float
    {
        if ($this->metodoPago !== self::METODO_EFECTIVO) {
            return 0.0;
        }

        return round(max(0.0, $this->efectivoRecibido - $this->totalFactura), 2);
    }
}
