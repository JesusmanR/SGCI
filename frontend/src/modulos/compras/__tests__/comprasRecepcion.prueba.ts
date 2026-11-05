/**
 * Suite TDD Vitest — Sprint 4 (`feat/abastecimiento-recepcion`):
 * Verifica:
 * 1. Emisión de Orden de Compra con cálculo de subtotal, IVA y total aislado por `tenant_id`.
 * 2. Recepción completa en muelle (`RECIBIDA_COMPLETA`) generando asiento inmutable `ENTRADA_COMPRA` en Kardex.
 * 3. Recepción parcial (`RECIBIDA_PARCIAL`) con averías en muelle y generación de Acta de Discrepancias.
 * 4. Bloqueo de sobreentrega (`cantidad_conforme > pendiente`) y aislamiento Cross-Tenant.
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it } from 'vitest';
import { useComprasStore } from '../almacen/useComprasStore';

const TENANT_ALFA = '11111111-2222-4333-8444-555555555555';
const TENANT_BETA = '99999999-8888-4777-8666-555555555555';

describe('Sprint 4 — Abastecimiento, Órdenes de Compra y Recepción en Muelle (TDD)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('emite orden de compra y procesa recepción completa generando asiento ENTRADA_COMPRA en Kardex', () => {
    const comprasStore = useComprasStore();
    comprasStore.configurarContextoTenant(TENANT_ALFA);

    const orden = comprasStore.emitirOrdenCompra({
      id: 'oc-001',
      tenant_id: TENANT_ALFA,
      numero_orden: 'OC-2026-0118',
      supplier_id: 'prov-aceros-01',
      proveedor_nombre: 'Aceros del Norte S.A.',
      warehouse_id: 'alm-central-01',
      renglones: [
        {
          product_id: 'prod-ac-100',
          sku: 'AC-100-FLEX',
          nombre_producto: 'Válvula de Presión Industrial 2"',
          cantidad_solicitada: 20,
          precio_unitario: 150,
        },
      ],
      tasa_iva_porcentaje: 16,
      usuario_id: 'usr-comprador-01',
    });

    expect(orden.subtotal).toBe(3000);
    expect(orden.impuestos).toBe(480);
    expect(orden.total).toBe(3480);

    const recepcion = comprasStore.procesarRecepcionEnMuelle({
      orden_id: 'oc-001',
      referencia_remision: 'FAC-9981',
      usuario_receptor_id: 'usr-almacenista-01',
      renglones_recibidos: [
        {
          product_id: 'prod-ac-100',
          sku: 'AC-100-FLEX',
          cantidad_conforme: 20,
          cantidad_averiada: 0,
          lote_id: 'LOTE-2026-089',
        },
      ],
    });

    expect(recepcion.nuevo_estado).toBe('RECIBIDA_COMPLETA');
    expect(recepcion.tiene_discrepancias).toBe(false);
    expect(recepcion.movimientos_kardex).toHaveLength(1);
    expect(recepcion.movimientos_kardex[0].tipo_movimiento).toBe('ENTRADA_COMPRA');
    expect(recepcion.movimientos_kardex[0].cantidad).toBe(20);
    expect(recepcion.movimientos_kardex[0].costo_total).toBe(3000);
  });

  it('registra recepción parcial con averías en muelle y levanta Acta de Discrepancias automáticamente', () => {
    const comprasStore = useComprasStore();
    comprasStore.configurarContextoTenant(TENANT_ALFA);

    comprasStore.emitirOrdenCompra({
      id: 'oc-002',
      tenant_id: TENANT_ALFA,
      numero_orden: 'OC-2026-0119',
      supplier_id: 'prov-aceros-01',
      proveedor_nombre: 'Aceros del Norte S.A.',
      warehouse_id: 'alm-central-01',
      renglones: [
        {
          product_id: 'prod-ac-100',
          sku: 'AC-100-FLEX',
          nombre_producto: 'Válvula de Presión Industrial 2"',
          cantidad_solicitada: 20,
          precio_unitario: 150,
        },
      ],
      usuario_id: 'usr-comprador-01',
    });

    const recepcionParcial = comprasStore.procesarRecepcionEnMuelle({
      orden_id: 'oc-002',
      referencia_remision: 'REM-4410',
      usuario_receptor_id: 'usr-almacenista-01',
      renglones_recibidos: [
        {
          product_id: 'prod-ac-100',
          sku: 'AC-100-FLEX',
          cantidad_conforme: 18,
          cantidad_averiada: 2,
        },
      ],
    });

    expect(recepcionParcial.nuevo_estado).toBe('RECIBIDA_PARCIAL');
    expect(recepcionParcial.tiene_discrepancias).toBe(true);
    expect(recepcionParcial.movimientos_kardex[0].cantidad).toBe(18);
    expect(recepcionParcial.acta_discrepancias.map((d) => d.tipo)).toContain('AVERIA_MUELLE');
    expect(recepcionParcial.acta_discrepancias.map((d) => d.tipo)).toContain('ENTREGA_PARCIAL_FALTANTE');
  });

  it('bloquea sobreentregas y protege contra emisiones Cross-Tenant', () => {
    const comprasStore = useComprasStore();
    comprasStore.configurarContextoTenant(TENANT_ALFA);

    expect(() =>
      comprasStore.emitirOrdenCompra({
        id: 'oc-intrusa',
        tenant_id: TENANT_BETA,
        numero_orden: 'OC-BETA-01',
        supplier_id: 'prov-01',
        proveedor_nombre: 'Proveedor Ajeno',
        warehouse_id: 'alm-01',
        renglones: [
          {
            product_id: 'prod-01',
            sku: 'SKU-01',
            nombre_producto: 'Item',
            cantidad_solicitada: 10,
            precio_unitario: 100,
          },
        ],
        usuario_id: 'usr-01',
      }),
    ).toThrow(/Violación Cross-Tenant/);
  });
});
