import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  useAuditoriaConteosStore,
  type ProductoInventarioAjustable,
} from '../almacen/useAuditoriaConteosStore';

describe('Sprint 5 — Auditoría, Conteos Ciegos y Ajustes de Inventario (Pantallas Figma 42-45 y 78)', () => {
  const TENANT_A = '11111111-1111-4111-8111-111111111111';
  const TENANT_B = '22222222-2222-4222-8222-222222222222';
  const ALMACEN_PRINCIPAL = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const OPERADOR_ID = '99999999-9999-4999-8999-999999999999';
  const SUPERVISOR_ID = '88888888-8888-4888-8888-888888888888';

  const productosSemilla: ProductoInventarioAjustable[] = [
    {
      id: 'prod-cafe-500',
      tenant_id: TENANT_A,
      sku: 'CAF-500',
      nombre: 'Café molido especial 500 g',
      almacenId: ALMACEN_PRINCIPAL,
      bodegaNombre: 'Bodega principal',
      stockActual: 38,
      stockMinimo: 15,
      costoUnitarioBase: 14200,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: OPERADOR_ID,
      updated_by: OPERADOR_ID,
    },
    {
      id: 'prod-filtro-v60',
      tenant_id: TENANT_A,
      sku: 'FIL-100',
      nombre: 'Filtro de papel V60 x100',
      almacenId: ALMACEN_PRINCIPAL,
      bodegaNombre: 'Bodega principal',
      stockActual: 7,
      stockMinimo: 12,
      costoUnitarioBase: 16000,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: OPERADOR_ID,
      updated_by: OPERADOR_ID,
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('calcula los 3 KPIs de la Pantalla Figma 42 y registra un ajuste por merma actualizando existencias y banner Figma 45', () => {
    const store = useAuditoriaConteosStore();
    store.establecerContextoTenant(TENANT_A, ALMACEN_PRINCIPAL);
    store.cargarProductosIniciales(productosSemilla);

    expect(store.totalUnidadesDisponibles).toBe(45);
    expect(store.totalMovimientosRegistrados).toBe(0);
    expect(store.totalProductosStockBajo).toBe(1);

    const movimiento = store.registrarAjusteExistencias({
      tenantId: TENANT_A,
      almacenId: ALMACEN_PRINCIPAL,
      productoId: 'prod-cafe-500',
      cantidadRealContada: 34,
      motivo: 'Producto dañado / merma',
      observaciones: 'Empaque perforado en estante B2',
      operadorId: OPERADOR_ID,
    });

    expect(movimiento.variacion).toBe(-4);
    expect(movimiento.tipoMovimientoKardex).toBe('MERMA_DANO');
    expect(store.totalUnidadesDisponibles).toBe(41);
    expect(store.totalMovimientosRegistrados).toBe(1);
    expect(store.avisoConfirmacionReciente).toBe(
      'Ajuste registrado: Café molido especial 500 g ahora tiene 34 unidades.',
    );
  });

  it('exige observaciones obligatorias cuando el motivo seleccionado es "Otro" (Pantallas Figma 43 y 44)', () => {
    const store = useAuditoriaConteosStore();
    store.establecerContextoTenant(TENANT_A, ALMACEN_PRINCIPAL);
    store.cargarProductosIniciales(productosSemilla);

    expect(() =>
      store.registrarAjusteExistencias({
        tenantId: TENANT_A,
        almacenId: ALMACEN_PRINCIPAL,
        productoId: 'prod-cafe-500',
        cantidadRealContada: 36,
        motivo: 'Otro',
        observaciones: '   ',
        operadorId: OPERADOR_ID,
      }),
    ).toThrow(/observaciones es obligatorio/i);
  });

  it('aplica segregación de funciones (doble firma) en discrepancias críticas e impide auto-aprobación', () => {
    const store = useAuditoriaConteosStore();
    store.establecerContextoTenant(TENANT_A, ALMACEN_PRINCIPAL);
    store.cargarProductosIniciales(productosSemilla);

    // Variación de +60 unidades supera el umbral de 50 unidades
    expect(() =>
      store.registrarAjusteExistencias({
        tenantId: TENANT_A,
        almacenId: ALMACEN_PRINCIPAL,
        productoId: 'prod-cafe-500',
        cantidadRealContada: 98,
        motivo: 'Conteo físico',
        operadorId: OPERADOR_ID,
        supervisorAprobadorId: OPERADOR_ID,
      }),
    ).toThrow(/segregación de funciones/i);

    const aprobado = store.registrarAjusteExistencias({
      tenantId: TENANT_A,
      almacenId: ALMACEN_PRINCIPAL,
      productoId: 'prod-cafe-500',
      cantidadRealContada: 98,
      motivo: 'Conteo físico',
      operadorId: OPERADOR_ID,
      supervisorAprobadorId: SUPERVISOR_ID,
    });

    expect(aprobado.variacion).toBe(60);
    expect(aprobado.tipoMovimientoKardex).toBe('AJUSTE_POSITIVO');
  });

  it('bloquea intentos Cross-Tenant de ajustar inventario de otra empresa', () => {
    const store = useAuditoriaConteosStore();
    store.establecerContextoTenant(TENANT_A, ALMACEN_PRINCIPAL);
    store.cargarProductosIniciales(productosSemilla);

    expect(() =>
      store.registrarAjusteExistencias({
        tenantId: TENANT_B,
        almacenId: ALMACEN_PRINCIPAL,
        productoId: 'prod-cafe-500',
        cantidadRealContada: 20,
        motivo: 'Pérdida',
        operadorId: OPERADOR_ID,
      }),
    ).toThrow(/Violación de aislamiento Multi-Tenant/i);
  });
});
