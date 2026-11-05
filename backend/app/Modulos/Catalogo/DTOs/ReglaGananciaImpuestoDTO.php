<?php

declare(strict_types=1);

namespace App\Modulos\Catalogo\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para la configuración de Impuesto de Venta (IVA) y Regla de Ganancia.
 * Alineado con las pantallas Figma:
 * - 46-impuestos-ganancia (Recargo sobre el costo: Costo * (1 + porcentaje))
 * - 47-margen-venta (Margen sobre la venta: Costo / (1 - porcentaje))
 * - 48-impuestos-guardados
 */
final readonly class ReglaGananciaImpuestoDTO
{
    public const METODO_RECARGO_COSTO = 'markup';
    public const METODO_MARGEN_VENTA = 'margin';

    public const TASAS_IVA_PERMITIDAS = [19.0, 5.0, 0.0];

    public function __construct(
        public string $tenantId,
        public float $tasaIvaPorcentaje,
        public string $metodoGanancia,
        public float $porcentajeGanancia,
        public string $usuarioId,
    ) {
        if (! in_array($this->tasaIvaPorcentaje, self::TASAS_IVA_PERMITIDAS, true)) {
            throw new InvalidArgumentException(
                'La tasa de IVA debe ser una de las tasas oficiales (19%, 5% o 0%).'
            );
        }

        if (! in_array($this->metodoGanancia, [self::METODO_RECARGO_COSTO, self::METODO_MARGEN_VENTA], true)) {
            throw new InvalidArgumentException(
                'El método de ganancia debe ser "markup" (Recargo sobre el costo) o "margin" (Margen sobre la venta).'
            );
        }

        if ($this->porcentajeGanancia < 0) {
            throw new InvalidArgumentException('El porcentaje de ganancia no puede ser negativo.');
        }

        if ($this->metodoGanancia === self::METODO_MARGEN_VENTA && $this->porcentajeGanancia >= 100.0) {
            throw new InvalidArgumentException(
                'En el método "Margen sobre la venta", el porcentaje debe ser menor a 100% (máximo recomendado 99%).'
            );
        }
    }
}
