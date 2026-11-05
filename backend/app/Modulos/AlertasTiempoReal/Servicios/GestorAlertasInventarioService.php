<?php

declare(strict_types=1);

namespace App\Modulos\AlertasTiempoReal\Servicios;

use App\Modulos\AlertasTiempoReal\Modelos\AlertaInventario;
use DomainException;

/**
 * Servicio de dominio para la evaluación de alertas en tiempo real (Stock bajo,
 * vencimiento de lotes, órdenes pendientes) y gestión de lectura por tenant_id
 * (Pantallas Figma 68-notificaciones y 69-notificaciones-leidas).
 */
final class GestorAlertasInventarioService
{
    /**
     * Genera alertas automáticas para productos cuyo stock actual cayó en o por debajo del mínimo.
     *
     * @param list<array{id: string, tenant_id: string, sku: string, nombre: string, stock_actual: int, stock_minimo: int, bodega: string}> $productos
     * @return list<array{
     *   id: string,
     *   tenant_id: string,
     *   tipo_alerta: string,
     *   severidad: string,
     *   titulo: string,
     *   detalle: string,
     *   leida: bool,
     *   vista_destino: string
     * }>
     */
    public function generarAlertasStockBajo(string $tenantId, array $productos): array
    {
        $alertas = [];

        foreach ($productos as $prod) {
            if ($prod['tenant_id'] !== $tenantId) {
                throw new DomainException(
                    'Violación Multi-Tenant: intento de evaluar alertas sobre productos de otro inquilino.'
                );
            }

            if ($prod['stock_actual'] <= $prod['stock_minimo']) {
                $severidad = $prod['stock_actual'] === 0
                    ? AlertaInventario::SEVERIDAD_CRITICA
                    : AlertaInventario::SEVERIDAD_ADVERTENCIA;

                $alertas[] = [
                    'id' => 'alerta-stock-' . $prod['sku'],
                    'tenant_id' => $tenantId,
                    'tipo_alerta' => AlertaInventario::TIPO_STOCK_CRITICO,
                    'severidad' => $severidad,
                    'titulo' => "Stock bajo en {$prod['nombre']}",
                    'detalle' => "Quedan {$prod['stock_actual']} uds. en {$prod['bodega']} (mínimo {$prod['stock_minimo']}).",
                    'leida' => false,
                    'vista_destino' => 'orders',
                ];
            }
        }

        return $alertas;
    }

    /**
     * Marca todas las notificaciones del tenant activo como leídas
     * (Pantalla Figma 69-notificaciones-leidas).
     *
     * @param list<array{id: string, tenant_id: string, leida: bool}> $notificaciones
     * @return list<array{id: string, tenant_id: string, leida: bool}>
     */
    public function marcarTodasComoLeidas(string $tenantId, array $notificaciones): array
    {
        return array_map(static function (array $item) use ($tenantId): array {
            if ($item['tenant_id'] !== $tenantId) {
                throw new DomainException(
                    'Violación Multi-Tenant: no se pueden modificar notificaciones de otra empresa.'
                );
            }
            $item['leida'] = true;

            return $item;
        }, $notificaciones);
    }
}
