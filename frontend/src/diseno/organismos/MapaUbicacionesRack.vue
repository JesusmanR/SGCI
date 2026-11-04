<script setup lang="ts">
/**
 * Organismo: MapaUbicacionesRack.vue
 * Visualizador topológico de ubicaciones físicas de almacén (Zona -> Pasillo -> Estante/Rack -> Nivel).
 * Muestra ocupación por Bin Location y permite iniciar transferencias inter-almacén.
 * Paleta oficial Aurora Mist (#203959, #416772, #96ADA5, #ABB7B3, #839492).
 */
import { computed } from 'vue';

export interface UbicacionRackItem {
  id: string;
  codigo_bin: string; // Ej: ZONA-A-P04-R02-N01
  zona: string;
  pasillo: string;
  estante: string;
  nivel: string;
  capacidad_maxima: number;
  unidades_ocupadas: number;
  sku_principal?: string | null;
  bloqueada_cuarentena?: boolean;
}

interface Props {
  nombreAlmacen: string;
  codigoAlmacen: string;
  ubicaciones: UbicacionRackItem[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'seleccionar-ubicacion', ubicacion: UbicacionRackItem): void;
  (e: 'solicitar-transferencia', ubicacion: UbicacionRackItem): void;
}>();

const resumenOcupacion = computed(() => {
  if (props.ubicaciones.length === 0) {
    return { porcentajeGlobal: 0, totalOcupadas: 0, totalCapacidad: 0 };
  }
  const totalOcupadas = props.ubicaciones.reduce((acc, u) => acc + u.unidades_ocupadas, 0);
  const totalCapacidad = props.ubicaciones.reduce((acc, u) => acc + Math.max(1, u.capacidad_maxima), 0);
  const porcentajeGlobal = Math.min(100, Math.round((totalOcupadas / totalCapacidad) * 100));
  return { porcentajeGlobal, totalOcupadas, totalCapacidad };
});

function calcularPorcentajeCelda(u: UbicacionRackItem): number {
  if (u.capacidad_maxima <= 0) return 0;
  return Math.min(100, Math.round((u.unidades_ocupadas / u.capacidad_maxima) * 100));
}

function obtenerEtiquetaEstadoCelda(u: UbicacionRackItem): string {
  if (u.bloqueada_cuarentena) return 'CUARENTENA';
  const pct = calcularPorcentajeCelda(u);
  if (pct === 0) return 'DISPONIBLE';
  if (pct >= 90) return 'SATURADO';
  return 'OCUPADO';
}
</script>

<template>
  <section
    class="rounded-xl border border-[#839492]/40 bg-white p-4 shadow-sm"
    aria-label="Mapa topológico de ubicaciones y estanterías del almacén"
  >
    <!-- Encabezado con KPI de ocupación del almacén -->
    <header class="mb-4 flex flex-col justify-between gap-2 border-b border-[#839492]/30 pb-3 sm:flex-row sm:items-center">
      <div>
        <div class="flex items-center gap-2">
          <span class="rounded bg-[#203959] px-2 py-0.5 font-mono text-xs font-semibold text-[#ABB7B3]">
            {{ props.codigoAlmacen }}
          </span>
          <h2 class="text-base font-bold text-[#203959]">
            {{ props.nombreAlmacen }}
          </h2>
        </div>
        <p class="mt-0.5 text-xs text-[#839492]">
          Topología Bin Location (Zona · Pasillo · Estante · Nivel)
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="text-right">
          <span class="block text-xs font-medium text-[#839492]">Ocupación de Estantería</span>
          <span
            class="font-mono text-sm font-bold tabular-nums text-[#203959]"
            data-testid="ocupacion-global-almacen"
          >
            {{ resumenOcupacion.porcentajeGlobal }}% ({{ resumenOcupacion.totalOcupadas }} / {{ resumenOcupacion.totalCapacidad }} Uds)
          </span>
        </div>
      </div>
    </header>

    <!-- Cuadrícula de Ubicaciones Bin -->
    <div
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      data-testid="grid-ubicaciones-rack"
    >
      <article
        v-for="ubicacion in props.ubicaciones"
        :key="ubicacion.id"
        class="flex flex-col justify-between rounded-lg border border-[#839492]/40 bg-[#F4F7F6] p-3 transition-shadow hover:shadow-md"
        :data-testid="`celda-bin-${ubicacion.codigo_bin}`"
      >
        <div>
          <div class="flex items-center justify-between gap-2">
            <span class="font-mono text-xs font-bold text-[#203959]">
              {{ ubicacion.codigo_bin }}
            </span>
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              :class="{
                'bg-[#F6E8E7] text-[#9C2F28]': ubicacion.bloqueada_cuarentena || calcularPorcentajeCelda(ubicacion) >= 90,
                'bg-[#E6F0EB] text-[#15624A]': !ubicacion.bloqueada_cuarentena && calcularPorcentajeCelda(ubicacion) === 0,
                'bg-[#203959] text-[#ABB7B3]': !ubicacion.bloqueada_cuarentena && calcularPorcentajeCelda(ubicacion) > 0 && calcularPorcentajeCelda(ubicacion) < 90,
              }"
            >
              {{ obtenerEtiquetaEstadoCelda(ubicacion) }}
            </span>
          </div>

          <p class="mt-1 text-xs text-[#416772]">
            Zona {{ ubicacion.zona }} · Pasillo {{ ubicacion.pasillo }} · Rack {{ ubicacion.estante }} · Nivel {{ ubicacion.nivel }}
          </p>

          <p v-if="ubicacion.sku_principal" class="mt-1.5 font-mono text-xs font-medium text-[#203959]">
            SKU: {{ ubicacion.sku_principal }}
          </p>
        </div>

        <!-- Barra de progreso de capacidad -->
        <div class="mt-3">
          <div class="mb-1 flex justify-between font-mono text-[11px] tabular-nums text-[#203959]">
            <span>{{ ubicacion.unidades_ocupadas }} / {{ ubicacion.capacidad_maxima }} Uds</span>
            <span>{{ calcularPorcentajeCelda(ubicacion) }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-[#ABB7B3]/50">
            <div
              class="h-full rounded-full transition-all"
              :class="calcularPorcentajeCelda(ubicacion) >= 90 ? 'bg-[#9C2F28]' : 'bg-[#416772]'"
              :style="{ width: `${calcularPorcentajeCelda(ubicacion)}%` }"
            />
          </div>

          <!-- Acciones con altura táctil >= 44px para operadores con guantes -->
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              class="min-h-[44px] flex-1 rounded-lg border border-[#416772] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#203959] hover:bg-[#96ADA5]/20"
              @click="emit('seleccionar-ubicacion', ubicacion)"
            >
              Inspeccionar Bin
            </button>
            <button
              type="button"
              class="min-h-[44px] flex-1 rounded-lg bg-[#416772] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#203959]"
              :disabled="ubicacion.unidades_ocupadas <= 0 || ubicacion.bloqueada_cuarentena"
              @click="emit('solicitar-transferencia', ubicacion)"
            >
              Transferir
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
