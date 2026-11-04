import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  ExistenciaAlmacen,
  MovimientoKardex,
  MovimientoOffline,
  EventoStockWebSocket,
  TipoMovimientoKardex,
} from '@/compartido/tipos/entidadBase';

export const useInventarioStore = defineStore('inventario', () => {
  // -------------------------------------------------------------------------
  // Estado Reactivo
  // -------------------------------------------------------------------------
  const tenantId = ref<string | null>(null);
  const almacenSeleccionadoId = ref<string | null>(null);
  const existencias = ref<ExistenciaAlmacen[]>([]);
  const movimientosKardex = ref<MovimientoKardex[]>([]);
  const colaOffline = ref<MovimientoOffline[]>([]);
  const estaSincronizandoOffline = ref<boolean>(false);
  const cargando = ref<boolean>(false);
  const ultimoError = ref<string | null>(null);

  // -------------------------------------------------------------------------
  // Getters Computados
  // -------------------------------------------------------------------------

  /**
   * Existencias filtradas por el tenant activo y el almacén seleccionado
   */
  const existenciasFiltradas = computed(() => {
    if (!tenantId.value) return [];
    return existencias.value.filter((e) => {
      const coincideTenant = e.tenant_id === tenantId.value;
      const coincideAlmacen =
        !almacenSeleccionadoId.value || e.almacen_id === almacenSeleccionadoId.value;
      return coincideTenant && coincideAlmacen;
    });
  });

  /**
   * Productos cuyo stock disponible es menor o igual al stock mínimo configurado
   */
  const productosStockCritico = computed(() => {
    return existenciasFiltradas.value.filter((e) => {
      if (!e.producto) return false;
      return e.cantidad_disponible <= e.producto.stock_minimo;
    });
  });

  /**
   * Productos en punto de reorden (por encima del mínimo pero en o por debajo del umbral de reorden)
   */
  const productosEnReorden = computed(() => {
    return existenciasFiltradas.value.filter((e) => {
      if (!e.producto) return false;
      return (
        e.cantidad_disponible <= e.producto.punto_reorden &&
        e.cantidad_disponible > e.producto.stock_minimo
      );
    });
  });

  /**
   * Movimientos offline pendientes de sincronizar con el servidor
   */
  const movimientosOfflinePendientes = computed(() => {
    return colaOffline.value.filter((m) => m.estado_sincronizacion === 'PENDIENTE');
  });

  const totalMovimientosPendientes = computed(() => {
    return movimientosOfflinePendientes.value.length;
  });

  /**
   * Valor total del inventario para el almacén activo
   */
  const valorTotalInventarioAlmacen = computed(() => {
    return existenciasFiltradas.value.reduce(
      (acumulado, item) => acumulado + item.valor_total_inventario,
      0,
    );
  });

  // -------------------------------------------------------------------------
  // Validaciones de Seguridad Multi-Tenant
  // -------------------------------------------------------------------------

  function asegurarTenantConfigurado(): string {
    if (!tenantId.value || tenantId.value.trim() === '') {
      const mensaje = '[SGCI Multi-Tenant] Operación rechazada: No se ha establecido un tenant_id válido.';
      ultimoError.value = mensaje;
      throw new Error(mensaje);
    }
    return tenantId.value;
  }

  function validarAislamientoTenant(entidadTenantId: string, contexto: string): boolean {
    const tenantActual = asegurarTenantConfigurado();
    if (entidadTenantId !== tenantActual) {
      const advertencia = `[SGCI Violación de Aislamiento] Intento de acceso cross-tenant en ${contexto}. Actual: ${tenantActual}, Entrante: ${entidadTenantId}`;
      console.error(advertencia);
      ultimoError.value = advertencia;
      return false;
    }
    return true;
  }

  // -------------------------------------------------------------------------
  // Acciones (Actions)
  // -------------------------------------------------------------------------

  /**
   * Fija el tenant activo. Si cambia, purga los datos para evitar fuga de memoria entre tenants.
   */
  function fijarTenant(nuevoTenantId: string) {
    if (!nuevoTenantId || nuevoTenantId.trim() === '') {
      throw new Error('[SGCI Multi-Tenant] El tenant_id no puede ser vacío.');
    }

    if (tenantId.value && tenantId.value !== nuevoTenantId) {
      limpiarStore();
    }
    tenantId.value = nuevoTenantId;
  }

  function seleccionarAlmacen(almacenId: string | null) {
    almacenSeleccionadoId.value = almacenId;
  }

  function setExistencias(nuevasExistencias: ExistenciaAlmacen[]) {
    const tenantActual = asegurarTenantConfigurado();
    // Validar aislamiento de cada registro entrante
    const existenciasValidas = nuevasExistencias.filter(
      (e) => e.tenant_id === tenantActual,
    );
    existencias.value = existenciasValidas;
  }

  function setMovimientosKardex(nuevosMovimientos: MovimientoKardex[]) {
    const tenantActual = asegurarTenantConfigurado();
    const movimientosValidos = nuevosMovimientos.filter(
      (m) => m.tenant_id === tenantActual,
    );
    movimientosKardex.value = movimientosValidos;
  }

  /**
   * Encola un movimiento en modo offline (PWA) e impacta optimistamente el estado local
   */
  function registrarMovimientoOffline(datos: {
    almacen_id: string;
    producto_id: string;
    tipo_movimiento: TipoMovimientoKardex;
    cantidad: number;
    costo_unitario: number;
    referencia_documento: string;
    motivo: string;
    lote_id?: string | null;
    creado_por_id: string;
  }): MovimientoOffline {
    const tenantActual = asegurarTenantConfigurado();

    const idTemporal = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const movimientoOffline: MovimientoOffline = {
      id_temporal: idTemporal,
      tenant_id: tenantActual,
      almacen_id: datos.almacen_id,
      producto_id: datos.producto_id,
      tipo_movimiento: datos.tipo_movimiento,
      cantidad: datos.cantidad,
      costo_unitario: datos.costo_unitario,
      referencia_documento: datos.referencia_documento,
      motivo: datos.motivo,
      lote_id: datos.lote_id || null,
      fecha_registro_local: new Date().toISOString(),
      creado_por_id: datos.creado_por_id,
      estado_sincronizacion: 'PENDIENTE',
      intentos: 0,
      error_mensaje: null,
    };

    colaOffline.value.push(movimientoOffline);

    // Actualización optimista de existencias locales para respuesta inmediata del operario
    aplicarActualizacionOptimista(movimientoOffline);

    return movimientoOffline;
  }

  /**
   * Ajuste optimista del stock mientras se recupera la conexión
   */
  function aplicarActualizacionOptimista(mov: MovimientoOffline) {
    const index = existencias.value.findIndex(
      (e) => e.almacen_id === mov.almacen_id && e.producto_id === mov.producto_id,
    );

    if (index !== -1) {
      const item = { ...existencias.value[index] };
      const esEntrada =
        mov.tipo_movimiento === 'ENTRADA' ||
        mov.tipo_movimiento === 'ENTRADA_COMPRA' ||
        mov.tipo_movimiento === 'ENTRADA_TRANSFERENCIA' ||
        mov.tipo_movimiento === 'PRODUCCION_ENTRADA' ||
        mov.tipo_movimiento === 'DEVOLUCION_CLIENTE' ||
        mov.tipo_movimiento === 'AJUSTE_POSITIVO';

      if (esEntrada) {
        item.cantidad_disponible += mov.cantidad;
      } else {
        item.cantidad_disponible = Math.max(0, item.cantidad_disponible - mov.cantidad);
      }
      item.valor_total_inventario = item.cantidad_disponible * item.costo_promedio_actual;
      existencias.value[index] = item;
    }
  }

  /**
   * Sincroniza la cola offline cuando se restablece la red (PWA Mobile-First)
   */
  async function sincronizarColaOffline(
    despachadorServidor?: (mov: MovimientoOffline) => Promise<{ id_servidor: string; timestamp: string }>,
  ): Promise<{ exitosos: number; fallidos: number }> {
    asegurarTenantConfigurado();

    if (estaSincronizandoOffline.value) {
      return { exitosos: 0, fallidos: 0 };
    }

    estaSincronizandoOffline.value = true;
    let exitosos = 0;
    let fallidos = 0;

    try {
      const pendientes = colaOffline.value.filter(
        (m) => m.estado_sincronizacion === 'PENDIENTE' || m.estado_sincronizacion === 'ERROR',
      );

      for (const mov of pendientes) {
        mov.estado_sincronizacion = 'SINCRONIZANDO';
        mov.intentos += 1;

        try {
          if (despachadorServidor) {
            await despachadorServidor(mov);
          }
          mov.estado_sincronizacion = 'SINCRONIZADO';
          exitosos += 1;
        } catch (error: any) {
          mov.estado_sincronizacion = 'ERROR';
          mov.error_mensaje = error?.message || 'Error desconocido al sincronizar';
          fallidos += 1;
        }
      }
    } finally {
      estaSincronizandoOffline.value = false;
    }

    return { exitosos, fallidos };
  }

  /**
   * Manejador de eventos en tiempo real recibidos vía WebSockets (Laravel Echo / Pusher)
   * Valida estrictamente el tenant_id antes de modificar el estado reactivo.
   */
  function recibirEventoStockWebSocket(evento: EventoStockWebSocket): boolean {
    if (!validarAislamientoTenant(evento.tenant_id, 'EventoStockWebSocket')) {
      return false;
    }

    const index = existencias.value.findIndex(
      (e) => e.almacen_id === evento.almacen_id && e.producto_id === evento.producto_id,
    );

    if (index !== -1) {
      const existenciaExistente = { ...existencias.value[index] };
      existenciaExistente.cantidad_disponible = evento.nueva_cantidad_disponible;
      existenciaExistente.costo_promedio_actual = evento.nuevo_costo_promedio;
      existenciaExistente.valor_total_inventario = evento.nuevo_valor_total;
      existenciaExistente.ultima_actualizacion_kardex = evento.timestamp;
      existencias.value[index] = existenciaExistente;
      return true;
    }

    return false;
  }

  /**
   * Purga completa del estado para cambio de sesión o tenant
   */
  function limpiarStore() {
    tenantId.value = null;
    almacenSeleccionadoId.value = null;
    existencias.value = [];
    movimientosKardex.value = [];
    colaOffline.value = [];
    estaSincronizandoOffline.value = false;
    cargando.value = false;
    ultimoError.value = null;
  }

  return {
    // Estado
    tenantId,
    almacenSeleccionadoId,
    existencias,
    movimientosKardex,
    colaOffline,
    estaSincronizandoOffline,
    cargando,
    ultimoError,

    // Getters
    existenciasFiltradas,
    productosStockCritico,
    productosEnReorden,
    movimientosOfflinePendientes,
    totalMovimientosPendientes,
    valorTotalInventarioAlmacen,

    // Métodos
    fijarTenant,
    seleccionarAlmacen,
    setExistencias,
    setMovimientosKardex,
    registrarMovimientoOffline,
    sincronizarColaOffline,
    recibirEventoStockWebSocket,
    limpiarStore,
  };
});
