/**
 * Store Pinia: useLotesStore
 * Módulo 5: Control de Lotes, Series, Semáforo de Caducidad y Motor de Asignación FEFO.
 * Garantiza aislamiento Multi-Tenant (`tenant_id`) y prevención de despacho de lotes vencidos o en cuarentena.
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { LoteInventario } from '../../../compartido/tipos/entidadBase';

export type SemaforoCaducidadLote =
  | 'VIGENTE'
  | 'ADVERTENCIA'
  | 'PROXIMO_A_VENCER'
  | 'VENCIDO'
  | 'CUARENTENA'
  | 'SIN_CADUCIDAD';

export interface LoteExtendidaSGCI extends LoteInventario {
  costo_unitario_entrada: number;
  motivo_cuarentena?: string | null;
}

export interface LoteConEvaluacionFefo extends LoteExtendidaSGCI {
  dias_restantes: number | null;
  semaforo: SemaforoCaducidadLote;
  apto_para_despacho: boolean;
  prioridad_fefo: number | null;
}

export interface AsignacionPickingFefo {
  lote_id: string;
  numero_lote: string;
  cantidad_tomada: number;
  saldo_lote_restante: number;
  costo_unitario_entrada: number;
  dias_restantes: number | null;
  semaforo: SemaforoCaducidadLote;
}

export function calcularDiasEntreFechas(
  fechaVencimientoIso: string | null | undefined,
  fechaReferenciaIso?: string,
): number | null {
  if (!fechaVencimientoIso || fechaVencimientoIso.trim() === '') {
    return null;
  }

  const refDate = fechaReferenciaIso ? new Date(`${fechaReferenciaIso}T00:00:00Z`) : new Date();
  const vencDate = new Date(`${fechaVencimientoIso.slice(0, 10)}T00:00:00Z`);
  const refUtc = Date.UTC(refDate.getUTCFullYear(), refDate.getUTCMonth(), refDate.getUTCDate());
  const vencUtc = Date.UTC(vencDate.getUTCFullYear(), vencDate.getUTCMonth(), vencDate.getUTCDate());

  return Math.round((vencUtc - refUtc) / (1000 * 60 * 60 * 24));
}

export function evaluarSemaforoCaducidadLote(
  lote: Pick<LoteExtendidaSGCI, 'estado' | 'fecha_vencimiento'>,
  fechaReferenciaIso?: string,
): SemaforoCaducidadLote {
  if (lote.estado === 'CUARENTENA') {
    return 'CUARENTENA';
  }

  const dias = calcularDiasEntreFechas(lote.fecha_vencimiento, fechaReferenciaIso);
  if (dias === null) {
    return 'SIN_CADUCIDAD';
  }
  if (dias <= 0) {
    return 'VENCIDO';
  }
  if (dias <= 30) {
    return 'PROXIMO_A_VENCER';
  }
  if (dias <= 60) {
    return 'ADVERTENCIA';
  }
  return 'VIGENTE';
}

export const useLotesStore = defineStore('lotes', () => {
  const tenantActivoId = ref<string>('');
  const lotes = ref<LoteExtendidaSGCI[]>([]);

  function configurarContextoTenant(nuevoTenantId: string): void {
    if (!nuevoTenantId || nuevoTenantId.trim() === '') {
      throw new Error('El tenant_id es obligatorio para inicializar el módulo de Lotes.');
    }
    if (tenantActivoId.value !== '' && tenantActivoId.value !== nuevoTenantId) {
      lotes.value = [];
    }
    tenantActivoId.value = nuevoTenantId;
  }

  function registrarLote(nuevoLote: LoteExtendidaSGCI): void {
    if (!tenantActivoId.value || nuevoLote.tenant_id !== tenantActivoId.value) {
      throw new Error('Violación Cross-Tenant al registrar un lote de inventario.');
    }

    if (nuevoLote.cantidad_inicial <= 0) {
      throw new Error('La cantidad inicial del lote debe ser mayor a cero.');
    }

    if (nuevoLote.fecha_fabricacion && nuevoLote.fecha_vencimiento) {
      const diasVida = calcularDiasEntreFechas(
        nuevoLote.fecha_vencimiento,
        nuevoLote.fecha_fabricacion.slice(0, 10),
      );
      if (diasVida !== null && diasVida <= 0) {
        throw new Error(
          'Invariante de lote inválido: La fecha de vencimiento debe ser posterior a la fecha de fabricación.',
        );
      }
    }

    lotes.value.push({
      ...nuevoLote,
      numero_lote: nuevoLote.numero_lote.trim().toUpperCase(),
    });
  }

  function obtenerLotesOrdenadosFefo(
    productoId: string,
    fechaReferenciaIso?: string,
  ): LoteConEvaluacionFefo[] {
    const delProducto = lotes.value
      .filter(
        (l) =>
          l.tenant_id === tenantActivoId.value &&
          l.producto_id === productoId &&
          l.deleted_at === null,
      )
      .map((l) => {
        const dias = calcularDiasEntreFechas(l.fecha_vencimiento, fechaReferenciaIso);
        const semaforo = evaluarSemaforoCaducidadLote(l, fechaReferenciaIso);
        const apto =
          l.cantidad_actual > 0 && semaforo !== 'CUARENTENA' && semaforo !== 'VENCIDO';

        return {
          ...l,
          dias_restantes: dias,
          semaforo,
          apto_para_despacho: apto,
          prioridad_fefo: null as number | null,
        };
      });

    // Ordenar primero los aptos por menor cantidad de días restantes (FEFO)
    delProducto.sort((a, b) => {
      if (a.apto_para_despacho !== b.apto_para_despacho) {
        return a.apto_para_despacho ? -1 : 1;
      }
      if (a.dias_restantes === null && b.dias_restantes === null) {
        return a.numero_lote.localeCompare(b.numero_lote);
      }
      if (a.dias_restantes === null) return 1;
      if (b.dias_restantes === null) return -1;
      return a.dias_restantes - b.dias_restantes;
    });

    let contadorPrioridad = 1;
    for (const item of delProducto) {
      if (item.apto_para_despacho) {
        item.prioridad_fefo = contadorPrioridad++;
      }
    }

    return delProducto;
  }

  function planificarPickingFefo(
    productoId: string,
    cantidadRequerida: number,
    fechaReferenciaIso?: string,
  ): AsignacionPickingFefo[] {
    if (cantidadRequerida <= 0) {
      throw new Error('La cantidad requerida para picking FEFO debe ser mayor a cero.');
    }

    const evaluados = obtenerLotesOrdenadosFefo(productoId, fechaReferenciaIso).filter(
      (l) => l.apto_para_despacho,
    );

    let pendiente = Number(cantidadRequerida.toFixed(4));
    const asignaciones: AsignacionPickingFefo[] = [];

    for (const lote of evaluados) {
      if (pendiente <= 0) break;

      const tomar = Math.min(pendiente, lote.cantidad_actual);
      const restante = Number((lote.cantidad_actual - tomar).toFixed(4));

      asignaciones.push({
        lote_id: lote.id,
        numero_lote: lote.numero_lote,
        cantidad_tomada: tomar,
        saldo_lote_restante: restante,
        costo_unitario_entrada: lote.costo_unitario_entrada,
        dias_restantes: lote.dias_restantes,
        semaforo: lote.semaforo,
      });

      pendiente = Number((pendiente - tomar).toFixed(4));
    }

    if (pendiente > 0) {
      throw new Error(
        `Stock FEFO vigente insuficiente para cubrir la salida. Faltan ${pendiente} unidades (lotes vencidos o en cuarentena excluidos).`,
      );
    }

    return asignaciones;
  }

  function cambiarEstadoCuarentena(
    loteId: string,
    ponerEnCuarentena: boolean,
    motivo = '',
    fechaReferenciaIso?: string,
  ): LoteExtendidaSGCI {
    const lote = lotes.value.find(
      (l) => l.id === loteId && l.tenant_id === tenantActivoId.value,
    );

    if (!lote) {
      throw new Error('Lote no encontrado en el Tenant activo.');
    }

    if (ponerEnCuarentena) {
      if (!motivo.trim()) {
        throw new Error('El motivo técnico/sanitario es obligatorio para activar cuarentena.');
      }
      lote.estado = 'CUARENTENA';
      lote.motivo_cuarentena = motivo.trim();
      return lote;
    }

    // Verificar que no esté vencido antes de liberar
    const dias = calcularDiasEntreFechas(lote.fecha_vencimiento, fechaReferenciaIso);
    if (dias !== null && dias <= 0) {
      throw new Error(
        `No se puede liberar de cuarentena el lote [${lote.numero_lote}] porque ya se encuentra vencido.`,
      );
    }

    lote.estado = 'DISPONIBLE';
    lote.motivo_cuarentena = null;
    return lote;
  }

  return {
    tenantActivoId,
    lotes,
    configurarContextoTenant,
    registrarLote,
    obtenerLotesOrdenadosFefo,
    planificarPickingFefo,
    cambiarEstadoCuarentena,
  };
});
