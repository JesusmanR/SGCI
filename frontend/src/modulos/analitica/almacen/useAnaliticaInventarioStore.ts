import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

export type EstrategiaValoracionAnalitica = 'PEPS' | 'UEPS' | 'CPP';

export interface PartidaAnaliticaAlmacen {
  tenant_id: string;
  codigo: string;
  nombre: string;
  valorPeps: number;
  valorUeps: number;
  valorCpp: number;
  exactitudEri: number;
}

export interface PartidaClasificadaAbc extends PartidaAnaliticaAlmacen {
  valorSeleccionado: number;
  participacionPorcentaje: number;
  acumuladoPorcentaje: number;
  claseAbc: 'A' | 'B' | 'C';
}

export const useAnaliticaInventarioStore = defineStore('analitica-inventario-sgci', () => {
  const tenantActivoId = ref<string>('11111111-1111-4111-8111-111111111111');
  const estrategiaActiva = ref<EstrategiaValoracionAnalitica>('PEPS');
  const partidas = ref<PartidaAnaliticaAlmacen[]>([
    {
      tenant_id: '11111111-1111-4111-8111-111111111111',
      codigo: 'ALM-CENTRAL-01',
      nombre: 'Bodega Central Monterrey',
      valorPeps: 1482900,
      valorUeps: 1470000,
      valorCpp: 1476450,
      exactitudEri: 99.4,
    },
    {
      tenant_id: '11111111-1111-4111-8111-111111111111',
      codigo: 'ALM-NORTE-02',
      nombre: 'Centro Logístico Saltillo',
      valorPeps: 640120,
      valorUeps: 632000,
      valorCpp: 636060,
      exactitudEri: 98.9,
    },
    {
      tenant_id: '11111111-1111-4111-8111-111111111111',
      codigo: 'ALM-SUR-03',
      nombre: 'Plataforma Querétaro',
      valorPeps: 318450,
      valorUeps: 316920,
      valorCpp: 317685,
      exactitudEri: 99.1,
    },
  ]);

  function cambiarEstrategiaValoracion(nueva: EstrategiaValoracionAnalitica): void {
    estrategiaActiva.value = nueva;
  }

  function obtenerValorPorEstrategia(p: PartidaAnaliticaAlmacen): number {
    if (estrategiaActiva.value === 'UEPS') return p.valorUeps;
    if (estrategiaActiva.value === 'CPP') return p.valorCpp;
    return p.valorPeps;
  }

  const partidasTenant = computed<PartidaAnaliticaAlmacen[]>(() =>
    partidas.value.filter((p) => p.tenant_id === tenantActivoId.value),
  );

  const valorPatrimonialConsolidado = computed<number>(() =>
    partidasTenant.value.reduce((acc, item) => acc + obtenerValorPorEstrategia(item), 0),
  );

  const partidasClasificadasAbc = computed<PartidaClasificadaAbc[]>(() => {
    const total = valorPatrimonialConsolidado.value;
    const ordenadas = [...partidasTenant.value].sort(
      (a, b) => obtenerValorPorEstrategia(b) - obtenerValorPorEstrategia(a),
    );
    let acumulado = 0;

    return ordenadas.map((item) => {
      const val = obtenerValorPorEstrategia(item);
      const part = total > 0 ? Number(((val / total) * 100).toFixed(2)) : 0;
      const antes = acumulado;
      acumulado = Number(Math.min(100, acumulado + part).toFixed(2));
      const claseAbc: 'A' | 'B' | 'C' = antes < 80 ? 'A' : antes < 95 ? 'B' : 'C';

      return {
        ...item,
        valorSeleccionado: val,
        participacionPorcentaje: part,
        acumuladoPorcentaje: acumulado,
        claseAbc,
      };
    });
  });

  return {
    tenantActivoId,
    estrategiaActiva,
    partidas,
    valorPatrimonialConsolidado,
    partidasClasificadasAbc,
    cambiarEstrategiaValoracion,
  };
});
