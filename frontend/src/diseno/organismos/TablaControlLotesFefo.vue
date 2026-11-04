<script setup lang="ts">
/**
 * Organismo: TablaControlLotesFefo.vue
 * Tabla de trazabilidad sanitaria/industrial de lotes ordenada por prioridad FEFO (First Expired, First Out).
 * Incluye acciones táctiles (>= 44px) para colocar o liberar lotes de cuarentena.
 * Paleta oficial Aurora Mist (#203959, #416772, #96ADA5, #ABB7B3, #839492).
 */
import InsigniaSemaforoLote from '../moleculas/InsigniaSemaforoLote.vue';
import type { LoteConEvaluacionFefo } from '../../modulos/lotes/almacen/useLotesStore';

interface Props {
  lotes: LoteConEvaluacionFefo[];
  skuFiltro?: string;
}

const props = withDefaults(defineProps<Props>(), {
  skuFiltro: '',
});

const emit = defineEmits<{
  (e: 'alternar-cuarentena', payload: { loteId: string; enCuarentena: boolean }): void;
  (e: 'seleccionar-lote-picking', lote: LoteConEvaluacionFefo): void;
}>();
</script>

<template>
  <section
    class="rounded-xl border border-[#839492]/40 bg-white shadow-sm"
    aria-label="Control de Lotes, Caducidad y Prioridad de Despacho FEFO"
  >
    <!-- Cabecera del organismo -->
    <header class="flex flex-col justify-between gap-2 border-b border-[#839492]/30 bg-[#203959] px-4 py-3.5 text-[#ABB7B3] sm:flex-row sm:items-center rounded-t-xl">
      <div>
        <h2 class="text-base font-bold text-white">
          Matriz de Lotes y Semáforo de Caducidad (Motor FEFO)
        </h2>
        <p class="text-xs text-[#ABB7B3]">
          Prioridad automática de salida: Primero en Caducar, Primero en Salir (First Expired, First Out)
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="rounded-full bg-[#416772] px-3 py-1 font-mono text-xs font-semibold text-white">
          Total Lotes: {{ props.lotes.length }}
        </span>
      </div>
    </header>

    <!-- Tabla responsiva escritorio / tarjetas móviles -->
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-[#839492]/30 text-left text-sm">
        <thead class="bg-[#F4F7F6] text-[11px] font-bold uppercase tracking-wider text-[#416772]">
          <tr>
            <th scope="col" class="px-4 py-3">Prioridad FEFO</th>
            <th scope="col" class="px-4 py-3">Número de Lote</th>
            <th scope="col" class="px-4 py-3">Vencimiento</th>
            <th scope="col" class="px-4 py-3 text-right">Stock Actual</th>
            <th scope="col" class="px-4 py-3 text-right">Costo Entrada</th>
            <th scope="col" class="px-4 py-3">Estado Sanitario / Caducidad</th>
            <th scope="col" class="px-4 py-3 text-right">Acciones de Calidad</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#839492]/20 bg-white">
          <tr
            v-for="lote in props.lotes"
            :key="lote.id"
            class="transition-colors hover:bg-[#96ADA5]/10"
            :data-testid="`fila-lote-${lote.numero_lote}`"
          >
            <!-- Prioridad FEFO -->
            <td class="whitespace-nowrap px-4 py-3">
              <span
                v-if="lote.prioridad_fefo !== null"
                class="inline-flex h-6 w-12 items-center justify-center rounded bg-[#203959] font-mono text-xs font-bold text-[#ABB7B3]"
              >
                #{{ lote.prioridad_fefo }}
              </span>
              <span
                v-else
                class="font-mono text-xs font-semibold text-[#9C2F28]"
              >
                BLOQ
              </span>
            </td>

            <!-- Número de Lote -->
            <td class="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-[#203959]">
              {{ lote.numero_lote }}
            </td>

            <!-- Fecha de Vencimiento -->
            <td class="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-[#203959]">
              {{ lote.fecha_vencimiento || 'SIN CADUCIDAD' }}
            </td>

            <!-- Stock Actual -->
            <td class="whitespace-nowrap px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums text-[#203959]">
              {{ lote.cantidad_actual.toFixed(4) }}
            </td>

            <!-- Costo Unitario -->
            <td class="whitespace-nowrap px-4 py-3 text-right font-mono text-xs tabular-nums text-[#416772]">
              $ {{ lote.costo_unitario_entrada.toFixed(2) }}
            </td>

            <!-- Semáforo WCAG AA -->
            <td class="whitespace-nowrap px-4 py-3">
              <InsigniaSemaforoLote
                :semaforo="lote.semaforo"
                :dias-restantes="lote.dias_restantes"
              />
            </td>

            <!-- Acciones de Cuarentena y Picking (>= 44px touch target) -->
            <td class="whitespace-nowrap px-4 py-2 text-right">
              <div class="inline-flex items-center gap-2">
                <button
                  type="button"
                  class="min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                  :class="
                    lote.estado === 'CUARENTENA'
                      ? 'bg-[#416772] text-white hover:bg-[#203959]'
                      : 'border border-[#9C2F28] bg-white text-[#9C2F28] hover:bg-[#F6E8E7]'
                  "
                  @click="
                    emit('alternar-cuarentena', {
                      loteId: lote.id,
                      enCuarentena: lote.estado !== 'CUARENTENA',
                    })
                  "
                >
                  {{ lote.estado === 'CUARENTENA' ? 'Liberar Lote' : 'Cuarentena' }}
                </button>

                <button
                  type="button"
                  class="min-h-[44px] rounded-lg bg-[#203959] px-3 py-1.5 text-xs font-semibold text-[#ABB7B3] hover:bg-[#416772] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!lote.apto_para_despacho"
                  @click="emit('seleccionar-lote-picking', lote)"
                >
                  Despachar FEFO
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
