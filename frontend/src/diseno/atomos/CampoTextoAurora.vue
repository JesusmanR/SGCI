<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  id: string;
  modelValue: string;
  etiqueta: string;
  tipo?: 'text' | 'email' | 'password' | 'search' | 'tel';
  placeholder?: string;
  mensajeError?: string | null;
  textoAyuda?: string | null;
  obligatorio?: boolean;
  desactivado?: boolean;
  autocompletar?: string;
}

const props = withDefaults(defineProps<Props>(), {
  tipo: 'text',
  placeholder: '',
  mensajeError: null,
  textoAyuda: null,
  obligatorio: false,
  desactivado: false,
  autocompletar: 'off',
});

const emit = defineEmits<{
  (e: 'update:modelValue', valor: string): void;
  (e: 'blur', evento: FocusEvent): void;
}>();

const tieneError = computed(() => Boolean(props.mensajeError && props.mensajeError.trim().length > 0));
const idMensaje = computed(() => `${props.id}-feedback`);

function alEscribir(evento: Event): void {
  const objetivo = evento.target as HTMLInputElement;
  emit('update:modelValue', objetivo.value);
}
</script>

<template>
  <div class="flex flex-col gap-1.5 w-full">
    <label
      :for="id"
      class="text-sm font-semibold tracking-wide text-[#203959] dark:text-[#ABB7B3]"
    >
      {{ etiqueta }}
      <span v-if="obligatorio" class="text-rose-600 ml-0.5" aria-hidden="true">*</span>
    </label>

    <input
      :id="id"
      :type="tipo"
      :value="modelValue"
      :placeholder="placeholder"
      :required="obligatorio"
      :disabled="desactivado"
      :autocomplete="autocompletar"
      :aria-invalid="tieneError ? 'true' : 'false'"
      :aria-describedby="tieneError || textoAyuda ? idMensaje : undefined"
      class="min-h-[44px] w-full rounded-lg px-3.5 py-2.5 text-base text-[#203959] bg-white border transition-colors duration-150 focus:outline-none focus:ring-2"
      :class="[
        tieneError
          ? 'border-rose-600 focus:ring-rose-500/40'
          : 'border-[#839492] focus:border-[#416772] focus:ring-[#416772]/35',
        desactivado ? 'bg-[#ABB7B3]/30 text-[#839492] cursor-not-allowed' : '',
      ]"
      @input="alEscribir"
      @blur="emit('blur', $event)"
    />

    <p
      v-if="tieneError"
      :id="idMensaje"
      role="alert"
      class="text-xs font-medium text-rose-700 mt-0.5"
    >
      {{ mensajeError }}
    </p>
    <p
      v-else-if="textoAyuda"
      :id="idMensaje"
      class="text-xs text-[#839492]"
    >
      {{ textoAyuda }}
    </p>
  </div>
</template>
