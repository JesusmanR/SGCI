<script setup lang="ts">
import {
  usePreciosImpuestosStore,
  type PestanaEstadoSistemaFigma,
} from '../../modulos/precios/almacen/usePreciosImpuestosStore';

const store = usePreciosImpuestosStore();

const PESTANAS_ESTADOS: ReadonlyArray<{ id: PestanaEstadoSistemaFigma; etiqueta: string }> = [
  { id: 'empty', etiqueta: 'Sin datos' },
  { id: 'loading', etiqueta: 'Cargando' },
  { id: 'error', etiqueta: 'Error' },
  { id: 'expired', etiqueta: 'Prueba vencida' },
  { id: 'disabled', etiqueta: 'Empresa desactivada' },
  { id: 'password', etiqueta: 'Contraseña' },
];
</script>

<template>
  <section class="space-y-8" data-testid="vista-estados-notificaciones-figma">
    <!-- SECCIÓN 1: CENTRO DE NOTIFICACIONES (Pantallas Figma 68 y 69) -->
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
            Alertas operativas
          </span>
          <h2 class="text-lg font-bold text-[#203959]">
            Notificaciones ({{ store.totalNotificacionesNoLeidas }} sin leer)
          </h2>
        </div>
        <button
          type="button"
          data-testid="btn-marcar-todas-leidas-figma"
          :disabled="store.totalNotificacionesNoLeidas === 0"
          class="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#203959] hover:bg-slate-50 disabled:opacity-50"
          @click="store.marcarTodasNotificacionesLeidas()"
        >
          Marcar todas como leídas
        </button>
      </div>

      <ul class="divide-y divide-slate-200">
        <li
          v-for="item in store.notificacionesDelTenant"
          :key="item.id"
          class="flex items-start justify-between gap-4 py-3 text-sm"
        >
          <div>
            <strong class="font-semibold text-slate-900">{{ item.titulo }}</strong>
            <p class="text-xs text-slate-600">{{ item.detalle }}</p>
          </div>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="
              item.leida
                ? 'bg-slate-100 text-slate-500'
                : 'bg-amber-100 text-amber-800'
            "
          >
            {{ item.leida ? 'Leída' : 'Nueva' }}
          </span>
        </li>
      </ul>
    </div>

    <!-- SECCIÓN 2: ESTADOS DEL SISTEMA (Pantallas Figma 53 a 59) -->
    <div class="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
      <header class="mb-5">
        <span class="text-xs font-semibold tracking-wider text-[#416772] uppercase">
          Vista de demostración
        </span>
        <h2 class="mt-1 text-xl font-bold text-[#203959]">Estados del sistema</h2>
        <p class="mt-1 text-sm text-slate-600">
          También diseñamos lo que ocurre cuando las cosas no van como esperas.
        </p>
      </header>

      <!-- 6 Pestañas de Estados Figma 53-59 -->
      <div
        class="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3"
        role="tablist"
        aria-label="Estados de demostración"
      >
        <button
          v-for="tab in PESTANAS_ESTADOS"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="store.pestanaEstadoActiva === tab.id"
          :data-testid="`tab-estado-${tab.id}`"
          class="min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition"
          :class="
            store.pestanaEstadoActiva === tab.id
              ? 'bg-[#203959] text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          "
          @click="store.seleccionarPestanaEstado(tab.id)"
        >
          {{ tab.etiqueta }}
        </button>
      </div>

      <!-- Escenario del estado seleccionado -->
      <div class="rounded-xl border border-slate-200 bg-slate-50/70 p-8 text-center">
        <!-- 53-estado-vacio -->
        <div v-if="store.pestanaEstadoActiva === 'empty'" data-testid="stage-estado-empty">
          <h3 class="text-lg font-bold text-[#203959]">Aquí comienza tu inventario</h3>
          <p class="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Todavía no tienes productos. Agrega el primero y empieza a organizar lo que hace crecer
            tu negocio.
          </p>
        </div>

        <!-- 54-estado-carga -->
        <div
          v-else-if="store.pestanaEstadoActiva === 'loading'"
          data-testid="stage-estado-loading"
          role="status"
        >
          <p class="text-sm font-semibold text-[#203959]">Preparando tu espacio de trabajo…</p>
        </div>

        <!-- 55-estado-error y 59-conexion-restablecida -->
        <div v-else-if="store.pestanaEstadoActiva === 'error'" data-testid="stage-estado-error">
          <template v-if="store.conexionRestablecida">
            <h3 class="text-lg font-bold text-emerald-800">Conexión restablecida</h3>
            <p class="mx-auto mt-1 max-w-md text-sm text-slate-600">
              La simulación se completó correctamente. Puedes continuar con tu operación.
            </p>
          </template>
          <template v-else>
            <h3 class="text-lg font-bold text-[#203959]">No pudimos cargar la información</h3>
            <p class="mx-auto mt-1 max-w-md text-sm text-slate-600">
              Parece que la conexión se interrumpió. Tus cambios confirmados en esta sesión siguen
              aquí.
            </p>
            <button
              type="button"
              data-testid="btn-reintentar-conexion-figma"
              class="mt-4 min-h-[44px] rounded-lg bg-[#203959] px-5 py-2 text-xs font-semibold text-white"
              @click="store.reintentarConexionSimulada()"
            >
              Volver a intentar
            </button>
          </template>
        </div>

        <!-- 56-prueba-vencida -->
        <div
          v-else-if="store.pestanaEstadoActiva === 'expired'"
          data-testid="stage-estado-expired"
        >
          <h3 class="text-lg font-bold text-[#203959]">Tu prueba terminó. Tu negocio sigue.</h3>
          <p class="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Esperamos que este mes te haya ayudado a trabajar mejor. Elige un plan para continuar
            con tu empresa en SGIP.
          </p>
        </div>

        <!-- 57-empresa-desactivada -->
        <div
          v-else-if="store.pestanaEstadoActiva === 'disabled'"
          data-testid="stage-estado-disabled"
        >
          <h3 class="text-lg font-bold text-[#203959]">Esta empresa está desactivada</h3>
          <p class="mx-auto mt-1 max-w-md text-sm text-slate-600">
            El acceso a la operación no está disponible. Solicita al administrador de la plataforma
            que revise el estado de tu empresa.
          </p>
        </div>

        <!-- 58-estado-contrasena -->
        <div
          v-else-if="store.pestanaEstadoActiva === 'password'"
          data-testid="stage-estado-password"
        >
          <h3 class="text-lg font-bold text-[#203959]">Actualiza tu contraseña temporal</h3>
          <p class="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Mínimo 8 caracteres, combinación de mayúsculas, minúsculas y al menos un número.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
