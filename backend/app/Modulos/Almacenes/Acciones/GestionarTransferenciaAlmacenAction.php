<?php

declare(strict_types=1);

namespace App\Modulos\Almacenes\Acciones;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Almacenes\DTOs\TransferenciaAlmacenDTO;
use InvalidArgumentException;
use RuntimeException;

/**
 * Caso de uso para el flujo de Doble Paso en Transferencias Inter-Almacén:
 *
 * 1. **Despacho en Origen (`despacharEnOrigen`):**
 *    - Verifica que el stock disponible en el almacén origen cubra la cantidad solicitada.
 *    - Descuenta el stock disponible del almacén origen y lo coloca en estado lógico `EN_TRANSITO`.
 *    - Genera el asiento inmutable `SALIDA_TRANSFERENCIA` para el Libro Mayor de Kardex del almacén origen.
 *
 * 2. **Recepción en Destino (`confirmarRecepcionEnDestino`):**
 *    - Verifica que la transferencia pertenezca al mismo `tenant_id` y esté en estado `EN_TRANSITO`.
 *    - Acredita la existencia en el almacén destino y libera el saldo `EN_TRANSITO`.
 *    - Genera el asiento inmutable `ENTRADA_TRANSFERENCIA` para el Libro Mayor de Kardex del almacén destino.
 */
final class GestionarTransferenciaAlmacenAction
{
    /**
     * Paso 1: Ejecuta la salida física desde el almacén de origen y coloca la mercancía `EN_TRANSITO`.
     *
     * @param array<string, float> $saldosDisponiblesOrigen Mapa `[product_id => cantidad_disponible]` en el almacén origen
     * @return array{
     *     id: string,
     *     tenant_id: string,
     *     numero_transferencia: string,
     *     origen_warehouse_id: string,
     *     destino_warehouse_id: string,
     *     estado: string,
     *     fecha_envio: string,
     *     saldos_origen_resultantes: array<string, float>,
     *     stock_en_transito: array<string, float>,
     *     movimientos_kardex_origen: array<int, array<string, mixed>>,
     *     renglones: array<int, array<string, mixed>>
     * }
     */
    public function despacharEnOrigen(
        TransferenciaAlmacenDTO $dto,
        array $saldosDisponiblesOrigen
    ): array {
        $tenantActual = ModeloBaseTenant::obtenerTenantIdActual();

        if ($tenantActual === null || $tenantActual !== $dto->tenantId) {
            throw new RuntimeException(
                'Violación de aislamiento Multi-Tenant al despachar transferencia entre almacenes.'
            );
        }

        $saldosResultantes = $saldosDisponiblesOrigen;
        $stockEnTransito = [];
        $movimientosKardexOrigen = [];
        $renglonesDespachados = [];

        foreach ($dto->renglones as $renglon) {
            $productoId = (string) $renglon['product_id'];
            $sku = (string) $renglon['sku'];
            $cantidad = round((float) $renglon['cantidad_solicitada'], 4);
            $costoUnitario = round((float) $renglon['costo_unitario'], 4);
            $disponibleActual = round((float) ($saldosResultantes[$productoId] ?? 0.0), 4);

            if ($disponibleActual < $cantidad) {
                throw new InvalidArgumentException(
                    sprintf(
                        'Stock insuficiente en almacén de origen para el SKU [%s]. Disponible: %.4f, Solicitado: %.4f.',
                        $sku,
                        $disponibleActual,
                        $cantidad
                    )
                );
            }

            $nuevoSaldoOrigen = round($disponibleActual - $cantidad, 4);
            $saldosResultantes[$productoId] = $nuevoSaldoOrigen;
            $stockEnTransito[$productoId] = round(($stockEnTransito[$productoId] ?? 0.0) + $cantidad, 4);

            $movimientosKardexOrigen[] = [
                'tenant_id' => $tenantActual,
                'warehouse_id' => $dto->almacenOrigenId,
                'product_id' => $productoId,
                'lot_id' => $renglon['lot_id'] ?? null,
                'tipo_movimiento' => 'SALIDA_TRANSFERENCIA',
                'referencia_documento' => $dto->numeroTransferencia,
                'cantidad' => $cantidad,
                'costo_unitario' => $costoUnitario,
                'costo_total' => round($cantidad * $costoUnitario, 4),
                'saldo_cantidad' => $nuevoSaldoOrigen,
                'saldo_costo_unitario' => $costoUnitario,
                'saldo_costo_total' => round($nuevoSaldoOrigen * $costoUnitario, 4),
                'created_by' => $dto->usuarioOperadorId,
            ];

            $renglonesDespachados[] = [
                'product_id' => $productoId,
                'sku' => $sku,
                'lot_id' => $renglon['lot_id'] ?? null,
                'cantidad_solicitada' => $cantidad,
                'cantidad_enviada' => $cantidad,
                'cantidad_recibida' => 0.0,
                'costo_unitario' => $costoUnitario,
            ];
        }

        return [
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'tenant_id' => $tenantActual,
            'numero_transferencia' => $dto->numeroTransferencia,
            'origen_warehouse_id' => $dto->almacenOrigenId,
            'destino_warehouse_id' => $dto->almacenDestinoId,
            'estado' => 'EN_TRANSITO',
            'fecha_envio' => gmdate('Y-m-d\TH:i:s\Z'),
            'saldos_origen_resultantes' => $saldosResultantes,
            'stock_en_transito' => $stockEnTransito,
            'movimientos_kardex_origen' => $movimientosKardexOrigen,
            'renglones' => $renglonesDespachados,
        ];
    }

