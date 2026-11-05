import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { EntidadBaseTenant } from '../../../compartido/tipos/entidadBase';

export type MotivoAjusteFigma =
  | 'Conteo físico'
  | 'Producto dañado / merma'
  | 'Pérdida'
  | 'Corrección de registro'
  | 'Otro';

export type TipoMovimientoKardexAjuste =
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO'
  | 'MERMA_DANO';

export interface ProductoInventarioAjustable extends EntidadBaseTenant {
  sku: string;
  nombre: string;
  almacenId: string;
  bodegaNombre: string;
  stockActual: number;
  stockMinimo: number;
  costoUnitarioBase: number;
}

export interface MovimientoAjusteKardex extends EntidadBaseTenant {
  productoId: string;
  almacenId: string;
  sku: string;
  productoNombre: string;
  bodegaNombre: string;
  stockAnterior: number;
  cantidadRealContada: number;
  variacion: number;
  tipoMovimientoKardex: TipoMovimientoKardexAjuste;
  motivo: MotivoAjusteFigma;
  observaciones: string;
  operadorId: string;
  supervisorAprobadorId: string | null;
  impactoFinancieroValor: number;
  referencia: string;
}

export interface SolicitudAjusteExistencias {
  tenantId: string;
  almacenId: string;
  productoId: string;
  cantidadRealContada: number;
  motivo: MotivoAjusteFigma;
  observaciones?: string;
  operadorId: string;
  supervisorAprobadorId?: string | null;
}

export const MOTIVOS_AJUSTE_FIGMA: readonly MotivoAjusteFigma[] = [
  'Conteo físico',
  'Producto dañado / merma',
  'Pérdida',
  'Corrección de registro',
  'Otro',
] as const;

export const UMBRAL_DOBLE_FIRMA_UNIDADES = 50;
export const UMBRAL_DOBLE_FIRMA_VALOR = 500000;

/**
 * Store Pinia del módulo de Auditoría, Conteos Ciegos y Ajustes de Inventario.
 * Réplica funcional exacta de las pantallas Figma:
 * - 42-historial-inventario (Escritorio 1440px / Móvil 390px)
 * - 43-nuevo-ajuste
 * - 44-ajuste-revision
 * - 45-ajuste-confirmado
 * - 78-inventario-sin-movimientos
 */
