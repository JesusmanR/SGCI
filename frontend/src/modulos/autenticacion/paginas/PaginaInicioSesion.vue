<script setup lang="ts">
import { ref } from 'vue';
import CampoTextoAurora from '../../../diseno/atomos/CampoTextoAurora.vue';
import BotonAurora from '../../../diseno/atomos/BotonAurora.vue';

interface CredencialesLogin {
  codigoTenant: string;
  email: string;
  password: string;
}

const emit = defineEmits<{
  (e: 'autenticar', credenciales: CredencialesLogin): void;
}>();

const codigoTenant = ref<string>('');
const email = ref<string>('');
const password = ref<string>('');
const errorFormulario = ref<string | null>(null);
const cargando = ref<boolean>(false);

function enviarFormulario(): void {
  errorFormulario.value = null;

  if (!codigoTenant.value.trim()) {
    errorFormulario.value = 'Debes ingresar el código de la empresa (Tenant).';
    return;
  }

  if (!email.value.trim() || !email.value.includes('@')) {
    errorFormulario.value = 'Ingresa un correo electrónico corporativo válido.';
    return;
  }

  if (password.value.length < 8) {
    errorFormulario.value = 'La contraseña debe tener al menos 8 caracteres.';
    return;
  }

  emit('autenticar', {
    codigoTenant: codigoTenant.value.trim().toUpperCase(),
    email: email.value.trim().toLowerCase(),
    password: password.value,
  });
}
</script>

<template>
  <main
    class="min-h-screen w-full bg-[#203959] flex flex-col justify-center items-center px-4 py-8"
  >
    <section
      aria-labelledby="titulo-login-sgci"
      class="w-full max-w-md rounded-2xl bg-white shadow-xl border border-[#96ADA5]/40 p-6 sm:p-8"
    >
      <header class="mb-6 text-center">
        <span
          class="inline-flex items-center rounded-full bg-[#203959] text-[#ABB7B3] px-3 py-1 text-xs font-semibold tracking-wider uppercase mb-3"
        >
          SGCI · Control de Inventarios SaaS
        </span>
        <h1
          id="titulo-login-sgci"
          class="text-2xl font-bold text-[#203959]"
        >
          Acceso Operativo Multi-Tenant
        </h1>
        <p class="text-sm text-[#839492] mt-1">
          Ingresa las credenciales de tu organización y bodega asignada.
        </p>
      </header>

      <form
        class="flex flex-col gap-4"
        novalidate
        @submit.prevent="enviarFormulario"
      >
        <CampoTextoAurora
          id="input-codigo-tenant"
          v-model="codigoTenant"
          etiqueta="Código de Organización (Tenant)"
          placeholder="Ej. IND-ALFA"
          obligatorio
          texto-ayuda="Identificador único de tu empresa en SGCI."
        />

        <CampoTextoAurora
          id="input-email-corporativo"
          v-model="email"
          tipo="email"
          etiqueta="Correo Electrónico"
          placeholder="operador@empresa.com"
          autocompletar="username"
          obligatorio
        />

        <CampoTextoAurora
          id="input-password"
          v-model="password"
          tipo="password"
          etiqueta="Contraseña"
          placeholder="••••••••"
          autocompletar="current-password"
          obligatorio
        />

        <div
          v-if="errorFormulario"
          role="alert"
          data-testid="alerta-error-login"
          class="rounded-lg bg-rose-50 border border-rose-600 px-3.5 py-2.5 text-xs font-semibold text-rose-800"
        >
          {{ errorFormulario }}
        </div>

        <div class="pt-2">
          <BotonAurora
            tipo="submit"
            variante="primario"
            ancho-completo
            :cargando="cargando"
          >
            Iniciar Sesión Segura
          </BotonAurora>
        </div>
      </form>
    </section>
  </main>
</template>
