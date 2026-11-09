import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAnaliticaInventarioStore } from '../almacen/useAnaliticaInventarioStore';

describe('Analítica Patrimonial Multi-Almacén y Clasificación ABC (Pantalla 14)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('calcula el valor patrimonial consolidado bajo PEPS, UEPS y CPP y clasifica Pareto ABC', () => {
    const store = useAnaliticaInventarioStore();

    expect(store.valorPatrimonialConsolidado).toBe(2441470);
    expect(store.partidasClasificadasAbc[0].claseAbc).toBe('A');
    expect(store.partidasClasificadasAbc[1].claseAbc).toBe('A');
    expect(store.partidasClasificadasAbc[2].claseAbc).toBe('B');

    store.cambiarEstrategiaValoracion('UEPS');
    expect(store.valorPatrimonialConsolidado).toBe(2418920);

    store.cambiarEstrategiaValoracion('CPP');
    expect(store.valorPatrimonialConsolidado).toBe(2430195);
  });

  it('aísla estrictamente las partidas de inventario por tenant_id activo', () => {
    const store = useAnaliticaInventarioStore();
    store.partidas.push({
      tenant_id: '99999999-9999-4999-8999-999999999999',
      codigo: 'ALM-INTRUSO',
      nombre: 'Bodega Externa',
      valorPeps: 900000,
      valorUeps: 900000,
      valorCpp: 900000,
      exactitudEri: 95.0,
    });

    expect(store.partidasClasificadasAbc.length).toBe(3);
    expect(store.valorPatrimonialConsolidado).toBe(2441470);
  });
});
