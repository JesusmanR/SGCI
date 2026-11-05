<?php

declare(strict_types=1);

namespace App\Modulos\AuditoriaConteos\Servicios;

use DomainException;
use InvalidArgumentException;

/**
 * Servicio de dominio para la Reconciliación de Cola Offline-First (PWA Bodega y Caja POS).
 * Alineado con la directriz 6.3 de AGENTS.md y las pantallas Figma:
 * - 55-estado-error (Operación conservada localmente durante desconexión)
 * - 59-conexion-restablecida (Drenado automático con idempotencia y resolución por updated_at)
 */
final class ReconciliadorSincronizacionOfflineService
{
    /**
     * Procesa un lote de operaciones encoladas offline en el dispositivo móvil/PWA,
     * garantizando:
     * 1. Aislamiento estricto por `tenant_id`.
     * 2. Idempotencia mediante `idempotency_key` (evita duplicar cobros o ajustes ante reintentos de red).
     * 3. Resolución determinista de conflictos comparando `updated_at_cliente` vs `updated_at_servidor`.
     *
     * @param list<array{
     *   idempotency_key: string,
     *   tenant_id: string,
     *   tipo_operacion: string,
     *   sku: string,
     *   delta_cantidad: int,
     *   updated_at_cliente: string
     * }> $colaOperaciones
     * @param array<string, array{stock_actual: int, updated_at_servidor: string, tenant_id: string}> $estadoServidorPorSku
     * @param list<string> $llavesYaProcesadas
     * @return array{
     *   aplicadas: int,
     *   omitidas_idempotencia: int,
     *   conflictos: int,
     *   detalle_resultados: list<array{idempotency_key: string, sku: string, estado: string, motivo: string}>,
     *   estado_servidor_actualizado: array<string, array{stock_actual: int, updated_at_servidor: string, tenant_id: string}>,
     *   mensaje: string
     * }
     */
    public function sincronizarLoteOffline(
        string $tenantId,
        array $colaOperaciones,
        array $estadoServidorPorSku,
        array $llavesYaProcesadas = [],
    ): array {
        if (trim($tenantId) === '') {
            throw new InvalidArgumentException('El identificador de inquilino (tenantId) es obligatorio.');
        }

        $registroIdempotencia = array_fill_keys($llavesYaProcesadas, true);
        $aplicadas = 0;
        $omitidas = 0;
        $conflictos = 0;
        $detalle = [];

        foreach ($colaOperaciones as $op) {
            if ($op['tenant_id'] !== $tenantId) {
                throw new DomainException(
                    'Violación Multi-Tenant en lote de sincronización Offline: operación pertenece a otra empresa.'
                );
            }

            $key = $op['idempotency_key'];
            $sku = $op['sku'];

            if (isset($registroIdempotencia[$key])) {
                $omitidas++;
                $detalle[] = [
                    'idempotency_key' => $key,
                    'sku' => $sku,
                    'estado' => 'IDEMPOTENTE_OMITIDO',
                    'motivo' => 'La operación ya había sido aplicada previamente.',
                ];
                continue;
            }

            if (! isset($estadoServidorPorSku[$sku])) {
                $conflictos++;
                $detalle[] = [
                    'idempotency_key' => $key,
                    'sku' => $sku,
                    'estado' => 'CONFLICTO_REQUIERE_REVISION',
                    'motivo' => "SKU {$sku} no existe en el servidor.",
                ];
                continue;
            }

            $registroServidor = $estadoServidorPorSku[$sku];
            if ($registroServidor['tenant_id'] !== $tenantId) {
                throw new DomainException(
                    "Violación Multi-Tenant: el SKU {$sku} en servidor pertenece a otra empresa."
                );
            }

            $tsCliente = strtotime($op['updated_at_cliente']) ?: 0;
            $tsServidor = strtotime($registroServidor['updated_at_servidor']) ?: 0;

            // Si el servidor tuvo una modificación más reciente y la operación deja stock negativo, marcar conflicto
            $nuevoStock = $registroServidor['stock_actual'] + $op['delta_cantidad'];
            if ($tsCliente < $tsServidor || $nuevoStock < 0) {
                $conflictos++;
                $detalle[] = [
                    'idempotency_key' => $key,
                    'sku' => $sku,
                    'estado' => 'CONFLICTO_REQUIERE_REVISION',
                    'motivo' => $nuevoStock < 0
                        ? 'Stock insuficiente en servidor al reconciliar operación offline.'
                        : 'El registro en servidor posee una marca temporal updated_at más reciente.',
                ];
                continue;
            }

            $estadoServidorPorSku[$sku]['stock_actual'] = $nuevoStock;
            $estadoServidorPorSku[$sku]['updated_at_servidor'] = $op['updated_at_cliente'];
            $registroIdempotencia[$key] = true;
            $aplicadas++;

            $detalle[] = [
                'idempotency_key' => $key,
                'sku' => $sku,
                'estado' => 'APLICADO',
                'motivo' => 'Sincronizado correctamente en Kardex.',
            ];
        }

        return [
            'aplicadas' => $aplicadas,
            'omitidas_idempotencia' => $omitidas,
            'conflictos' => $conflictos,
            'detalle_resultados' => $detalle,
            'estado_servidor_actualizado' => $estadoServidorPorSku,
            'mensaje' => 'Conexión restablecida. La cola de operaciones offline fue reconciliada.',
        ];
    }
}
