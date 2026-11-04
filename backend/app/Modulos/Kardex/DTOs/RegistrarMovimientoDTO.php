<?php

declare(strict_types=1);

namespace App\Modulos\Kardex\DTOs;

use InvalidArgumentException;
use Illuminate\Support\Str;

/**
 * Objeto de Transferencia de Datos (DTO) inmutable para el registro de movimientos en el Kardex.
 */
final readonly class RegistrarMovimientoDTO
{
    /**
     * @param string $id Identificador UUID del movimiento.
     * @param string $tenant_id Identificador UUID de la empresa/organización.
     * @param string $almacen_id Identificador UUID del almacén físico o virtual.
     * @param string $producto_id Identificador UUID del producto o SKU.
     * @param string|null $lote_id Identificador UUID del lote de inventario (opcional si el producto no controla lotes).
     * @param string $tipo_movimiento Tipo de operación (ej. ENTRADA_COMPRA, SALIDA_VENTA, TRANSFERENCIA_ENTRADA, TRANSFERENCIA_SALIDA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO).
     * @param float $cantidad Cantidad positiva involucrada en el movimiento.
     * @param float $costo_unitario Costo unitario de la transacción en moneda base (>= 0).
     * @param string|null $referencia_documento Documento de soporte (factura, guía, orden).
     * @param string|null $observacion Notas u observaciones adicionales.
     * @param string $created_by UUID del usuario que origina la transacción.
     */
    public function __construct(
        public string $id,
        public string $tenant_id,
        public string $almacen_id,
        public string $producto_id,
        public ?string $lote_id,
        public string $tipo_movimiento,
        public float $cantidad,
        public float $costo_unitario,
        public ?string $referencia_documento,
        public ?string $observacion,
        public string $created_by
    ) {
        if (empty(trim($this->tenant_id))) {
            throw new InvalidArgumentException('El campo [tenant_id] no puede estar vacío.');
        }

        if (empty(trim($this->almacen_id))) {
            throw new InvalidArgumentException('El campo [almacen_id] no puede estar vacío.');
        }

        if (empty(trim($this->producto_id))) {
            throw new InvalidArgumentException('El campo [producto_id] no puede estar vacío.');
        }

        if (empty(trim($this->tipo_movimiento))) {
            throw new InvalidArgumentException('El campo [tipo_movimiento] no puede estar vacío.');
        }

        if ($this->cantidad <= 0.0) {
            throw new InvalidArgumentException(
                sprintf('La cantidad del movimiento debe ser estrictamente mayor a 0. Valor recibido: %.4f', $this->cantidad)
            );
        }

        if ($this->costo_unitario < 0.0) {
            throw new InvalidArgumentException(
                sprintf('El costo unitario no puede ser negativo. Valor recibido: %.4f', $this->costo_unitario)
            );
        }

        if (empty(trim($this->created_by))) {
            throw new InvalidArgumentException('El campo [created_by] no puede estar vacío.');
        }
    }

    /**
     * Construye una instancia a partir de un arreglo asociativo con validación y UUID por defecto.
     *
     * @param array<string, mixed> $datos
     */
    public static function fromArray(array $datos): self
    {
        return new self(
            id: isset($datos['id']) && is_string($datos['id']) && !empty($datos['id'])
                ? $datos['id']
                : (string) Str::uuid(),
            tenant_id: (string) ($datos['tenant_id'] ?? ''),
            almacen_id: (string) ($datos['almacen_id'] ?? ''),
            producto_id: (string) ($datos['producto_id'] ?? ''),
            lote_id: isset($datos['lote_id']) && is_string($datos['lote_id']) && !empty(trim($datos['lote_id']))
                ? trim($datos['lote_id'])
                : null,
            tipo_movimiento: strtoupper(trim((string) ($datos['tipo_movimiento'] ?? ''))),
            cantidad: (float) ($datos['cantidad'] ?? 0.0),
            costo_unitario: (float) ($datos['costo_unitario'] ?? 0.0),
            referencia_documento: isset($datos['referencia_documento']) ? (string) $datos['referencia_documento'] : null,
            observacion: isset($datos['observacion']) ? (string) $datos['observacion'] : null,
            created_by: (string) ($datos['created_by'] ?? '')
        );
    }

    /**
     * Determina si el tipo de movimiento representa una entrada física de inventario.
     */
    public function esEntrada(): bool
    {
        return in_array($this->tipo_movimiento, [
            'ENTRADA_COMPRA',
            'ENTRADA_TRANSFERENCIA',
            'AJUSTE_POSITIVO',
            'PRODUCCION_ENTRADA',
            'DEVOLUCION_CLIENTE'
        ], true);
    }

    /**
     * Determina si el tipo de movimiento representa una salida física de inventario.
     */
    public function esSalida(): bool
    {
        return in_array($this->tipo_movimiento, [
            'SALIDA_VENTA',
            'SALIDA_TRANSFERENCIA',
            'SALIDA_DESPACHO',
            'AJUSTE_NEGATIVO',
            'MERMA_DESECHO',
            'DEVOLUCION_PROVEEDOR'
        ], true);
    }

    /**
     * Retorna los datos como arreglo asociativo.
     *
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'tenant_id' => $this->tenant_id,
            'almacen_id' => $this->almacen_id,
            'producto_id' => $this->producto_id,
            'lote_id' => $this->lote_id,
            'tipo_movimiento' => $this->tipo_movimiento,
            'cantidad' => $this->cantidad,
            'costo_unitario' => $this->costo_unitario,
            'costo_total' => round($this->cantidad * $this->costo_unitario, 4),
            'referencia_documento' => $this->referencia_documento,
            'observacion' => $this->observacion,
            'created_by' => $this->created_by,
        ];
    }
}
