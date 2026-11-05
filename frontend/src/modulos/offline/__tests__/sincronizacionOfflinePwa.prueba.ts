import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useSincronizacionOfflineStore } from '../almacen/useSincronizacionOfflineStore';

describe('Sprint 9 — PWA Offline-First, Cola IndexedDB y Reconciliación Background Sync (Pantallas Figma 55 y 59)', () => {
  const TENANT_A = '11111111-1111-4111-8111-111111111111';
  const TENANT_B = '22222222-2222-4222-8222-222222222222';

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('encola operaciones durante desconexión y las reconcilia con idempotencia y control de conflictos updated_at al reconectar', () => {
    const store = useSincronizacionOfflineStore();
    store.establecerContextoTenant(TENANT_A);
    store.cambiarEstadoRed(false);

    expect(store.enLinea).toBe(false);

    store.encolarOperacionOffline({
      idempotencyKey: 'uuid-op-1',
      tenantId: TENANT_A,
      tipoOperacion: 'CONTEO_FISICO_CIEGO',
      sku: 'PRD-001',
      deltaCantidad: -4,
      updatedAtCliente: '2026-11-05T10:15:00.000Z',
    });

    // Duplicado con el mismo idempotencyKey
    store.encolarOperacionOffline({
      idempotencyKey: 'uuid-op-1',
      tenantId: TENANT_A,
      tipoOperacion: 'CONTEO_FISICO_CIEGO',
      sku: 'PRD-001',
      deltaCantidad: -4,
      updatedAtCliente: '2026-11-05T10:15:00.000Z',
    });

    // Operación con timestamp obsoleto frente al servidor
    store.encolarOperacionOffline({
      idempotencyKey: 'uuid-op-2',
      tenantId: TENANT_A,
      tipoOperacion: 'COBRO_POS_OFFLINE',
      sku: 'PRD-002',
      deltaCantidad: -2,
      updatedAtCliente: '2026-11-05T09:00:00.000Z',
    });

    expect(store.operacionesPendientesDelTenant).toHaveLength(3);

    const estadoServidor = {
      'PRD-001': { stockActual: 20, updatedAtServidor: '2026-11-05T10:00:00.000Z' },
      'PRD-002': { stockActual: 10, updatedAtServidor: '2026-11-05T09:30:00.000Z' },
    };

    const resumen = store.drenarColaAlReconectar(estadoServidor);

    expect(resumen.aplicadas).toBe(1);
    expect(resumen.omitidas).toBe(1);
    expect(resumen.conflictos).toBe(1);
    expect(estadoServidor['PRD-001'].stockActual).toBe(16);
    expect(store.enLinea).toBe(true);
  });

  it('bloquea el encolamiento Cross-Tenant en la cola local Offline', () => {
    const store = useSincronizacionOfflineStore();
    store.establecerContextoTenant(TENANT_A);

    expect(() =>
      store.encolarOperacionOffline({
        idempotencyKey: 'uuid-op-cross',
        tenantId: TENANT_B,
        tipoOperacion: 'COBRO_POS_OFFLINE',
        sku: 'PRD-001',
        deltaCantidad: -1,
        updatedAtCliente: '2026-11-05T10:15:00.000Z',
      }),
    ).toThrow(/Violación Multi-Tenant/i);
  });
});
