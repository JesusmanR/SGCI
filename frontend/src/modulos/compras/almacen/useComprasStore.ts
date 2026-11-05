/**
 * Store Pinia: useComprasStore
 * Módulo 6: Proveedores, Órdenes de Compra y Recepción Física en Muelle con Integración al Kardex.
 * Garantiza aislamiento Multi-Tenant (`tenant_id`), levantamiento automático de Actas de Discrepancia
 * y generación de asientos inmutables `ENTRADA_COMPRA`.
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { EntidadBaseTenant, MovimientoKardex } from '../../../compartido/tipos/entidadBase';

export type EstadoOrdenCompraSGCI =
  | 'BORRADOR'
  | 'APROBADA'
  | 'ENVIADA'
  | 'RECIBIDA_PARCIAL'
  | 'RECIBIDA_COMPLETA'
  | 'CANCELADA';

export interface RenglonOrdenCompra {
  product_id: string;
  sku: string;
  nombre_producto: string;
  cantidad_solicitada: number;
  cantidad_recibida: number;
  precio_unitario: number;
  subtotal: number;
}

export interface OrdenCompraSGCI extends EntidadBaseTenant {
  numero_orden: string;
  supplier_id: string;
  proveedor_nombre: string;
  warehouse_id: string;
  estado: EstadoOrdenCompraSGCI;
  subtotal: number;
  impuestos: number;
  total: number;
  renglones: RenglonOrdenCompra[];
}

export interface DiscrepanciaMuelleItem {
  tipo: 'AVERIA_MUELLE' | 'ENTREGA_PARCIAL_FALTANTE' | 'DIFERENCIA_PRECIO';
  product_id: string;
  sku: string;
  cantidad_afectada: number;
  detalle: string;
}

export interface ResultadoRecepcionMuelle {
  numero_orden: string;
  nuevo_estado: EstadoOrdenCompraSGCI;
  tiene_discrepancias: boolean;
  acta_discrepancias: DiscrepanciaMuelleItem[];
  movimientos_kardex: MovimientoKardex[];
}

export const useComprasStore = defineStore('compras', () => {
  const tenantActivoId = ref<string>('');
  const ordenesCompra = ref<OrdenCompraSGCI[]>([]);
  const movimientosKardexCompras = ref<MovimientoKardex[]>([]);

  function configurarContextoTenant(nuevoTenantId: string): void {
    if (!nuevoTenantId || nuevoTenantId.trim() === '') {
      throw new Error('El tenant_id es obligatorio para inicializar el módulo de Compras.');
    }
    if (tenantActivoId.value !== '' && tenantActivoId.value !== nuevoTenantId) {
      ordenesCompra.value = [];
      movimientosKardexCompras.value = [];
    }
    tenantActivoId.value = nuevoTenantId;
  }

  function emitirOrdenCompra(parametros: {
    id: string;
    tenant_id: string;
    numero_orden: string;
    supplier_id: string;
    proveedor_nombre: string;
    warehouse_id: string;
    renglones: Array<{
      product_id: string;
      sku: string;
      nombre_producto: string;
      cantidad_solicitada: number;
      precio_unitario: number;
    }>;
    tasa_iva_porcentaje?: number;
    usuario_id: string;
  }): OrdenCompraSGCI {
    if (parametros.tenant_id !== tenantActivoId.value) {
      throw new Error('Violación Cross-Tenant al emitir Orden de Compra.');
    }

    if (parametros.renglones.length === 0) {
      throw new Error('La Orden de Compra debe contener al menos un renglón.');
    }

    const tasaIva = parametros.tasa_iva_porcentaje ?? 16;
    const renglonesCalculados: RenglonOrdenCompra[] = parametros.renglones.map((r) => {
      if (r.cantidad_solicitada <= 0 || r.precio_unitario < 0) {
        throw new Error(`Cantidad o precio inválido para el SKU [${r.sku}].`);
      }
      return {
        product_id: r.product_id,
        sku: r.sku,
        nombre_producto: r.nombre_producto,
        cantidad_solicitada: r.cantidad_solicitada,
        cantidad_recibida: 0,
        precio_unitario: r.precio_unitario,
        subtotal: Number((r.cantidad_solicitada * r.precio_unitario).toFixed(4)),
      };
    });

    const subtotal = Number(
      renglonesCalculados.reduce((acc, r) => acc + r.subtotal, 0).toFixed(4),
    );
    const impuestos = Number((subtotal * (tasaIva / 100)).toFixed(4));
    const total = Number((subtotal + impuestos).toFixed(4));
    const ahora = new Date().toISOString();

    const nuevaOrden: OrdenCompraSGCI = {
      id: parametros.id,
      tenant_id: parametros.tenant_id,
      numero_orden: parametros.numero_orden,
      supplier_id: parametros.supplier_id,
      proveedor_nombre: parametros.proveedor_nombre,
      warehouse_id: parametros.warehouse_id,
      estado: 'ENVIADA',
      subtotal,
      impuestos,
      total,
      renglones: renglonesCalculados,
      created_at: ahora,
      updated_at: ahora,
      deleted_at: null,
      created_by: parametros.usuario_id,
      updated_by: parametros.usuario_id,
    };

    ordenesCompra.value.push(nuevaOrden);
    return nuevaOrden;
  }

  function procesarRecepcionEnMuelle(parametros: {
    orden_id: string;
    referencia_remision: string;
    usuario_receptor_id: string;
    renglones_recibidos: Array<{
      product_id: string;
      sku: string;
      cantidad_conforme: number;
      cantidad_averiada?: number;
      precio_factura?: number;
      lote_id?: string | null;
    }>;
  }): ResultadoRecepcionMuelle {
    const orden = ordenesCompra.value.find(
      (o) => o.id === parametros.orden_id && o.tenant_id === tenantActivoId.value,
    );

    if (!orden) {
      throw new Error('Orden de compra no encontrada en el contexto del Tenant activo.');
    }

    if (!['APROBADA', 'ENVIADA', 'RECIBIDA_PARCIAL'].includes(orden.estado)) {
      throw new Error(`La Orden [${orden.numero_orden}] en estado [${orden.estado}] no admite recepción.`);
    }

    const actaDiscrepancias: DiscrepanciaMuelleItem[] = [];
    const nuevosMovimientos: MovimientoKardex[] = [];
    const ahora = new Date().toISOString();

    for (const recibido of parametros.renglones_recibidos) {
      const linea = orden.renglones.find((r) => r.product_id === recibido.product_id);
      if (!linea) {
        throw new Error(`El SKU [${recibido.sku}] no pertenece a la Orden [${orden.numero_orden}].`);
      }

      const pendientePrevio = Number((linea.cantidad_solicitada - linea.cantidad_recibida).toFixed(4));
      if (recibido.cantidad_conforme > pendientePrevio) {
        throw new Error(
          `Sobreentrega no autorizada para el SKU [${recibido.sku}]. Pendiente: ${pendientePrevio}, Recibido: ${recibido.cantidad_conforme}.`,
        );
      }

      const averiada = recibido.cantidad_averiada ?? 0;
      if (averiada > 0) {
        actaDiscrepancias.push({
          tipo: 'AVERIA_MUELLE',
          product_id: recibido.product_id,
          sku: recibido.sku,
          cantidad_afectada: averiada,
          detalle: `Se rechazaron ${averiada} unidades en muelle por daño físico.`,
        });
      }

      linea.cantidad_recibida = Number((linea.cantidad_recibida + recibido.cantidad_conforme).toFixed(4));
      const pendienteRestante = Number((linea.cantidad_solicitada - linea.cantidad_recibida).toFixed(4));

      if (pendienteRestante > 0) {
        actaDiscrepancias.push({
          tipo: 'ENTREGA_PARCIAL_FALTANTE',
          product_id: recibido.product_id,
          sku: recibido.sku,
          cantidad_afectada: pendienteRestante,
          detalle: `Faltan ${pendienteRestante} unidades por entregar del SKU [${recibido.sku}].`,
        });
      }

      if (recibido.cantidad_conforme > 0) {
        const costoUnit = recibido.precio_factura ?? linea.precio_unitario;
        const costoTotal = Number((recibido.cantidad_conforme * costoUnit).toFixed(4));

        const asiento: MovimientoKardex = {
          id: `kdx-${orden.numero_orden}-${recibido.sku}-${Date.now()}`,
          tenant_id: tenantActivoId.value,
          producto_id: recibido.product_id,
          almacen_id: orden.warehouse_id,
          tipo_movimiento: 'ENTRADA_COMPRA',
          motivo: 'Recepción verificada de Orden de Compra en muelle',
          referencia_documento: `${orden.numero_orden} / ${parametros.referencia_remision}`,
          lote_id: recibido.lote_id ?? null,
          fecha_movimiento: ahora,
          cantidad: recibido.cantidad_conforme,
          costo_unitario: costoUnit,
          costo_total: costoTotal,
          saldo_cantidad: linea.cantidad_recibida,
          saldo_costo_unitario: costoUnit,
          saldo_costo_total: Number((linea.cantidad_recibida * costoUnit).toFixed(4)),
          created_at: ahora,
          updated_at: ahora,
          deleted_at: null,
          created_by: parametros.usuario_receptor_id,
          updated_by: parametros.usuario_receptor_id,
        };

        nuevosMovimientos.push(asiento);
        movimientosKardexCompras.value.push(asiento);
      }
    }

    const todosCompletos = orden.renglones.every(
      (r) => r.cantidad_recibida >= r.cantidad_solicitada,
    );
    orden.estado = todosCompletos ? 'RECIBIDA_COMPLETA' : 'RECIBIDA_PARCIAL';
    orden.updated_at = ahora;
    orden.updated_by = parametros.usuario_receptor_id;

    return {
      numero_orden: orden.numero_orden,
      nuevo_estado: orden.estado,
      tiene_discrepancias: actaDiscrepancias.length > 0,
      acta_discrepancias: actaDiscrepancias,
      movimientos_kardex: nuevosMovimientos,
    };
  }

  return {
    tenantActivoId,
    ordenesCompra,
    movimientosKardexCompras,
    configurarContextoTenant,
    emitirOrdenCompra,
    procesarRecepcionEnMuelle,
  };
});
