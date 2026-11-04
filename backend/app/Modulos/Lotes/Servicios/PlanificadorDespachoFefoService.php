<?php

declare(strict_types=1);

namespace App\Modulos\Lotes\Servicios;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Lotes\Modelos\LoteProducto;
use DateTimeInterface;
use InvalidArgumentException;
use RuntimeException;

/**
 * Motor de asignación y despacho por regla FEFO (First Expired, First Out).
 *
 * Selecciona automáticamente los lotes elegibles del mismo `tenant_id` y `product_id`,
 * descartando lotes vencidos o en cuarentena, y ordenándolos desde el vencimiento más próximo
 * hacia el más lejano para minimizar mermas por caducidad.
 */
final class PlanificadorDespachoFefoService
{
    /**
     * Ordena y asigna lotes para cubrir una cantidad solicitada de salida.
     *
     * @param array<int, LoteProducto> $lotesCandidatos
     * @return array{
     *     cantidad_total_asignada: float,
     *     asignaciones: array<int, array{
     *         lot_id: string,
     *         numero_lote: string,
     *         cantidad_tomada: float,
     *         saldo_lote_restante: float,
     *         costo_unitario_entrada: float,
     *         dias_para_vencimiento: ?int,
     *         semaforo_caducidad: string
     *     }>,
     *     lotes_omitidos: array<int, array{numero_lote: string, motivo: string}>
     * }
     */
    public function asignarLotesParaSalida(
        string $productId,
        float $cantidadRequerida,
        array $lotesCandidatos,
        ?DateTimeInterface $fechaReferencia = null
    ): array {
        if ($cantidadRequerida <= 0) {
            throw new InvalidArgumentException('La cantidad requerida para despacho FEFO debe ser mayor a cero.');
        }

        $tenantActual = ModeloBaseTenant::obtenerTenantIdActual();
        if ($tenantActual === null || $tenantActual === '') {
            throw new RuntimeException('No existe un contexto tenant_id activo para planificar el despacho FEFO.');
        }

        $lotesAptos = [];
        $lotesOmitidos = [];

        foreach ($lotesCandidatos as $lote) {
            if ($lote->tenant_id !== $tenantActual) {
                throw new RuntimeException(
                    sprintf(
                        'Violación Cross-Tenant en motor FEFO: Lote [%s] pertenece al Tenant [%s], esperado [%s].',
                        (string) $lote->numero_lote,
                        (string) $lote->tenant_id,
                        $tenantActual
                    )
                );
            }

            if ($lote->product_id !== $productId) {
                continue;
            }

            $semaforo = $lote->evaluarSemaforoCaducidad($fechaReferencia);

            if ($semaforo === 'CUARENTENA') {
                $lotesOmitidos[] = [
                    'numero_lote' => (string) $lote->numero_lote,
                    'motivo' => 'BLOQUEADO_CUARENTENA',
                ];
                continue;
            }

            if ($semaforo === 'VENCIDO') {
                $lotesOmitidos[] = [
                    'numero_lote' => (string) $lote->numero_lote,
                    'motivo' => 'LOTE_VENCIDO',
                ];
                continue;
            }

            if ((float) $lote->stock_actual <= 0.0) {
                $lotesOmitidos[] = [
                    'numero_lote' => (string) $lote->numero_lote,
                    'motivo' => 'SIN_EXISTENCIA',
                ];
                continue;
            }

            $lotesAptos[] = $lote;
        }

        // Ordenamiento FEFO estricto: menor cantidad de días para vencer va primero; lotes sin caducidad van al final
        usort($lotesAptos, static function (LoteProducto $a, LoteProducto $b) use ($fechaReferencia): int {
            $diasA = $a->calcularDiasParaVencimiento($fechaReferencia);
            $diasB = $b->calcularDiasParaVencimiento($fechaReferencia);

            if ($diasA === null && $diasB === null) {
                return strcmp((string) $a->numero_lote, (string) $b->numero_lote);
            }
            if ($diasA === null) {
                return 1;
            }
            if ($diasB === null) {
                return -1;
            }

            if ($diasA !== $diasB) {
                return $diasA <=> $diasB;
            }

            return strcmp((string) $a->numero_lote, (string) $b->numero_lote);
        });

        $pendientePorCubrir = round($cantidadRequerida, 4);
        $asignaciones = [];

        foreach ($lotesAptos as $lote) {
            if ($pendientePorCubrir <= 0.0) {
                break;
            }

            $disponibleEnLote = round((float) $lote->stock_actual, 4);
            $cantidadTomada = min($pendientePorCubrir, $disponibleEnLote);
            $saldoRestante = round($disponibleEnLote - $cantidadTomada, 4);

            $asignaciones[] = [
                'lot_id' => (string) $lote->id,
                'numero_lote' => (string) $lote->numero_lote,
                'cantidad_tomada' => $cantidadTomada,
                'saldo_lote_restante' => $saldoRestante,
                'costo_unitario_entrada' => round((float) $lote->costo_unitario_entrada, 4),
                'dias_para_vencimiento' => $lote->calcularDiasParaVencimiento($fechaReferencia),
                'semaforo_caducidad' => $lote->evaluarSemaforoCaducidad($fechaReferencia),
            ];

            $pendientePorCubrir = round($pendientePorCubrir - $cantidadTomada, 4);
        }

        if ($pendientePorCubrir > 0.0) {
            throw new InvalidArgumentException(
                sprintf(
                    'Stock FEFO vigente insuficiente para el producto [%s]. Faltan %.4f unidades (los lotes vencidos o en cuarentena no pueden despacharse).',
                    $productId,
                    $pendientePorCubrir
                )
            );
        }

        return [
            'cantidad_total_asignada' => round($cantidadRequerida, 4),
            'asignaciones' => $asignaciones,
            'lotes_omitidos' => $lotesOmitidos,
        ];
    }
}
