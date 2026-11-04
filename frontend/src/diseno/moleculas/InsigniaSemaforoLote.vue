<script setup lang="ts">
/**
 * Molécula: InsigniaSemaforoLote.vue
 * Insignia accesible WCAG AA que representa el estado sanitario/caducidad de un lote (FEFO).
 * Nunca depende exclusivamente del color: incluye icono semántico + etiqueta textual + días restantes.
 */
import { computed } from 'vue';
import type { SemaforoCaducidadLote } from '../../modulos/lotes/almacen/useLotesStore';

interface Props {
  semaforo: SemaforoCaducidadLote;
  diasRestantes?: number | null;
}

const props = withDefaults(defineProps<Props>(), {
  diasRestantes: null,
});

const configuracionVisual = computed(() => {
  switch (props.semaforo) {
    case 'CUARENTENA':
      return {
        clases: 'bg-[#F6E8E7] text-[#9C2F28] border-[#9C2F28]/30',
        icono: '⊘',
        etiqueta: 'EN CUARENTENA',
      };
    case 'VENCIDO':
      return {
        clases: 'bg-[#F6E8E7] text-[#9C2F28] border-[#9C2F28]/40',
        icono: '✕',
        etiqueta: 'LOTE VENCIDO',
      };
    case 'PROXIMO_A_VENCER':
      return {
        clases: 'bg-[#F7EEE0] text-[#8A5214] border-[#8A5214]/30',
        icono: '▲',
        etiqueta: 'PRÓXIMO A VENCER (FEFO #1)',
      };
    case 'ADVERTENCIA':
      return {
        clases: 'bg-[#E3EFF1] text-[#203959] border-[#416772]/30',
        icono: '◆',
        etiqueta: 'ALERTA 60 DÍAS',
      };
    case 'SIN_CADUCIDAD':
      return {
        clases: 'bg-[#F4F7F6] text-[#416772] border-[#839492]/40',
        icono: '•',
        etiqueta: 'NO PERECEDERO',
      };
    case 'VIGENTE':
    default:
      return {
        clases: 'bg-[#E6F0EB] text-[#15624A] border-[#15624A]/30',
        icono: '✓',
        etiqueta: 'LOTE VIGENTE',
      };
  }
});
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide"
    :class="configuracionVisual.clases"
    data-testid="insignia-semaforo-lote"
  >
    <span aria-hidden="true" class="font-bold">{{ configuracionVisual.icono }}</span>
    <span>{{ configuracionVisual.etiqueta }}</span>
    <span
      v-if="props.diasRestantes !== null && props.diasRestantes !== undefined"
      class="font-mono tabular-nums opacity-90"
    >
      ({{ props.diasRestantes }}d)
    </span>
  </span>
</template>
