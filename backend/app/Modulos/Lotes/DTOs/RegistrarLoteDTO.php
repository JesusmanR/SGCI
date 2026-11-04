<?php

declare(strict_types=1);

namespace App\Modulos\Lotes\DTOs;

use DateTimeImmutable;
use InvalidArgumentException;

/**
 * DTO inmutable para el registro de un Lote de Producto (`product_lots`).
 *
 * Garantiza:
 * - Si el artículo es perecedero (`esPerecedero === true`), la fecha de vencimiento es obligatoria.
 * - Si se informa fecha de fabricación y vencimiento, `fechaVencimiento > fechaFabricacion`.
 * - `stockInicial > 0` y `costoUnitarioEntrada >= 0`.
 */
final readonly class RegistrarLoteDTO
{
    public string $numeroLote;
    public ?DateTimeImmutable $fechaFabricacion;
    public ?DateTimeImmutable $fechaVencimiento;

    public function __construct(
        public string $tenantId,
        public string $productId,
        string $numeroLote,
        ?string $fechaFabricacionIso = null,
        ?string $fechaVencimientoIso = null,
        public float $costoUnitarioEntrada = 0.0,
        public float $stockInicial = 0.0,
        public bool $esPerecedero = false,
        public string $usuarioCreadorId = '',
    ) {
        if (trim($this->tenantId) === '' || trim($this->productId) === '') {
            throw new InvalidArgumentException('Los identificadores tenant_id y product_id son obligatorios para registrar un lote.');
        }

        $loteNormalizado = strtoupper(trim($numeroLote));
        if ($loteNormalizado === '' || !preg_match('/^[A-Z0-9\-_.]{3,64}$/', $loteNormalizado)) {
            throw new InvalidArgumentException(
                'El número de lote debe contener entre 3 y 64 caracteres alfanuméricos, guiones o puntos.'
            );
        }

        if ($this->stockInicial <= 0) {
            throw new InvalidArgumentException('El stock inicial del lote debe ser mayor a cero.');
        }

        if ($this->costoUnitarioEntrada < 0) {
            throw new InvalidArgumentException('El costo unitario de entrada del lote no puede ser negativo.');
        }

        $fabricacion = $fechaFabricacionIso !== null && trim($fechaFabricacionIso) !== ''
            ? new DateTimeImmutable($fechaFabricacionIso)
            : null;

        $vencimiento = $fechaVencimientoIso !== null && trim($fechaVencimientoIso) !== ''
            ? new DateTimeImmutable($fechaVencimientoIso)
            : null;

        if ($this->esPerecedero && $vencimiento === null) {
            throw new InvalidArgumentException(
                'La fecha de vencimiento es obligatoria para lotes de productos perecederos.'
            );
        }

        if ($fabricacion !== null && $vencimiento !== null && $vencimiento <= $fabricacion) {
            throw new InvalidArgumentException(
                'Invariante de fechas violado: La fecha de vencimiento debe ser estrictamente posterior a la fecha de fabricación.'
            );
        }

        $this->numeroLote = $loteNormalizado;
        $this->fechaFabricacion = $fabricacion;
        $this->fechaVencimiento = $vencimiento;
    }
}
