<?php

declare(strict_types=1);

namespace App\Modulos\Lotes\Acciones;

use App\Compartido\Modelos\ModeloBaseTenant;
use App\Modulos\Lotes\Modelos\LoteProducto;
use DateTimeInterface;
use InvalidArgumentException;
use RuntimeException;

/**
 * Caso de uso para colocar o liberar un Lote de Producto del estado de Cuarentena Sanitaria / Calidad.
 *
 * Un lote en cuarentena permanece contabilizado en el patrimonio del almacén pero
 * queda bloqueado en el motor FEFO para impedir su picking o venta.
 */
final class GestionarCuarentenaLoteAction
{
    /**
     * Bloquea preventivamente un lote por inspección de calidad o alerta sanitaria.
     */
    public function colocarEnCuarentena(
        LoteProducto $lote,
        string $motivo,
        string $usuarioAuditorId
    ): LoteProducto {
        $this->verificarAislamientoTenant($lote);

        if (trim($motivo) === '') {
            throw new InvalidArgumentException('Debe especificar el motivo técnico o sanitario para enviar el lote a cuarentena.');
        }

        $lote->en_cuarentena = true;
        $lote->is_active = false;
        $lote->motivo_cuarentena = trim($motivo);
        $lote->updated_by = $usuarioAuditorId;

        return $lote;
    }

    /**
     * Libera un lote de cuarentena tras dictamen favorable de calidad, siempre que no esté vencido.
     */
    public function liberarDeCuarentena(
        LoteProducto $lote,
        string $usuarioAuditorId,
        ?DateTimeInterface $fechaReferencia = null
    ): LoteProducto {
        $this->verificarAislamientoTenant($lote);

        $diasRestantes = $lote->calcularDiasParaVencimiento($fechaReferencia);
        if ($diasRestantes !== null && $diasRestantes <= 0) {
            throw new InvalidArgumentException(
                sprintf(
                    'No es posible liberar de cuarentena el lote [%s] porque ya se encuentra vencido (%d días). Debe procesarse como baja por merma.',
                    (string) $lote->numero_lote,
                    $diasRestantes
                )
            );
        }

        $lote->en_cuarentena = false;
        $lote->is_active = true;
        $lote->motivo_cuarentena = null;
        $lote->updated_by = $usuarioAuditorId;

        return $lote;
    }

    private function verificarAislamientoTenant(LoteProducto $lote): void
    {
        $tenantActual = ModeloBaseTenant::obtenerTenantIdActual();
        if ($tenantActual === null || $lote->tenant_id !== $tenantActual) {
            throw new RuntimeException('Violación Cross-Tenant al modificar el estado de cuarentena del lote.');
        }
    }
}