    /**
     * Paso 2: Confirma la recepción física en el almacén de destino, acredita existencias
     * y genera los asientos `ENTRADA_TRANSFERENCIA` en el Kardex del almacén receptor.
     *
     * @param array<string, mixed> $transferenciaEnTransito Estado devuelto por `despacharEnOrigen`
     * @param array<string, float> $saldosDisponiblesDestino Mapa `[product_id => cantidad_disponible]` en el almacén destino
     * @param array<string, float>|null $cantidadesRecibidasPorProducto Mapa opcional `[product_id => cantidad_recibida]`
     * @return array{
     *     id: string,
     *     tenant_id: string,
     *     numero_transferencia: string,
     *     estado: string,
     *     con_discrepancia: bool,
     *     fecha_recepcion: string,
     *     saldos_destino_resultantes: array<string, float>,
     *     stock_en_transito_remanente: array<string, float>,
     *     movimientos_kardex_destino: array<int, array<string, mixed>>,
     *     renglones: array<int, array<string, mixed>>
     * }
     */
    public function confirmarRecepcionEnDestino(
        array $transferenciaEnTransito,
        array $saldosDisponiblesDestino,
        string $usuarioReceptorId,
        ?array $cantidadesRecibidasPorProducto = null
    ): array {
        $tenantActual = ModeloBaseTenant::obtenerTenantIdActual();

        if ($tenantActual === null || ($transferenciaEnTransito['tenant_id'] ?? '') !== $tenantActual) {
            throw new RuntimeException(
                'Violación de aislamiento Multi-Tenant al confirmar recepción de transferencia en destino.'
            );
        }

        if (($transferenciaEnTransito['estado'] ?? '') !== 'EN_TRANSITO') {
            throw new InvalidArgumentException(
                sprintf(
                    'Solo se pueden recibir transferencias en estado [EN_TRANSITO]. Estado actual: [%s].',
                    (string) ($transferenciaEnTransito['estado'] ?? 'DESCONOCIDO')
                )
            );
        }

        $saldosDestino = $saldosDisponiblesDestino;
        $stockEnTransitoRemanente = $transferenciaEnTransito['stock_en_transito'] ?? [];
        $movimientosKardexDestino = [];
        $renglonesActualizados = [];
        $conDiscrepancia = false;

        foreach ($transferenciaEnTransito['renglones'] as $renglon) {
            $productoId = (string) $renglon['product_id'];
            $sku = (string) $renglon['sku'];
            $cantidadEnviada = round((float) $renglon['cantidad_enviada'], 4);
            $costoUnitario = round((float) $renglon['costo_unitario'], 4);

            $cantidadRecibida = $cantidadesRecibidasPorProducto !== null && array_key_exists($productoId, $cantidadesRecibidasPorProducto)
                ? round((float) $cantidadesRecibidasPorProducto[$productoId], 4)
                : $cantidadEnviada;

            if ($cantidadRecibida < 0 || $cantidadRecibida > $cantidadEnviada) {
                throw new InvalidArgumentException(
                    sprintf(
                        'La cantidad recibida (%.4f) para el SKU [%s] no puede ser negativa ni superar la cantidad enviada (%.4f).',
                        $cantidadRecibida,
                        $sku,
                        $cantidadEnviada
                    )
                );
            }

            if ($cantidadRecibida < $cantidadEnviada) {
                $conDiscrepancia = true;
            }

            $saldoActualDestino = round((float) ($saldosDestino[$productoId] ?? 0.0), 4);
            $nuevoSaldoDestino = round($saldoActualDestino + $cantidadRecibida, 4);
            $saldosDestino[$productoId] = $nuevoSaldoDestino;
            $stockEnTransitoRemanente[$productoId] = 0.0;

            $movimientosKardexDestino[] = [
                'tenant_id' => $tenantActual,
                'warehouse_id' => $transferenciaEnTransito['destino_warehouse_id'],
                'product_id' => $productoId,
                'lot_id' => $renglon['lot_id'] ?? null,
                'tipo_movimiento' => 'ENTRADA_TRANSFERENCIA',
                'referencia_documento' => $transferenciaEnTransito['numero_transferencia'],
                'cantidad' => $cantidadRecibida,
                'costo_unitario' => $costoUnitario,
                'costo_total' => round($cantidadRecibida * $costoUnitario, 4),
                'saldo_cantidad' => $nuevoSaldoDestino,
                'saldo_costo_unitario' => $costoUnitario,
                'saldo_costo_total' => round($nuevoSaldoDestino * $costoUnitario, 4),
                'created_by' => $usuarioReceptorId,
            ];

            $renglonesActualizados[] = array_merge($renglon, [
                'cantidad_recibida' => $cantidadRecibida,
                'diferencia_faltante' => round($cantidadEnviada - $cantidadRecibida, 4),
            ]);
        }

        return [
            'id' => (string) $transferenciaEnTransito['id'],
            'tenant_id' => $tenantActual,
            'numero_transferencia' => (string) $transferenciaEnTransito['numero_transferencia'],
            'origen_warehouse_id' => (string) $transferenciaEnTransito['origen_warehouse_id'],
            'destino_warehouse_id' => (string) $transferenciaEnTransito['destino_warehouse_id'],
            'estado' => 'RECIBIDA',
            'con_discrepancia' => $conDiscrepancia,
            'fecha_recepcion' => gmdate('Y-m-d\TH:i:s\Z'),
            'saldos_destino_resultantes' => $saldosDestino,
            'stock_en_transito_remanente' => $stockEnTransitoRemanente,
            'movimientos_kardex_destino' => $movimientosKardexDestino,
            'renglones' => $renglonesActualizados,
        ];
    }
}
