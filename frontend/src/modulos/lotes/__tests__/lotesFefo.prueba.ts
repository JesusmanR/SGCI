/**
 * Suite TDD Vitest — Sprint 3 (`feat/lotes-caducidad`):
 * Verifica:
 * 1. Aislamiento Multi-Tenant (`tenant_id`) e invariantes de fechas (`vencimiento > fabricacion`).
 * 2. Evaluación del semáforo de caducidad de 4 niveles (`VIGENTE`, `ADVERTENCIA`, `PROXIMO_A_VENCER`, `VENCIDO`) y `CUARENTENA`.
 * 3. Asignación multilote por regla FEFO (`planificarPickingFefo`) omitiendo lotes vencidos y en cuarentena.
 * 4. Bloqueo de liberación de cuarentena cuando el lote ya expiró.
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  evaluarSemaforoCaducidadLote,
  type LoteExtendidaSGCI,
  useLotesStore,
} from '../almacen/useLotesStore';

const TENANT_ALFA = '11111111-2222-4333-8444-555555555555';
const TENANT_BETA = '99999999-8888-4777-8666-555555555555';

function crearLoteFixture(parcial: Partial<LoteExtendidaSGCI> = {}): LoteExtendidaSGCI {
  return {
    id: 'lote-001',
    tenant_id: TENANT_ALFA,
    producto_id: 'prod-valvula-01',
    numero_lote: 'LOTE-2026-089',
    fecha_fabricacion: '2026-01-15',
    fecha_vencimiento: '2026-11-15',
    cantidad_inicial: 50,
    cantidad_actual: 25,
    costo_unitario_entrada: 110,
    estado: 'DISPONIBLE',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    deleted_at: null,
    created_by: 'usr-almacen-01',
    updated_by: null,
    ...parcial,
  };
}

describe('Sprint 3 — Control de Lotes, Regla FEFO y Semáforo de Caducidad (TDD)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('clasifica correctamente el semáforo de caducidad en VIGENTE, ADVERTENCIA, PROXIMO_A_VENCER y VENCIDO', () => {
    const fechaRef = '2026-11-01';

    expect(
      evaluarSemaforoCaducidadLote(
        { estado: 'DISPONIBLE', fecha_vencimiento: '2027-02-20' },
        fechaRef,
      ),
    ).toBe('VIGENTE');

    expect(
      evaluarSemaforoCaducidadLote(
        { estado: 'DISPONIBLE', fecha_vencimiento: '2026-12-18' },
        fechaRef,
      ),
    ).toBe('ADVERTENCIA');

    expect(
      evaluarSemaforoCaducidadLote(
        { estado: 'DISPONIBLE', fecha_vencimiento: '2026-11-13' },
        fechaRef,
      ),
    ).toBe('PROXIMO_A_VENCER');

    expect(
      evaluarSemaforoCaducidadLote(
        { estado: 'DISPONIBLE', fecha_vencimiento: '2026-10-25' },
        fechaRef,
      ),
    ).toBe('VENCIDO');
  });

  it('asigna el despacho multilote en orden estricto FEFO omitiendo lotes vencidos y en cuarentena', () => {
    const lotesStore = useLotesStore();
    lotesStore.configurarContextoTenant(TENANT_ALFA);
    const fechaRef = '2026-11-01';

    // Lote vencido (-6 días, 100 uds) -> debe ser ignorado
    lotesStore.registrarLote(
      crearLoteFixture({
        id: 'lote-vencido',
        numero_lote: 'LOTE-2026-001',
        fecha_vencimiento: '2026-10-26',
        cantidad_actual: 100,
      }),
    );

    // Lote en cuarentena (+20 días, 90 uds) -> debe ser ignorado
    lotesStore.registrarLote(
      crearLoteFixture({
        id: 'lote-cuarentena',
        numero_lote: 'LOTE-2026-002',
        fecha_vencimiento: '2026-11-21',
        cantidad_actual: 90,
        estado: 'CUARENTENA',
      }),
    );

    // Lote FEFO #1 (+12 días, 25 uds)
    lotesStore.registrarLote(
      crearLoteFixture({
        id: 'lote-fefo-1',
        numero_lote: 'LOTE-2026-089',
        fecha_vencimiento: '2026-11-13',
        cantidad_actual: 25,
      }),
    );

    // Lote FEFO #2 (+85 días, 60 uds)
    lotesStore.registrarLote(
      crearLoteFixture({
        id: 'lote-fefo-2',
        numero_lote: 'LOTE-2026-140',
        fecha_vencimiento: '2027-01-25',
        cantidad_actual: 60,
      }),
    );

    // Solicitar 40 unidades -> debe consumir 25 del LOTE-2026-089 y 15 del LOTE-2026-140
    const asignacion = lotesStore.planificarPickingFefo('prod-valvula-01', 40, fechaRef);

    expect(asignacion).toHaveLength(2);
    expect(asignacion[0].numero_lote).toBe('LOTE-2026-089');
    expect(asignacion[0].cantidad_tomada).toBe(25);
    expect(asignacion[0].saldo_lote_restante).toBe(0);

    expect(asignacion[1].numero_lote).toBe('LOTE-2026-140');
    expect(asignacion[1].cantidad_tomada).toBe(15);
    expect(asignacion[1].saldo_lote_restante).toBe(45);
  });

  it('bloquea lotes Cross-Tenant e impide liberar de cuarentena un lote vencido', () => {
    const lotesStore = useLotesStore();
    lotesStore.configurarContextoTenant(TENANT_ALFA);

    expect(() =>
      lotesStore.registrarLote(
        crearLoteFixture({
          id: 'lote-intruso',
          tenant_id: TENANT_BETA,
          numero_lote: 'LOTE-BETA-99',
        }),
      ),
    ).toThrow(/Violación Cross-Tenant/);

    lotesStore.registrarLote(
      crearLoteFixture({
        id: 'lote-expirado-cuarentena',
        numero_lote: 'LOTE-2026-500',
        fecha_vencimiento: '2026-10-15',
        estado: 'DISPONIBLE',
      }),
    );

    lotesStore.cambiarEstadoCuarentena(
      'lote-expirado-cuarentena',
      true,
      'Revisión de sellos térmicos',
      '2026-11-01',
    );

    expect(() =>
      lotesStore.cambiarEstadoCuarentena(
        'lote-expirado-cuarentena',
        false,
        '',
        '2026-11-01',
      ),
    ).toThrow(/ya se encuentra vencido/);
  });
});
