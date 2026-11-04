<?php

declare(strict_types=1);

namespace App\Modulos\Almacenes\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para solicitar y procesar una Transferencia Inter-Almacén (`warehouse_transfers`).
 *
 * Garantiza que:
 * - El almacén de origen y el almacén de destino pertenezcan al mismo Tenant pero sean distintos entre sí.
 * - Exista al menos una línea de producto con cantidad estrictamente positiva.
 */
final readonly class TransferenciaAlmacenDTO
{
    /**
     * @param array<int, array{
     *     product_id: string,
     *     sku: string,
     *     lot_id?: ?string,
     *     cantidad_solicitada: float,
     *     costo_unitario: float
     * }> $renglones
     */
    public function __construct(
        public string $tenantId,
        public string $numeroTransferencia,
        public string $almacenOrigenId,
        public string $almacenDestinoId,
        public array $renglones,
        public string $usuarioOperadorId,
        public ?string $motivo = null,
    ) {
        if (trim($this->tenantId) === '') {
            throw new InvalidArgumentException('El tenant_id es obligatorio en toda transferencia inter-almacén.');
        }

        if (trim($this->numeroTransferencia) === '') {
            throw new InvalidArgumentException('El número de documento de transferencia es obligatorio.');
        }

        if (trim($this->almacenOrigenId) === '' || trim($this->almacenDestinoId) === '') {
            throw new InvalidArgumentException('Debe especificar tanto el almacén de origen como el almacén de destino.');
        }

        if ($this->almacenOrigenId === $this->almacenDestinoId) {
            throw new InvalidArgumentException(
                'Invariante de almacén violado: El almacén de origen y el almacén de destino no pueden ser el mismo.'
            );
        }

        if ($this->renglones === []) {
            throw new InvalidArgumentException('La transferencia debe contener al menos un renglón de producto.');
        }

        foreach ($this->renglones as $indice => $renglon) {
            if (empty($renglon['product_id']) || empty($renglon['sku'])) {
                throw new InvalidArgumentException(sprintf('El renglón #%d carece de product_id o SKU.', $indice + 1));
            }

            if (!isset($renglon['cantidad_solicitada']) || (float) $renglon['cantidad_solicitada'] <= 0) {
                throw new InvalidArgumentException(
                    sprintf('La cantidad solicitada para el SKU [%s] debe ser mayor a cero.', $renglon['sku'])
                );
            }

            if (!isset($renglon['costo_unitario']) || (float) $renglon['costo_unitario'] < 0) {
                throw new InvalidArgumentException(
                    sprintf('El costo unitario de transferencia para el SKU [%s] no puede ser negativo.', $renglon['sku'])
                );
            }
        }
    }
}
