<?php

declare(strict_types=1);

namespace App\Modulos\AuditoriaConteos\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para el registro de un Ajuste / Conteo Físico de Inventario.
 *
 * Alineado exactamente con las pantallas Figma `43-nuevo-ajuste` y `44-ajuste-revision`:
 * - Motivos canónicos: `Conteo físico`, `Producto dañado / merma`, `Pérdida`, `Corrección de registro`, `Otro`.
 * - Si el motivo es `Otro`, las observaciones (`observaciones`) son obligatorias.
 * - La cantidad real contada (`cantidadRealContada`) debe ser no negativa y distinta al `stockActualSistema`.
 */
final readonly class RegistrarAjusteInventarioDTO
{
    public const MOTIVOS_PERMITIDOS = [
        'Conteo físico',
        'Producto dañado / merma',
        'Pérdida',
        'Corrección de registro',
        'Otro',
    ];

    public float $variacionUnidades;
    public float $impactoMonetario;
    public string $tipoMovimientoKardex;

    public function __construct(
        public string $tenantId,
        public string $warehouseId,
        public string $productId,
        public string $sku,
        public string $nombreProducto,
        public float $stockActualSistema,
        public float $cantidadRealContada,
        public float $costoUnitarioActual,
        public string $motivoAjuste,
        public ?string $observaciones = null,
        public string $usuarioResponsableId = '',
        public ?string $usuarioAutorizadorId = null,
        public ?string $loteId = null,
    ) {
        if (trim($this->tenantId) === '' || trim($this->warehouseId) === '' || trim($this->productId) === '') {
            throw new InvalidArgumentException('Los identificadores tenant_id, warehouse_id y product_id son obligatorios.');
        }

        if ($this->cantidadRealContada < 0) {
            throw new InvalidArgumentException('Ingresa un conteo no negativo.');
        }

        $variacion = round($this->cantidadRealContada - $this->stockActualSistema, 4);
        if (abs($variacion) < 0.0001) {
            throw new InvalidArgumentException(
                'Ingresa una cantidad real contada distinta al stock actual del sistema.'
            );
        }

        if (!in_array($this->motivoAjuste, self::MOTIVOS_PERMITIDOS, true)) {
            throw new InvalidArgumentException(
                sprintf(
                    'Selecciona un motivo válido para el ajuste. Recibido: [%s].',
                    $this->motivoAjuste
                )
            );
        }

        if ($this->motivoAjuste === 'Otro' && ($this->observaciones === null || trim($this->observaciones) === '')) {
            throw new InvalidArgumentException('Describe el motivo del ajuste en las observaciones cuando seleccionas "Otro".');
        }

        $this->variacionUnidades = $variacion;
        $this->impactoMonetario = round($variacion * $this->costoUnitarioActual, 4);

        if ($variacion > 0) {
            $this->tipoMovimientoKardex = 'AJUSTE_POSITIVO';
        } elseif (in_array($this->motivoAjuste, ['Producto dañado / merma', 'Pérdida'], true)) {
            $this->tipoMovimientoKardex = 'MERMA_DANO';
        } else {
            $this->tipoMovimientoKardex = 'AJUSTE_NEGATIVO';
        }
    }
}
