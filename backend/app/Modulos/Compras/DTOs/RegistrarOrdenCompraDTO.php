<?php

declare(strict_types=1);

namespace App\Modulos\Compras\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para la emisión de una Orden de Compra (`purchase_orders`).
 *
 * Calcula de forma determinista el subtotal, los impuestos y el total financiero
 * garantizando que todas las cantidades sean positivas y los precios no negativos.
 */
final readonly class RegistrarOrdenCompraDTO
{
    public float $subtotal;
    public float $impuestos;
    public float $total;

    /**
     * @param array<int, array{
     *     product_id: string,
     *     sku: string,
     *     cantidad_solicitada: float,
     *     precio_unitario: float,
     *     notas?: ?string
     * }> $renglones
     */
    public function __construct(
        public string $tenantId,
        public string $supplierId,
        public string $warehouseId,
        public string $numeroOrden,
        public array $renglones,
        public float $tasaImpuestoPorcentaje = 16.0,
        public ?string $fechaEntregaEsperadaIso = null,
        public ?string $notas = null,
        public string $usuarioCreadorId = '',
    ) {
        if (trim($this->tenantId) === '' || trim($this->supplierId) === '' || trim($this->warehouseId) === '') {
            throw new InvalidArgumentException('Los identificadores tenant_id, supplier_id y warehouse_id son obligatorios.');
        }

        if (trim($this->numeroOrden) === '') {
            throw new InvalidArgumentException('El número de orden de compra es obligatorio.');
        }

        if ($this->renglones === []) {
            throw new InvalidArgumentException('La orden de compra debe incluir al menos un renglón de artículo.');
        }

        if ($this->tasaImpuestoPorcentaje < 0 || $this->tasaImpuestoPorcentaje > 100) {
            throw new InvalidArgumentException('La tasa de impuesto debe estar entre 0% y 100%.');
        }

        $acumuladoSubtotal = 0.0;

        foreach ($this->renglones as $indice => $renglon) {
            if (empty($renglon['product_id']) || empty($renglon['sku'])) {
                throw new InvalidArgumentException(sprintf('El renglón #%d carece de product_id o SKU.', $indice + 1));
            }

            $cantidad = (float) ($renglon['cantidad_solicitada'] ?? 0);
            $precio = (float) ($renglon['precio_unitario'] ?? -1);

            if ($cantidad <= 0) {
                throw new InvalidArgumentException(
                    sprintf('La cantidad solicitada para el SKU [%s] debe ser estrictamente mayor a cero.', $renglon['sku'])
                );
            }

            if ($precio < 0) {
                throw new InvalidArgumentException(
                    sprintf('El precio unitario pactado para el SKU [%s] no puede ser negativo.', $renglon['sku'])
                );
            }

            $acumuladoSubtotal += round($cantidad * $precio, 4);
        }

        $this->subtotal = round($acumuladoSubtotal, 4);
        $this->impuestos = round($this->subtotal * ($this->tasaImpuestoPorcentaje / 100.0), 4);
        $this->total = round($this->subtotal + $this->impuestos, 4);
    }
}
