<?php

declare(strict_types=1);

namespace App\Modulos\Kardex\Observadores;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Str;

/**
 * Evento transmitido en tiempo real por WebSockets cuando el inventario
 * alcanza o desciende del umbral de stock mínimo o punto de reorden.
 */
class StockCriticoDetectadoEvent implements ShouldBroadcast
{
    public function __construct(
        public readonly string $alertaId,
        public readonly string $tenantId,
        public readonly string $almacenId,
        public readonly string $almacenNombre,
        public readonly string $productoId,
        public readonly string $productoNombre,
        public readonly string $productoSku,
        public readonly float $stockActual,
        public readonly float $stockMinimo,
        public readonly float $puntoReorden,
        public readonly string $nivelSeveridad = 'CRITICO'
    ) {}

    /**
     * Canales privados aislados por tenant para Laravel Reverb / Pusher.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel(sprintf('tenant.%s.almacen.%s', $this->tenantId, $this->almacenId)),
            new PrivateChannel(sprintf('tenant.%s.alertas', $this->tenantId)),
        ];
    }

    /**
     * Nombre público del evento en el canal WebSocket.
     */
    public function broadcastAs(): string
    {
        return 'stock.critico.detectado';
    }

    /**
     * Carga útil distribuida a los clientes conectados.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'alerta_id' => $this->alertaId,
            'tenant_id' => $this->tenantId,
            'almacen_id' => $this->almacenId,
            'almacen_nombre' => $this->almacenNombre,
            'producto_id' => $this->productoId,
            'producto_nombre' => $this->productoNombre,
            'producto_sku' => $this->productoSku,
            'stock_actual' => $this->stockActual,
            'stock_minimo' => $this->stockMinimo,
            'punto_reorden' => $this->puntoReorden,
            'nivel_severidad' => $this->nivelSeveridad,
            'timestamp' => now()->toIso8601String(),
        ];
    }
}

/**
 * Patrón Observer que reacciona a los movimientos registrados en el Kardex.
 *
 * Responsabilidades:
 * 1. Actualizar las existencias consolidadas y por lote en `existencias_almacen`.
 * 2. Recalcular el costo promedio y valor total de inventario.
 * 3. Evaluar los umbrales de seguridad (`stock_minimo`, `punto_reorden`).
 * 4. Disparar el evento reactivo de WebSockets (`StockCriticoDetectadoEvent`) ante desabastecimiento.
 */
final class MovimientoKardexObserver
{
    /**
     * Tipos de movimiento que incrementan las existencias.
     *
     * @var array<int, string>
     */
    private const TIPOS_ENTRADA = [
        'ENTRADA_COMPRA',
        'ENTRADA_TRANSFERENCIA',
        'AJUSTE_POSITIVO',
        'PRODUCCION_ENTRADA',
        'DEVOLUCION_CLIENTE',
    ];

