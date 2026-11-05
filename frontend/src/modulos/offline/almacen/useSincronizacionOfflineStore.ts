import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type TipoOperacionOffline =
  | 'CONTEO_FISICO_CIEGO'
  | 'COBRO_POS_OFFLINE'
  | 'RECEPCION_MUELLE_OFFLINE';

export interface OperacionColaOffline {
  idempotencyKey: string;
  tenantId: string;
  tipoOperacion: TipoOperacionOffline;
  sku: string;
  deltaCantidad: number;
  updatedAtCliente: string;
  estadoSincronizacion: 'PENDIENTE' | 'APLICADO' | 'CONFLICTO';
}

/**
 * Store Pinia del Sprint 9: Resiliencia PWA Offline-First, Cola IndexedDB y Background Sync
 * (Pantallas Figma 55-estado-error y 59-conexion-restablecida).
 */
export const useSincronizacionOfflineStore = defineStore('sincronizacionOffline', () => {
  const tenantActivoId = ref<string>('11111111-1111-4111-8111-111111111111');
  const enLinea = ref<boolean>(true);
  const colaOperaciones = ref<OperacionColaOffline[]>([]);
  const llavesProcesadas = ref<string[]>([]);
  const mensajeEstadoConexion = ref<string | null>(null);

  const operacionesPendientesDelTenant = computed<OperacionColaOffline[]>(() =>
    colaOperaciones.value.filter(
      (op) => op.tenantId === tenantActivoId.value && op.estadoSincronizacion === 'PENDIENTE',
    ),
  );

  function establecerContextoTenant(tenantId: string): void {
    tenantActivoId.value = tenantId;
    mensajeEstadoConexion.value = null;
  }

  function cambiarEstadoRed(conectado: boolean): void {
    enLinea.value = conectado;
    mensajeEstadoConexion.value = conectado
      ? 'Conexión restablecida. La simulación se completó correctamente.'
      : 'Parece que la conexión se interrumpió. Tus cambios confirmados en esta sesión siguen aquí.';
  }

  function encolarOperacionOffline( entrada: {
    idempotencyKey: string;
    tenantId: string;
    tipoOperacion: TipoOperacionOffline;
    sku: string;
    deltaCantidad: number;
    updatedAtCliente: string;
  }): OperacionColaOffline {
    if (entrada.tenantId !== tenantActivoId.value) {
      throw new Error('Violación Multi-Tenant al encolar operación offline.');
    }

    const item: OperacionColaOffline = {
      ...entrada,
      estadoSincronizacion: 'PENDIENTE',
    };
    colaOperaciones.value = [...colaOperaciones.value, item];
    return item;
  }

  /**
   * Drena la cola pendiente al restablecerse la conexión resolviendo idempotencia y updated_at.
   */
  function drenarColaAlReconectar(
    estadoServidorPorSku: Record<string, { stockActual: number; updatedAtServidor: string }>,
  ): { aplicadas: number; omitidas: number; conflictos: number } {
    enLinea.value = true;
    let aplicadas = 0;
    let omitidas = 0;
    let conflictos = 0;

    colaOperaciones.value = colaOperaciones.value.map((op) => {
      if (op.tenantId !== tenantActivoId.value || op.estadoSincronizacion !== 'PENDIENTE') {
        return op;
      }

      if (llavesProcesadas.value.includes(op.idempotencyKey)) {
        omitidas++;
        return { ...op, estadoSincronizacion: 'APLICADO' };
      }

      const srv = estadoServidorPorSku[op.sku];
      if (!srv) {
        conflictos++;
        return { ...op, estadoSincronizacion: 'CONFLICTO' };
      }

      const tsCli = Date.parse(op.updatedAtCliente);
      const tsSrv = Date.parse(srv.updatedAtServidor);
      const nuevoStock = srv.stockActual + op.deltaCantidad;

      if (tsCli < tsSrv || nuevoStock < 0) {
        conflictos++;
        return { ...op, estadoSincronizacion: 'CONFLICTO' };
      }

      srv.stockActual = nuevoStock;
      srv.updatedAtServidor = op.updatedAtCliente;
      llavesProcesadas.value = [...llavesProcesadas.value, op.idempotencyKey];
      aplicadas++;

      return { ...op, estadoSincronizacion: 'APLICADO' };
    });

    mensajeEstadoConexion.value =
      'Conexión restablecida. La simulación se completó correctamente. Puedes continuar con tu operación.';

    return { aplicadas, omitidas, conflictos };
  }

  return {
    tenantActivoId,
    enLinea,
    colaOperaciones,
    llavesProcesadas,
    mensajeEstadoConexion,
    operacionesPendientesDelTenant,
    establecerContextoTenant,
    cambiarEstadoRed,
    encolarOperacionOffline,
    drenarColaAlReconectar,
  };
});
