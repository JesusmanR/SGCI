<script setup lang="ts">
import { computed } from 'vue';
import {
  useAnaliticaInventarioStore,
  type EstrategiaValoracionAnalitica,
  type PartidaClasificadaAbc,
} from '../../modulos/analitica/almacen/useAnaliticaInventarioStore';

const store = useAnaliticaInventarioStore();

const estrategiasDisponibles: Array<{ id: EstrategiaValoracionAnalitica; nombre: string; descripcion: string }> = [
  { id: 'PEPS', nombre: 'PEPS / FIFO', descripcion: 'Primeras Entradas, Primeras Salidas (Estándar NIIF/IFRS)' },
  { id: 'UEPS', nombre: 'UEPS / LIFO', descripcion: 'Últimas Entradas, Primeras Salidas (Análisis de Reposición)' },
  { id: 'CPP', nombre: 'CPP / WAC', descripcion: 'Costo Promedio Ponderado Móvil Permanente' },
];

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(valor);
}

const resumenPorClase = computed(() => {
  const partidas = store.partidasClasificadasAbc;
  const clases: Record<'A' | 'B' | 'C', { total: number; count: number; participacion: number }> = {
    A: { total: 0, count: 0, participacion: 0 },
    B: { total: 0, count: 0, participacion: 0 },
    C: { total: 0, count: 0, participacion: 0 },
  };

  partidas.forEach((p) => {
    clases[p.claseAbc].total += p.valorSeleccionado;
    clases[p.claseAbc].count += 1;
    clases[p.claseAbc].participacion += p.participacionPorcentaje;
  });

  return clases;
});

const promedioEri = computed(() => {
  const partidas = store.partidasClasificadasAbc;
  if (partidas.length === 0) return 0;
  const suma = partidas.reduce((acc, p) => acc + p.exactitudEri, 0);
  return Number((suma / partidas.length).toFixed(2));
});

function claseBadgeAbc(clase: 'A' | 'B' | 'C'): string {
  switch (clase) {
    case 'A':
      return 'bg-[#96ADA5] text-[#203959] font-bold border border-[#96ADA5]';
    case 'B':
      return 'bg-[#416772] text-white font-semibold border border-[#416772]';
    case 'C':
    default:
      return 'bg-[#ABB7B3]/30 text-[#203959] font-medium border border-[#839492]';
  }
}
</script>