    /**
     * Reacciona inmediatamente después de persistir un nuevo movimiento en el Kardex.
     */
    public function created(Model $movimiento): void
    {
        $tenantId = (string) $movimiento->getAttribute('tenant_id');
        $almacenId = (string) $movimiento->getAttribute('almacen_id');
        $productoId = (string) $movimiento->getAttribute('producto_id');
        $loteId = $movimiento->getAttribute('lote_id') !== null
            ? (string) $movimiento->getAttribute('lote_id')
            : null;

        $tipoMovimiento = strtoupper((string) $movimiento->getAttribute('tipo_movimiento'));
        $cantidad = (float) $movimiento->getAttribute('cantidad');
        $costoUnitario = (float) $movimiento->getAttribute('costo_unitario');
        $costoTotal = (float) ($movimiento->getAttribute('costo_total') ?? ($cantidad * $costoUnitario));

        $esEntrada = in_array($tipoMovimiento, self::TIPOS_ENTRADA, true);

        // 1. Actualización atómica de existencias
        DB::transaction(function () use (
            $tenantId,
            $almacenId,
            $productoId,
            $loteId,
            $cantidad,
            $costoTotal,
            $esEntrada
        ): void {
            $queryExistencia = DB::table('existencias_almacen')
                ->where('tenant_id', '=', $tenantId)
                ->where('almacen_id', '=', $almacenId)
                ->where('producto_id', '=', $productoId)
                ->whereNull('deleted_at');

            if ($loteId !== null) {
                $queryExistencia->where('lote_id', '=', $loteId);
            } else {
                $queryExistencia->whereNull('lote_id');
            }

            $existencia = $queryExistencia->lockForUpdate()->first();

            if ($existencia === null) {
                $nuevaCantidad = $esEntrada ? $cantidad : -$cantidad;
                $nuevoValorTotal = $esEntrada ? $costoTotal : 0.0;
                $nuevoCostoPromedio = $nuevaCantidad > 0.0 ? round($nuevoValorTotal / $nuevaCantidad, 4) : 0.0;

                DB::table('existencias_almacen')->insert([
                    'id' => (string) Str::uuid(),
                    'tenant_id' => $tenantId,
                    'almacen_id' => $almacenId,
                    'producto_id' => $productoId,
                    'lote_id' => $loteId,
                    'cantidad_disponible' => $nuevaCantidad,
                    'cantidad_reservada' => 0.0,
                    'costo_promedio' => $nuevoCostoPromedio,
                    'valor_total' => $nuevoValorTotal,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $cantidadPrevia = (float) $existencia->cantidad_disponible;
                $valorPrevio = (float) $existencia->valor_total;

                $nuevaCantidad = $esEntrada
                    ? ($cantidadPrevia + $cantidad)
                    : ($cantidadPrevia - $cantidad);

                $nuevoValorTotal = $esEntrada
                    ? ($valorPrevio + $costoTotal)
                    : max(0.0, $valorPrevio - $costoTotal);

                $nuevoCostoPromedio = $nuevaCantidad > 0.0
                    ? round($nuevoValorTotal / $nuevaCantidad, 4)
                    : 0.0;

                $queryExistencia->update([
                    'cantidad_disponible' => $nuevaCantidad,
                    'costo_promedio' => $nuevoCostoPromedio,
                    'valor_total' => $nuevoValorTotal,
                    'updated_at' => now(),
                ]);
            }
        });

        // 2. Evaluación de umbrales críticos de inventario
        $stockActualConsolidado = (float) DB::table('existencias_almacen')
            ->where('tenant_id', '=', $tenantId)
            ->where('almacen_id', '=', $almacenId)
            ->where('producto_id', '=', $productoId)
            ->whereNull('deleted_at')
            ->sum('cantidad_disponible');

        $producto = DB::table('productos')
            ->where('id', '=', $productoId)
            ->where('tenant_id', '=', $tenantId)
            ->whereNull('deleted_at')
            ->first();

        if ($producto === null) {
            return;
        }

        $stockMinimo = (float) ($producto->stock_minimo ?? 0.0);
        $puntoReorden = (float) ($producto->punto_reorden ?? 0.0);

        if ($stockActualConsolidado <= $stockMinimo || $stockActualConsolidado <= $puntoReorden) {
            $almacen = DB::table('almacenes')
                ->where('id', '=', $almacenId)
                ->where('tenant_id', '=', $tenantId)
                ->whereNull('deleted_at')
                ->first();

            $severidad = $stockActualConsolidado <= $stockMinimo ? 'CRITICO' : 'ADVERTENCIA';

            Event::dispatch(new StockCriticoDetectadoEvent(
                alertaId: (string) Str::uuid(),
                tenantId: $tenantId,
                almacenId: $almacenId,
                almacenNombre: (string) ($almacen->nombre ?? 'Almacén Principal'),
                productoId: $productoId,
                productoNombre: (string) ($producto->nombre ?? 'Producto'),
                productoSku: (string) ($producto->sku ?? 'SKU-DESC'),
                stockActual: $stockActualConsolidado,
                stockMinimo: $stockMinimo,
                puntoReorden: $puntoReorden,
                nivelSeveridad: $severidad
            ));
        }
    }
}
