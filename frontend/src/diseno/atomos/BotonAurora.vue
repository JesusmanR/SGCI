<script setup lang="ts">
import { computed } from 'vue';

export type VarianteBoton = 'primario' | 'profundo' | 'secundario' | 'peligro' | 'fantasma';
export type TamanoBoton = 'sm' | 'md' | 'lg';

interface Props {
  variante?: VarianteBoton;
  tamano?: TamanoBoton;
  tipo?: 'button' | 'submit' | 'reset';
  desactivado?: boolean;
  cargando?: boolean;
  etiquetaAria?: string;
  anchoCompleto?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variante: 'primario',
  tamano: 'md',
  tipo: 'button',
  desactivado: false,
  cargando: false,
  etiquetaAria: undefined,
  anchoCompleto: false,
});

const emit = defineEmits<{
  (e: 'click', evento: MouseEvent): void;
}>();

const clasesBase = computed(() => {
  return [
    // Mobile-First: Mínimo 44px de área táctil según estándares WCAG y ergonomía de bodega con guantes
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 select-none',
    'min-h-[44px] min-w-[44px]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#416772]',
    props.anchoCompleto ? 'w-full' : '',
    props.desactivado || props.cargando ? 'cursor-not-allowed opacity-60' : 'cursor-pointer active:scale-[0.98]',
  ];
});

const clasesVariante = computed(() => {
  if (props.desactivado) {
    return 'bg-[#839492] text-white border border-[#839492]';
  }

  switch (props.variante) {
    case 'profundo':
      // #203959 - Navegación, fondos profundos y encabezados
      return 'bg-[#203959] text-[#ABB7B3] hover:bg-[#182b43] hover:text-white border border-[#203959] shadow-sm';
    
    case 'secundario':
      // #96ADA5 - Acentos, estados y elementos secundarios
      return 'bg-[#96ADA5] text-[#203959] hover:bg-[#849d95] font-semibold border border-[#96ADA5]';
    
    case 'peligro':
      return 'bg-rose-700 text-white hover:bg-rose-800 border border-rose-700';

    case 'fantasma':
      return 'bg-transparent text-[#203959] hover:bg-[#ABB7B3]/20 border border-transparent';

    case 'primario':
    default:
      // #416772 - Acciones principales, botones y gráficas
      return 'bg-[#416772] text-white hover:bg-[#33525b] border border-[#416772] shadow-sm';
  }
});

const clasesTamano = computed(() => {
  switch (props.tamano) {
    case 'sm':
      return 'px-3 py-1.5 text-xs gap-1.5 min-h-[44px]';
    case 'lg':
      return 'px-6 py-3.5 text-base gap-3 min-h-[52px]';
    case 'md':
    default:
      return 'px-4 py-2 text-sm gap-2 min-h-[44px]';
  }
});

function manejarClick(evento: MouseEvent) {
  if (props.desactivado || props.cargando) {
    evento.preventDefault();
    evento.stopPropagation();
    return;
  }
  emit('click', evento);
}
</script>

<template>
  <button
    :type="tipo"
    :disabled="desactivado || cargando"
    :aria-disabled="desactivado || cargando"
    :aria-busy="cargando"
    :aria-label="etiquetaAria"
    :class="[clasesBase, clasesVariante, clasesTamano]"
    @click="manejarClick"
  >
    <!-- Spinner accesible de carga -->
    <svg
      v-if="cargando"
      class="animate-spin h-5 w-5 text-current shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
      data-testid="spinner-carga"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>

    <!-- Slot para icono a la izquierda -->
    <span v-if="$slots.iconoIzquierda && !cargando" class="shrink-0 flex items-center">
      <slot name="iconoIzquierda" />
    </span>

    <!-- Contenido principal -->
    <span class="truncate">
      <slot />
    </span>

    <!-- Slot para icono a la derecha -->
    <span v-if="$slots.iconoDerecha && !cargando" class="shrink-0 flex items-center">
      <slot name="iconoDerecha" />
    </span>
  </button>
</template>