<template>
  <div class="space-y-6" data-testid="vista-analitica-patrimonial-abc">
    <!-- Encabezado Oficial Aurora Mist -->
    <header class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div class="flex items-center gap-2">
          <span class="rounded bg-[#203959] px-2 py-0.5 font-mono text-xs font-semibold text-white uppercase">
            Pantalla 14 · Analítica ABC
          </span>
          <span class="text-xs font-semibold text-[#839492]">
            Valoración Patrimonial Multi-Almacén &bull; Pareto 80/20
          </span>
        </div>
        <h1 class="mt-1 text-2xl font-bold tracking-tight text-[#203959]">
          Analítica Patrimonial Consolidada y Clasificación ABC
        </h1>
        <p class="mt-1 text-xs sm:text-sm text-[#839492]">
          Auditoría de activos circulantes bajo métodos PEPS, UEPS y CPP con índice de exactitud de registros (ERI).
        </p>
      </div>

      <!-- Conmutador de Estrategia de Valoración -->
      <div class="flex items-center gap-1.5 rounded-xl bg-white p-1.5 border border-[#ABB7B3]/40 shadow-sm">
        <span class="text-[11px] font-bold text-[#203959] px-2 uppercase tracking-wider shrink-0">
          Método:
        </span>
        <button
          v-for="est in estrategiasDisponibles"
          :key="est.id"
          type="button"
          :title="est.descripcion"
          class="min-h-[44px] rounded-lg px-3 py-2 text-xs font-bold transition-all"
          :class="
            store.estrategiaActiva === est.id
              ? 'bg-[#416772] text-white shadow-sm ring-1 ring-[#96ADA5]'
              : 'text-[#203959] hover:bg-[#ABB7B3]/20'
          "
          @click="store.cambiarEstrategiaValoracion(est.id)"
        >
          {{ est.nombre }}
        </button>
      </div>
    </header>

    <!-- Resumen Patrimonial Consolidado (KPIs Aurora Mist) -->
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="KPIs Patrimoniales">
      <!-- Tarjeta 1: Total Consolidado -->
      <article class="flex flex-col justify-between rounded-xl border border-[#416772] bg-white p-4 shadow-sm">
        <header class="flex items-center justify-between">
          <span class="text-xs font-semibold text-[#839492]">Valor Patrimonial Consolidado</span>
          <span class="rounded bg-[#203959] px-2 py-0.5 font-mono text-[10px] font-bold text-white uppercase">
            {{ store.estrategiaActiva }}
          </span>
        </header>
        <div class="my-2">
          <p class="text-2xl font-mono font-bold text-[#203959]" data-testid="valor-patrimonial-consolidado">
            {{ formatearMoneda(store.valorPatrimonialConsolidado) }}
          </p>
          <p class="text-[11px] font-semibold text-[#416772] mt-0.5">
            100% de existencias en {{ store.partidasClasificadasAbc.length }} sedes logísticas
          </p>
        </div>
        <footer class="border-t border-[#ABB7B3]/30 pt-2 text-[11px] text-[#839492]">
          Aislamiento Multi-Tenant verificado
        </footer>
      </article>

      <!-- Tarjeta 2: Clase A (80% del valor) -->
      <article class="flex flex-col justify-between rounded-xl border border-[#96ADA5] bg-white p-4 shadow-sm">
        <header class="flex items-center justify-between">
          <span class="text-xs font-semibold text-[#839492]">Clase A · Estratégicos</span>
          <span class="rounded-full bg-[#96ADA5] px-2 py-0.5 text-[10px] font-bold text-[#203959]">
            80% Pareto
          </span>
        </header>
        <div class="my-2">
          <p class="text-xl font-mono font-bold text-[#203959]">
            {{ formatearMoneda(resumenPorClase.A.total) }}
          </p>
          <p class="text-[11px] font-semibold text-[#416772] mt-0.5">
            {{ resumenPorClase.A.participacion.toFixed(1) }}% de inversión patrimonial ({{ resumenPorClase.A.count }} sedes)
          </p>
        </div>
        <footer class="border-t border-[#ABB7B3]/30 pt-2 text-[11px] text-[#839492]">
          Control riguroso con conteos cíclicos semanales
        </footer>
      </article>

      <!-- Tarjeta 3: Clase B (15% del valor) -->
      <article class="flex flex-col justify-between rounded-xl border border-[#416772]/40 bg-white p-4 shadow-sm">
        <header class="flex items-center justify-between">
          <span class="text-xs font-semibold text-[#839492]">Clase B · Intermedios</span>
          <span class="rounded-full bg-[#416772] px-2 py-0.5 text-[10px] font-bold text-white">
            15% Pareto
          </span>
        </header>
        <div class="my-2">
          <p class="text-xl font-mono font-bold text-[#203959]">
            {{ formatearMoneda(resumenPorClase.B.total) }}
          </p>
          <p class="text-[11px] font-semibold text-[#416772] mt-0.5">
            {{ resumenPorClase.B.participacion.toFixed(1) }}% de inversión patrimonial ({{ resumenPorClase.B.count }} sedes)
          </p>
        </div>
        <footer class="border-t border-[#ABB7B3]/30 pt-2 text-[11px] text-[#839492]">
          Revisión mensual y punto de reorden dinámico
        </footer>
      </article>

      <!-- Tarjeta 4: Exactitud ERI Promedio -->
      <article class="flex flex-col justify-between rounded-xl border border-[#ABB7B3]/50 bg-white p-4 shadow-sm">
        <header class="flex items-center justify-between">
          <span class="text-xs font-semibold text-[#839492]">Exactitud de Registros (ERI)</span>
          <span class="text-base" aria-hidden="true">🎯</span>
        </header>
        <div class="my-2">
          <p class="text-2xl font-mono font-bold text-[#203959]">
            {{ promedioEri }}%
          </p>
          <p class="text-[11px] font-semibold text-[#96ADA5] mt-0.5">
            Conformidad con inventario físico ciego
          </p>
        </div>
        <footer class="border-t border-[#ABB7B3]/30 pt-2 text-[11px] text-[#839492]">
          Estándar internacional WMS &gt; 98.0%
        </footer>
      </article>
    </section>

    <!-- Barra de Distribución Visual Pareto ABC -->
    <section class="rounded-xl border border-[#ABB7B3]/40 bg-white p-4 shadow-sm space-y-2">
      <div class="flex items-center justify-between text-xs">
        <span class="font-bold text-[#203959]">Distribución Acumulada de la Inversión (Curva de Pareto)</span>
        <div class="flex items-center gap-3 text-[11px]">
          <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded-sm bg-[#96ADA5]"></span> Clase A</span>
          <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded-sm bg-[#416772]"></span> Clase B</span>
          <span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded-sm bg-[#839492]"></span> Clase C</span>
        </div>
      </div>
      <div class="flex h-3.5 w-full overflow-hidden rounded-full bg-[#ABB7B3]/30">
        <div
          class="h-full bg-[#96ADA5] transition-all duration-300"
          :style="{ width: `${resumenPorClase.A.participacion}%` }"
          :title="`Clase A: ${resumenPorClase.A.participacion.toFixed(1)}%`"
        />
        <div
          class="h-full bg-[#416772] transition-all duration-300"
          :style="{ width: `${resumenPorClase.B.participacion}%` }"
          :title="`Clase B: ${resumenPorClase.B.participacion.toFixed(1)}%`"
        />
        <div
          class="h-full bg-[#839492] transition-all duration-300"
          :style="{ width: `${resumenPorClase.C.participacion}%` }"
          :title="`Clase C: ${resumenPorClase.C.participacion.toFixed(1)}%`"
        />
      </div>
    </section>

    <!-- Tabla Detallada de Partidas Clasificadas ABC -->
    <section class="overflow-x-auto rounded-xl border border-[#ABB7B3]/40 bg-white shadow-sm">
      <table class="w-full text-left text-xs">
        <thead class="bg-[#203959] text-white uppercase text-[10px] tracking-wider border-b border-[#416772]">
          <tr>
            <th class="px-4 py-3">Código Sede</th>
            <th class="px-4 py-3">Almacén / Depósito</th>
            <th class="px-4 py-3 text-right">Valor PEPS</th>
            <th class="px-4 py-3 text-right">Valor UEPS</th>
            <th class="px-4 py-3 text-right">Valor CPP</th>
            <th class="px-4 py-3 text-right bg-[#416772]/20 font-bold text-white">
              Valor Vigente ({{ store.estrategiaActiva }})
            </th>
            <th class="px-4 py-3 text-right">Part. (%)</th>
            <th class="px-4 py-3 text-right">Acum. (%)</th>
            <th class="px-4 py-3 text-right">Exactitud ERI</th>
            <th class="px-4 py-3 text-center">Clasificación ABC</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#ABB7B3]/30 font-mono">
          <tr
            v-for="partida in store.partidasClasificadasAbc"
            :key="partida.codigo"
            class="hover:bg-[#ABB7B3]/10 transition"
          >
            <td class="px-4 py-3 font-bold text-[#203959]">
              {{ partida.codigo }}
            </td>
            <td class="px-4 py-3 font-sans font-medium text-[#203959]">
              {{ partida.nombre }}
            </td>
            <td class="px-4 py-3 text-right text-[#839492]">
              {{ formatearMoneda(partida.valorPeps) }}
            </td>
            <td class="px-4 py-3 text-right text-[#839492]">
              {{ formatearMoneda(partida.valorUeps) }}
            </td>
            <td class="px-4 py-3 text-right text-[#839492]">
              {{ formatearMoneda(partida.valorCpp) }}
            </td>
            <td class="px-4 py-3 text-right font-bold text-[#416772] bg-[#ABB7B3]/15">
              {{ formatearMoneda(partida.valorSeleccionado) }}
            </td>
            <td class="px-4 py-3 text-right font-semibold text-[#203959]">
              {{ partida.participacionPorcentaje.toFixed(2) }}%
            </td>
            <td class="px-4 py-3 text-right text-[#839492]">
              {{ partida.acumuladoPorcentaje.toFixed(2) }}%
            </td>
            <td class="px-4 py-3 text-right font-semibold" :class="partida.exactitudEri >= 99 ? 'text-[#416772]' : 'text-amber-700'">
              {{ partida.exactitudEri.toFixed(1) }}%
            </td>
            <td class="px-4 py-3 text-center font-sans">
              <span class="inline-block px-2.5 py-1 rounded-md text-xs" :class="claseBadgeAbc(partida.claseAbc)">
                Clase {{ partida.claseAbc }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
