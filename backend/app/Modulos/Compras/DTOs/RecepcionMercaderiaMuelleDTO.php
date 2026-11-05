<?php

declare(strict_types=1);

namespace App\Modulos\Compras\DTOs;

use InvalidArgumentException;

/**
 * DTO inmutable para registrar la Recepción Física de Mercadería en Muelle
 * contra una Orden de Compra (`purchase_orders`).
 *
 * Permite capturar por renglón:
 * - Cantidad recibida conforme (ingresa al almacén y al Kardex).
 * - Cantidad averiada/rechazada en muelle (se documenta en el Acta de Discrepancia sin contaminar el stock).
 * - Número de lote y fecha de vencimiento verificados físicamente.
 */
final readonly class RecepcionMercaderiaMuelleDTO
{
    /**
     * @param array<int, array{
     *     product_id: string,
     *     sku: string,
     *     cantidad_recibida_conforme: float,
     *     cantidad_averiada_rechazada?: float,
     *     precio_unitario_factura?: float,
     *     numero_lote?: ?string,
     *     fecha_vencimiento_iso?: ?string,
     *     observacion_renglon?: ?string
     * }> $renglonesRecibidos
     */
    public function __construct(
        public string $tenantId,
        public string $purchaseOrderId,
        public string $numeroOrden,
        public string $warehouseId,
        public string $referenciaRemisionProveedor,
        public array $renglonesRecibidos,
        public string $usuarioReceptorId,
    ) {
        if (trim($this->tenantId) === '' || trim($this->purchaseOrderId) === '' || trim($this->warehouseId) === '') {
            throw new InvalidArgumentException('Los identificadores tenant_id, purchase_order_id y warehouse_id son obligatorios.');
        }

        if (trim($this->referenciaRemisionProveedor) === '') {
            throw new InvalidArgumentException('Debe indicar el folio de factura o guía de remisión del proveedor.');
        }

        if ($this->renglonesRecibidos === []) {
            throw new InvalidArgumentException('La recepción en muelle debe contener al menos un renglón verificado.');
        }

        foreach ($this->renglonesRecibidos as $indice => $renglon) {
            if (empty($renglon['product_id']) || empty($renglon['sku'])) {
                throw new InvalidArgumentException(sprintf('El renglón recibido #%d carece de product_id o SKU.', $indice + 1));
            }

            $conforme = (float) ($renglon['cantidad_recibida_conforme'] ?? -1);
            $averiada = (float) ($renglon['cantidad_averiada_rechazada'] ?? 0.0);

            if ($conforme < 0 || $averiada < 0) {
                throw new InvalidArgumentException(
                    sprintf('Las cantidades recibidas o averiadas para el SKU [%s] no pueden ser negativas.', $renglon['sku'])
                );
            }

            if ($conforme === 0.0 && $averiada === 0.0) {
                throw new InvalidArgumentException(
                    sprintf('El renglón del SKU [%s] debe registrar cantidad conforme o cantidad rechazada mayor a cero.', $renglon['sku'])
                );
            }
        }
    }
}
