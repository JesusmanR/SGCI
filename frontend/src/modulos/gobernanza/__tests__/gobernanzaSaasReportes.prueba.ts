import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGobernanzaSaasStore } from '../almacen/useGobernanzaSaasStore';

describe('Sprint 8 — Gobernanza SaaS, Planes, Privacidad por Diseño, Reportes y Modo Vendedor (Pantallas Figma 60-67 y 70-74)', () => {
  const TENANT_A = '11111111-1111-4111-8111-111111111111';

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('controla el límite de usuarios por plan (Emprende max 2) y permite escalar al plan Crece o Pro (Pantallas Figma 60-61 y 64-65)', () => {
    const store = useGobernanzaSaasStore();
    store.establecerContexto(TENANT_A, 'admin');
    store.cambiarPlanSuscripcion('Emprende');

    expect(store.permiteCargaMasivaCsv).toBe(false);

    store.invitarMiembroEquipo({
      tenantId: TENANT_A,
      nombre: 'Laura Díaz',
      correo: 'laura@sgip.co',
      rol: 'Vendedor',
      actorId: 'usr-1',
    });
    store.invitarMiembroEquipo({
      tenantId: TENANT_A,
      nombre: 'Tomás Silva',
      correo: 'tomas@sgip.co',
      rol: 'Bodega',
      actorId: 'usr-1',
    });

    // El tercer usuario en plan Emprende (max 2) debe ser bloqueado
    expect(() =>
      store.invitarMiembroEquipo({
        tenantId: TENANT_A,
        nombre: 'María Pérez',
        correo: 'maria@sgip.co',
        rol: 'Auditor',
        actorId: 'usr-1',
      }),
    ).toThrow(/El plan Emprende permite hasta 2 usuarios/i);

    store.cambiarPlanSuscripcion('Crece');
    expect(store.permiteCargaMasivaCsv).toBe(true);
  });

  it('aplica Privacidad por Diseño para SuperAdmin y oculta costos/márgenes en Modo Vendedor (Pantallas Figma 66 y 70-74)', () => {
    const store = useGobernanzaSaasStore();
    const catalogo = [
      {
        sku: 'PRD-001',
        nombre: 'Teclado Mecánico Pro',
        costo: 50,
        precio: 100,
        impuesto: 19,
        stock: 15,
        tenant_id: TENANT_A,
      },
    ];

    // Modo Vendedor: oculta costo y margenPorcentaje
    store.establecerContexto(TENANT_A, 'seller');
    const vistaVendedor = store.proyectarListaPreciosSegunRol(catalogo);
    expect(vistaVendedor[0].soloLectura).toBe(true);
    expect('costo' in vistaVendedor[0]).toBe(false);
    expect('margenPorcentaje' in vistaVendedor[0]).toBe(false);

    // SuperAdmin: bloqueado por Privacidad por Diseño
    store.establecerContexto(TENANT_A, 'superadmin');
    expect(() => store.proyectarListaPreciosSegunRol(catalogo)).toThrow(/Privacidad por diseño/i);
  });
});