export const useAuditoriaConteosStore = defineStore('auditoriaConteos', () => {
  const tenantActivoId = ref<string>('11111111-1111-4111-8111-111111111111');
  const almacenActivoId = ref<string>('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

  const productosCatalogo = ref<ProductoInventarioAjustable[]>([]);
  const movimientosAjuste = ref<MovimientoAjusteKardex[]>([]);
  const avisoConfirmacionReciente = ref<string | null>(null);

  /**
   * Filtra los productos pertenecientes exclusivamente al tenant y almacén activo.
   */
  const productosDelTenant = computed<ProductoInventarioAjustable[]>(() =>
    productosCatalogo.value.filter(
      (prod) =>
        prod.tenant_id === tenantActivoId.value &&
        prod.almacenId === almacenActivoId.value &&
        prod.deleted_at === null,
    ),
  );

  /**
   * Filtra los ajustes registrados en la sesión para el tenant y almacén activo.
   */
  const movimientosDelTenant = computed<MovimientoAjusteKardex[]>(() =>
    movimientosAjuste.value.filter(
      (mov) =>
        mov.tenant_id === tenantActivoId.value &&
        mov.almacenId === almacenActivoId.value &&
        mov.deleted_at === null,
    ),
  );

  /**
   * KPI 1 (Pantalla Figma 42): "Unidades disponibles" (Existencias actuales · Bodega principal).
   */
  const totalUnidadesDisponibles = computed<number>(() =>
    productosDelTenant.value.reduce((acc, prod) => acc + prod.stockActual, 0),
  );

  /**
   * KPI 2 (Pantalla Figma 42): "Movimientos registrados" (Ajustes, recepciones y ventas de esta sesión).
   */
  const totalMovimientosRegistrados = computed<number>(() => movimientosDelTenant.value.length);

  /**
   * KPI 3 (Pantalla Figma 42): "Productos con stock bajo" (Por debajo del mínimo configurado).
   */
  const totalProductosStockBajo = computed<number>(() =>
    productosDelTenant.value.filter((prod) => prod.stockActual <= prod.stockMinimo).length,
  );

  function establecerContextoTenant(tenantId: string, almacenId: string): void {
    tenantActivoId.value = tenantId;
    almacenActivoId.value = almacenId;
    avisoConfirmacionReciente.value = null;
  }

  function cargarProductosIniciales(productos: ProductoInventarioAjustable[]): void {
    productosCatalogo.value = [...productos];
  }

  function resolverTipoMovimientoKardex(
    variacion: number,
    motivo: MotivoAjusteFigma,
  ): TipoMovimientoKardexAjuste {
    if (variacion > 0) {
      return 'AJUSTE_POSITIVO';
    }
    if (motivo === 'Producto dañado / merma' || motivo === 'Pérdida') {
      return 'MERMA_DANO';
    }
    return 'AJUSTE_NEGATIVO';
  }

  /**
   * Registra un ajuste de existencias validando invariantes de negocio:
   * 1. Aislamiento estricto por tenant_id.
   * 2. Cantidad real contada >= 0.
   * 3. Variación distinta de 0.
   * 4. Si el motivo es "Otro", la observación es obligatoria (Pantalla Figma 43/44).
   * 5. Segregación de funciones (doble firma) en discrepancias críticas.
   */
  function registrarAjusteExistencias(
    solicitud: SolicitudAjusteExistencias,
  ): MovimientoAjusteKardex {
    if (solicitud.tenantId !== tenantActivoId.value) {
      throw new Error(
        'Violación de aislamiento Multi-Tenant: No se permite ajustar existencias de otra organización.',
      );
    }

    const producto = productosCatalogo.value.find(
      (item) =>
        item.id === solicitud.productoId &&
        item.tenant_id === solicitud.tenantId &&
        item.almacenId === solicitud.almacenId &&
        item.deleted_at === null,
    );

    if (!producto) {
      throw new Error('El producto seleccionado no existe en la bodega activa del inquilino.');
    }

    if (!Number.isFinite(solicitud.cantidadRealContada) || solicitud.cantidadRealContada < 0) {
      throw new Error('La cantidad real contada no puede ser negativa.');
    }

    const variacion = Number((solicitud.cantidadRealContada - producto.stockActual).toFixed(4));
    if (variacion === 0) {
      throw new Error(
        'La cantidad real contada coincide con el stock actual; no existe variación a registrar.',
      );
    }

    const textoObservaciones = (solicitud.observaciones ?? '').trim();
    if (solicitud.motivo === 'Otro' && textoObservaciones.length === 0) {
      throw new Error(
        'Cuando el motivo del ajuste es "Otro", el campo de observaciones es obligatorio.',
      );
    }

    const impactoFinancieroValor = Number(
      (Math.abs(variacion) * producto.costoUnitarioBase).toFixed(2),
    );
    const requiereDobleFirma =
      Math.abs(variacion) >= UMBRAL_DOBLE_FIRMA_UNIDADES ||
      impactoFinancieroValor >= UMBRAL_DOBLE_FIRMA_VALOR;

    if (requiereDobleFirma) {
      if (!solicitud.supervisorAprobadorId) {
        throw new Error(
          'Este ajuste supera el umbral de auditoría y requiere la firma de un supervisor aprobador.',
        );
      }
      if (solicitud.supervisorAprobadorId === solicitud.operadorId) {
        throw new Error(
          'Violación de segregación de funciones: El operador de conteo no puede auto-aprobar un ajuste crítico.',
        );
      }
    }

    const ahoraIso = new Date().toISOString();
    const stockAnterior = producto.stockActual;
    producto.stockActual = solicitud.cantidadRealContada;
    producto.updated_at = ahoraIso;
    producto.updated_by = solicitud.operadorId;

    const nuevoMovimiento: MovimientoAjusteKardex = {
      id: crypto.randomUUID(),
      tenant_id: solicitud.tenantId,
      productoId: producto.id,
      almacenId: producto.almacenId,
      sku: producto.sku,
      productoNombre: producto.nombre,
      bodegaNombre: producto.bodegaNombre,
      stockAnterior,
      cantidadRealContada: solicitud.cantidadRealContada,
      variacion,
      tipoMovimientoKardex: resolverTipoMovimientoKardex(variacion, solicitud.motivo),
      motivo: solicitud.motivo,
      observaciones: textoObservaciones || solicitud.motivo,
      operadorId: solicitud.operadorId,
      supervisorAprobadorId: solicitud.supervisorAprobadorId ?? null,
      impactoFinancieroValor,
      referencia: `Ajuste · ${solicitud.motivo}`,
      created_at: ahoraIso,
      updated_at: ahoraIso,
      deleted_at: null,
      created_by: solicitud.operadorId,
      updated_by: solicitud.operadorId,
    };

    movimientosAjuste.value = [nuevoMovimiento, ...movimientosAjuste.value];

    // Mensaje exacto de confirmación de la Pantalla Figma 45-ajuste-confirmado
    avisoConfirmacionReciente.value = `Ajuste registrado: ${producto.nombre} ahora tiene ${solicitud.cantidadRealContada} unidades.`;

    return nuevoMovimiento;
  }

  function limpiarAvisoConfirmacion(): void {
    avisoConfirmacionReciente.value = null;
  }

  return {
    tenantActivoId,
    almacenActivoId,
    productosCatalogo,
    movimientosAjuste,
    avisoConfirmacionReciente,
    productosDelTenant,
    movimientosDelTenant,
    totalUnidadesDisponibles,
    totalMovimientosRegistrados,
    totalProductosStockBajo,
    establecerContextoTenant,
    cargarProductosIniciales,
    registrarAjusteExistencias,
    limpiarAvisoConfirmacion,
  };
});
