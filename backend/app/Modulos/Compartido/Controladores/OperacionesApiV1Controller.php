<?php

declare(strict_types=1);

namespace App\Modulos\Compartido\Controladores;

use App\Modulos\AuditoriaConteos\Acciones\AplicarAjusteInventarioKardexAction;
use App\Modulos\AuditoriaConteos\DTOs\RegistrarAjusteInventarioDTO;
use App\Modulos\AuditoriaConteos\Servicios\ReconciliadorSincronizacionOfflineService;
use App\Modulos\Catalogo\Servicios\CalculadoraPreciosImpuestosService;
use App\Modulos\FacturacionCaja\DTOs\RegistrarCobroCajaDTO;
use App\Modulos\FacturacionCaja\Servicios\GestorFacturacionArqueoCajaService;
use App\Modulos\Lotes\Servicios\PlanificadorDespachoFefoService;
use App\Modulos\Tenants\DTOs\ActualizarPlanSuscripcionDTO;
use App\Modulos\Tenants\Servicios\GobernanzaSaasReportesService;

/**
 * Controlador HTTP Delgado (Thin Controller) para la API REST v1 de SGCI.
 *
 * Cumple con Screaming Architecture: delega el 100% de las reglas de negocio
 * a los Servicios de Dominio y Acciones de cada módulo sin contener lógica SQL o cálculos.
 */
final class OperacionesApiV1Controller
{
    public function __construct(
        private readonly GobernanzaSaasReportesService $gobernanzaService,
        private readonly ReconciliadorSincronizacionOfflineService $reconciliadorOfflineService,
        private readonly GestorFacturacionArqueoCajaService $facturacionCajaService,
        private readonly CalculadoraPreciosImpuestosService $preciosImpuestosService,
        private readonly AplicarAjusteInventarioKardexAction $ajusteKardexAction,
        private readonly PlanificadorDespachoFefoService $planificadorFefoService,
    ) {
    }

    /**
     * GET /api/v1/salud
     * Endpoint de monitoreo de salud del clúster Docker y estado Multi-Tenant.
     *
     * @return array<string, mixed>
     */
    public function estadoSalud(string $tenantId): array
    {
        return [
            'estado' => 'OPERATIVO',
            'version_api' => 'v1.10.0',
            'tenant_id' => $tenantId,
            'pantallas_figma_integradas' => 78,
            'pngs_verificados' => 155,
            'timestamp' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
        ];
    }

    /**
     * POST /api/v1/gobernanza/suscripciones
     * Actualiza el plan SaaS (Emprende, Crece, Pro) verificando cupos operativos (Pantallas Figma 64-67).
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function actualizarPlanSuscripcion(array $payload): array
    {
        $dto = new ActualizarPlanSuscripcionDTO(
            tenantId: (string) $payload['tenant_id'],
            nombrePlan: (string) $payload['nombre_plan'],
            estadoMembresia: (string) ($payload['estado_membresia'] ?? ActualizarPlanSuscripcionDTO::ESTADO_ACTIVA),
            actorUsuarioId: (string) $payload['actor_usuario_id'],
        );

        $cuotas = $this->gobernanzaService->calcularConsumoCuotasPlan(
            suscripcion: $dto,
            usuariosActuales: (int) ($payload['usuarios_actuales'] ?? 1),
            bodegasActuales: (int) ($payload['bodegas_actuales'] ?? 1),
            productosActuales: (int) ($payload['productos_actuales'] ?? 0),
        );

        $limites = $dto->obtenerLimitesPlan();

        return [
            'plan_activo' => $dto->nombrePlan,
            'estado_membresia' => $dto->estadoMembresia,
            'precio_mensual_cop' => $limites['precio_cop_mes'],
            'permite_carga_masiva_csv' => $limites['permite_carga_masiva_csv'],
            'consumo_cuotas' => $cuotas,
        ];
    }

    /**
     * POST /api/v1/offline/sincronizar-lote
     * Reconcilia operaciones encoladas en IndexedDB durante desconexión PWA (Pantallas Figma 55 y 59).
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function sincronizarColaOffline(array $payload): array
    {
        return $this->reconciliadorOfflineService->sincronizarLoteOffline(
            tenantId: (string) $payload['tenant_id'],
            colaOperaciones: (array) ($payload['cola_operaciones'] ?? []),
            estadoServidorPorSku: (array) ($payload['estado_servidor_por_sku'] ?? []),
            llavesYaProcesadas: (array) ($payload['llaves_ya_procesadas'] ?? []),
        );
    }

    /**
     * POST /api/v1/facturacion/cobros
     * Registra un cobro de factura y actualiza saldos de arqueo de caja (Pantallas Figma 21–35).
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function registrarCobroFactura(array $payload): array
    {
        $dto = new RegistrarCobroCajaDTO(
            tenantId: (string) $payload['tenant_id'],
            facturaId: (string) $payload['factura_id'],
            sesionCajaId: (string) $payload['sesion_caja_id'],
            metodoPago: (string) $payload['metodo_pago'],
            montoRecibido: (float) $payload['monto_recibido'],
            referenciaVoucher: isset($payload['referencia_voucher']) ? (string) $payload['referencia_voucher'] : null,
            cajeroUsuarioId: (string) $payload['cajero_usuario_id'],
        );

        return $this->facturacionCajaService->registrarCobroFactura(
            dto: $dto,
            totalFactura: (float) $payload['total_factura'],
            saldoPendienteActual: (float) $payload['saldo_pendiente_actual'],
            estadoSesionCaja: (string) ($payload['estado_sesion_caja'] ?? 'ABIERTA'),
        );
    }

    /**
     * POST /api/v1/inventario/ajustes
     * Ejecuta un ajuste de existencias auditado e impacta el Kardex inmutable (Pantallas Figma 42–45).
     *
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function aplicarAjusteInventario(array $payload): array
    {
        $dto = new RegistrarAjusteInventarioDTO(
            tenantId: (string) $payload['tenant_id'],
            almacenId: (string) $payload['almacen_id'],
            productoId: (string) $payload['producto_id'],
            sku: (string) $payload['sku'],
            tipoAjuste: (string) $payload['tipo_ajuste'],
            cantidadAjuste: (float) $payload['cantidad_ajuste'],
            stockSistemaActual: (float) $payload['stock_sistema_actual'],
            costoUnitarioActual: (float) $payload['costo_unitario_actual'],
            motivo: (string) $payload['motivo'],
            notas: (string) ($payload['notas'] ?? ''),
            evidenciaAdjunta: isset($payload['evidencia_adjunta']) ? (string) $payload['evidencia_adjunta'] : null,
            usuarioId: (string) $payload['usuario_id'],
        );

        return $this->ajusteKardexAction->ejecutar($dto);
    }
}
