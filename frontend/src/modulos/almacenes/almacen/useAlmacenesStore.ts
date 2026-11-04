/**
 * Store Pinia: useAlmacenesStore
 * Módulo 4: Gestión de Almacenes, Topología Bin Locations y Transferencias Inter-Almacén (Doble Paso).
 * Garantiza aislamiento Multi-Tenant (`tenant_id`) y trazabilidad de mercancía `EN_TRANSITO`.
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { EntidadBaseTenant } from '../../../compartido/tipos/entidadBase';

export interface AlmacenFisico extends EntidadBaseTenant {
  codigo: string;
  nombre: string;
  direccion: string;
  responsable_id: string | null;
  es_principal: boolean;
  activo: boolean;
}

export interface UbicacionBinAlmacen extends EntidadBaseTenant {
  almacen_id: string;
  codigo_bin: string; // Ej: ZONA-A-P04-R02-N01
  zona: string;
  pasillo: string;
  estante: string;
  nivel: string;
  capacidad_maxima: number;
  unidades_ocupadas: number;
  activa: boolean;
}

export type EstadoTransferenciaInterAlmacen =
  | 'SOLICITADA'
  | 'EN_TRANSITO'
  | 'RECIBIDA'
  | 'RECIBIDA_CON_DISCREPANCIA'
  | 'CANCELADA';

export interface TransferenciaInterAlmacen extends EntidadBaseTenant {
  numero_transferencia: string;
  almacen_origen_id: string;
  almacen_destino_id: string;
  producto_id: string;
  sku: string;
  lote_id: string | null;
  cantidad_enviada: number;
  cantidad_recibida: number;
  costo_unitario: number;
  estado: EstadoTransferenciaInterAlmacen;
  fecha_envio: string;
  fecha_recepcion: string | null;
}

export function construirCodigoBinCanonico(
  zona: string,
  pasillo: string,
  estante: string,
  nivel: string,
): string {
  const z = zona.trim().toUpperCase();
  const p = pasillo.trim().toUpperCase();
  const e = estante.trim().toUpperCase();
  const n = nivel.trim().toUpperCase();

  if (!z || !p || !e || !n) {
    throw new Error('Todos los segmentos (zona, pasillo, estante, nivel) son obligatorios para el código Bin.');
  }

  return `${z}-${p}-${e}-${n}`;
}

export const useAlmacenesStore = defineStore('almacenes', () => {
  const tenantActivoId = ref<string>('');
  const almacenes = ref<AlmacenFisico[]>([]);
  const ubicacionesBin = ref<UbicacionBinAlmacen[]>([]);
  const transferencias = ref<TransferenciaInterAlmacen[]>([]);
  // Mapa clave `${almacen_id}::${producto_id}` -> cantidad disponible
  const saldosPorAlmacenProducto = ref<Record<string, number>>({});

  function configurarContextoTenant(nuevoTenantId: string): void {
    if (!nuevoTenantId || nuevoTenantId.trim() === '') {
      throw new Error('El tenant_id es obligatorio para inicializar el módulo de Almacenes.');
    }
    if (tenantActivoId.value !== '' && tenantActivoId.value !== nuevoTenantId) {
      almacenes.value = [];
      ubicacionesBin.value = [];
      transferencias.value = [];
      saldosPorAlmacenProducto.value = {};
    }
    tenantActivoId.value = nuevoTenantId;
  }

  function fijarSaldoAlmacenProducto(almacenId: string, productoId: string, cantidad: number): void {
    saldosPorAlmacenProducto.value[`${almacenId}::${productoId}`] = cantidad;
  }

  function obtenerSaldoAlmacenProducto(almacenId: string, productoId: string): number {
    return saldosPorAlmacenProducto.value[`${almacenId}::${productoId}`] ?? 0;
  }

  function despacharTransferenciaInterAlmacen(parametros: {
    id: string;
    tenant_id: string;
    numero_transferencia: string;
    almacen_origen_id: string;
    almacen_destino_id: string;
    producto_id: string;
    sku: string;
    lote_id?: string | null;
    cantidad: number;
    costo_unitario: number;
    usuario_id: string;
  }): TransferenciaInterAlmacen {
    if (parametros.tenant_id !== tenantActivoId.value) {
      throw new Error('Violación Cross-Tenant al despachar transferencia inter-almacén.');
    }

    if (parametros.almacen_origen_id === parametros.almacen_destino_id) {
      throw new Error('El almacén de origen y el almacén de destino no pueden ser el mismo.');
    }

    if (parametros.cantidad <= 0) {
      throw new Error('La cantidad a transferir debe ser mayor a cero.');
    }

    const disponibleOrigen = obtenerSaldoAlmacenProducto(
      parametros.almacen_origen_id,
      parametros.producto_id,
    );

    if (disponibleOrigen < parametros.cantidad) {
      throw new Error(
        `Stock insuficiente en el almacén origen para el SKU [${parametros.sku}]. Disponible: ${disponibleOrigen}, Solicitado: ${parametros.cantidad}.`,
      );
    }

    // Descontar del almacén origen y pasar a estado EN_TRANSITO
    fijarSaldoAlmacenProducto(
      parametros.almacen_origen_id,
      parametros.producto_id,
      Number((disponibleOrigen - parametros.cantidad).toFixed(4)),
    );

    const ahora = new Date().toISOString();
    const nuevaTransferencia: TransferenciaInterAlmacen = {
      id: parametros.id,
      tenant_id: parametros.tenant_id,
      numero_transferencia: parametros.numero_transferencia,
      almacen_origen_id: parametros.almacen_origen_id,
      almacen_destino_id: parametros.almacen_destino_id,
      producto_id: parametros.producto_id,
      sku: parametros.sku,
      lote_id: parametros.lote_id ?? null,
      cantidad_enviada: parametros.cantidad,
      cantidad_recibida: 0,
      costo_unitario: parametros.costo_unitario,
      estado: 'EN_TRANSITO',
      fecha_envio: ahora,
      fecha_recepcion: null,
      created_at: ahora,
      updated_at: ahora,
      deleted_at: null,
      created_by: parametros.usuario_id,
      updated_by: parametros.usuario_id,
    };

    transferencias.value.push(nuevaTransferencia);
    return nuevaTransferencia;
  }

  function confirmarRecepcionTransferencia(
    transferenciaId: string,
    cantidadRecibida: number,
    usuarioReceptorId: string,
  ): TransferenciaInterAlmacen {
    const trf = transferencias.value.find(
      (t) => t.id === transferenciaId && t.tenant_id === tenantActivoId.value,
    );

    if (!trf) {
      throw new Error('Transferencia no encontrada en el contexto del Tenant activo.');
    }

    if (trf.estado !== 'EN_TRANSITO') {
      throw new Error(`La transferencia [${trf.numero_transferencia}] no se encuentra EN_TRANSITO.`);
    }

    if (cantidadRecibida < 0 || cantidadRecibida > trf.cantidad_enviada) {
      throw new Error('La cantidad recibida no puede ser negativa ni exceder la cantidad enviada.');
    }

    const saldoDestinoActual = obtenerSaldoAlmacenProducto(trf.almacen_destino_id, trf.producto_id);
    fijarSaldoAlmacenProducto(
      trf.almacen_destino_id,
      trf.producto_id,
      Number((saldoDestinoActual + cantidadRecibida).toFixed(4)),
    );

    trf.cantidad_recibida = cantidadRecibida;
    trf.estado =
      cantidadRecibida < trf.cantidad_enviada ? 'RECIBIDA_CON_DISCREPANCIA' : 'RECIBIDA';
    trf.fecha_recepcion = new Date().toISOString();
    trf.updated_by = usuarioReceptorId;
    trf.updated_at = trf.fecha_recepcion;

    return trf;
  }

  const transferenciasEnTransito = computed(() =>
    transferencias.value.filter(
      (t) => t.tenant_id === tenantActivoId.value && t.estado === 'EN_TRANSITO',
    ),
  );

  return {
    tenantActivoId,
    almacenes,
    ubicacionesBin,
    transferencias,
    transferenciasEnTransito,
    configurarContextoTenant,
    fijarSaldoAlmacenProducto,
    obtenerSaldoAlmacenProducto,
    despacharTransferenciaInterAlmacen,
    confirmarRecepcionTransferencia,
  };
});
