<script setup lang="ts">
import { onMounted, ref } from 'vue';
import TablaKardexAlmacen from './diseno/organismos/TablaKardexAlmacen.vue';
import MapaUbicacionesRack from './diseno/organismos/MapaUbicacionesRack.vue';
import TablaControlLotesFefo from './diseno/organismos/TablaControlLotesFefo.vue';
import PanelRecepcionOrdenCompra from './diseno/organismos/PanelRecepcionOrdenCompra.vue';
import VistaAjustesInventarioFigma from './diseno/organismos/VistaAjustesInventarioFigma.vue';
import VistaImpuestosPreciosFigma from './diseno/organismos/VistaImpuestosPreciosFigma.vue';
import VistaEstadosSistemaNotificacionesFigma from './diseno/organismos/VistaEstadosSistemaNotificacionesFigma.vue';
import VistaFacturacionCajaFigma from './diseno/organismos/VistaFacturacionCajaFigma.vue';
import VistaGobernanzaReportesFigma from './diseno/organismos/VistaGobernanzaReportesFigma.vue';
import Galeria78PantallasFigma from './diseno/organismos/Galeria78PantallasFigma.vue';
import { useAuditoriaConteosStore } from './modulos/conteos/almacen/useAuditoriaConteosStore';
import { usePreciosImpuestosStore } from './modulos/precios/almacen/usePreciosImpuestosStore';
import { useFacturacionCajaStore } from './modulos/caja/almacen/useFacturacionCajaStore';
import { useGobernanzaSaasStore } from './modulos/gobernanza/almacen/useGobernanzaSaasStore';
import { useSincronizacionOfflineStore } from './modulos/offline/almacen/useSincronizacionOfflineStore';
import type { MovimientoKardex } from './compartido/tipos/entidadBase';

type ModuloActivo =
  | 'galeria-figma'
  | 'gobernanza-reportes'
  | 'ajustes-conteos'
  | 'impuestos-precios'
  | 'facturacion-caja'
  | 'estados-alertas'
  | 'kardex-peps';

const TENANT_DEMO = '11111111-1111-4111-8111-111111111111';
const ALMACEN_DEMO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OPERADOR_DEMO = '99999999-9999-4999-8999-999999999999';

const moduloSeleccionado = ref<ModuloActivo>('galeria-figma');

const storeConteos = useAuditoriaConteosStore();
const storePrecios = usePreciosImpuestosStore();
const storeCaja = useFacturacionCajaStore();
const storeGobernanza = useGobernanzaSaasStore();
const storeOffline = useSincronizacionOfflineStore();

onMounted(() => {
  storeConteos.establecerContextoTenant(TENANT_DEMO, ALMACEN_DEMO);
  storeConteos.cargarProductosIniciales([
    {
      id: 'prod-1',
      tenant_id: TENANT_DEMO,
      sku: 'PRD-001',
      nombre: 'Teclado Mecánico Pro',
      almacenId: ALMACEN_DEMO,
      bodegaNombre: 'Bodega principal',
      stockActual: 24,
      stockMinimo: 10,
      costoUnitarioBase: 54,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: OPERADOR_DEMO,
      updated_by: OPERADOR_DEMO,
    },
    {
      id: 'prod-2',
      tenant_id: TENANT_DEMO,
      sku: 'PRD-002',
      nombre: 'Monitor IPS 27"',
      almacenId: ALMACEN_DEMO,
      bodegaNombre: 'Bodega principal',
      stockActual: 5,
      stockMinimo: 8,
      costoUnitarioBase: 165,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: OPERADOR_DEMO,
      updated_by: OPERADOR_DEMO,
    },
  ]);

  storePrecios.establecerTenantActivo(TENANT_DEMO);
  storePrecios.cargarProductosIniciales([
    {
      id: 'prod-1',
      tenant_id: TENANT_DEMO,
      sku: 'PRD-001',
      nombre: 'Teclado Mecánico Pro',
      categoria: 'Periféricos',
      costo: 54,
      precioSinIva: 89,
      tasaIva: 19,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: OPERADOR_DEMO,
      updated_by: OPERADOR_DEMO,
    },
    {
      id: 'prod-2',
      tenant_id: TENANT_DEMO,
      sku: 'PRD-002',
      nombre: 'Monitor IPS 27"',
      categoria: 'Pantallas',
      costo: 165,
      precioSinIva: 249,
      tasaIva: 19,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: OPERADOR_DEMO,
      updated_by: OPERADOR_DEMO,
    },
  ]);
  storePrecios.cargarNotificacionesIniciales([
    {
      id: 'notif-1',
      tenant_id: TENANT_DEMO,
      titulo: 'Stock bajo en Monitor IPS 27"',
      detalle: 'Quedan 5 uds. en Bodega principal (mínimo 8).',
      tono: 'low',
      vistaDestino: 'orders',
      leida: false,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: OPERADOR_DEMO,
      updated_by: OPERADOR_DEMO,
    },
  ]);

  storeCaja.establecerTenantActivo(TENANT_DEMO);
  storeCaja.cargarProductosFacturables([
    {
      id: 'prod-1',
      tenant_id: TENANT_DEMO,
      sku: 'PRD-001',
      nombre: 'Teclado Mecánico Pro',
      precioSinIva: 89,
      tasaIva: 19,
      stockActual: 24,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: OPERADOR_DEMO,
      updated_by: OPERADOR_DEMO,
    },
  ]);

  storeGobernanza.establecerTenantActivo(TENANT_DEMO);
  storeOffline.establecerTenantActivo(TENANT_DEMO);
});

const movimientosKardexDemo: MovimientoKardex[] = [
  {
    id: 'mov-1',
    tenant_id: TENANT_DEMO,
    producto_id: 'prod-1',
    almacen_id: ALMACEN_DEMO,
    lote_id: 'lote-1',
    numero_lote: 'LOT-2026-A1',
    tipo_movimiento: 'ENTRADA_COMPRA',
    metodo_valoracion: 'PEPS',
    cantidad: 24,
    costo_unitario: 54,
    costo_total: 1296,
    saldo_cantidad: 24,
    saldo_costo_unitario: 54,
    saldo_valor_total: 1296,
    referencia_documento: 'OC-0024',
    motivo: 'Recepción inicial en Bodega principal',
    operador_nombre: 'Alex Morgan',
    created_at: '2026-11-04T10:00:00.000Z',
    updated_at: '2026-11-04T10:00:00.000Z',
    deleted_at: null,
    created_by: OPERADOR_DEMO,
    updated_by: OPERADOR_DEMO,
  },
];
</script>

<template>
  <div class="min-h-screen bg-[#F4F7F6] text-slate-900">
    <!-- Barra Superior Institucional Aurora Mist (#203959) -->
    <header class="border-b border-[#416772]/40 bg-[#203959] px-6 py-4 text-white shadow-sm">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div>
          <span class="font-mono text-xs font-semibold tracking-wider text-[#96ADA5] uppercase">
            SGCI · Multi-Tenant SaaS · Paleta Aurora Mist
          </span>
          <h1 class="text-lg font-bold text-white">
            Sistema de Gestión de Control de Inventarios (10 Sprints + 78 Pantallas Figma)
          </h1>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition"
            :class="
              moduloSeleccionado === 'galeria-figma'
                ? 'bg-[#96ADA5] text-[#203959]'
                : 'bg-[#416772] text-white hover:bg-[#416772]/80'
            "
            @click="moduloSeleccionado = 'galeria-figma'"
          >
            78 Pantallas Figma
          </button>
          <button
            type="button"
            class="min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition"
            :class="
              moduloSeleccionado === 'gobernanza-reportes'
                ? 'bg-[#96ADA5] text-[#203959]'
                : 'bg-[#416772] text-white hover:bg-[#416772]/80'
            "
            @click="moduloSeleccionado = 'gobernanza-reportes'"
          >
            Sprint 8-9 · Gobernanza y PWA
          </button>
          <button
            type="button"
            class="min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition"
            :class="
              moduloSeleccionado === 'ajustes-conteos'
                ? 'bg-[#96ADA5] text-[#203959]'
                : 'bg-[#416772] text-white hover:bg-[#416772]/80'
            "
            @click="moduloSeleccionado = 'ajustes-conteos'"
          >
            Sprint 5 · Ajustes
          </button>
          <button
            type="button"
            class="min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition"
            :class="
              moduloSeleccionado === 'impuestos-precios'
                ? 'bg-[#96ADA5] text-[#203959]'
                : 'bg-[#416772] text-white hover:bg-[#416772]/80'
            "
            @click="moduloSeleccionado = 'impuestos-precios'"
          >
            Sprint 6 · Precios e IVA
          </button>
          <button
            type="button"
            class="min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition"
            :class="
              moduloSeleccionado === 'estados-alertas'
                ? 'bg-[#96ADA5] text-[#203959]'
                : 'bg-[#416772] text-white hover:bg-[#416772]/80'
            "
            @click="moduloSeleccionado = 'estados-alertas'"
          >
            Sprint 6 · Estados y Alertas
          </button>
          <button
            type="button"
            class="min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition"
            :class="
              moduloSeleccionado === 'facturacion-caja'
                ? 'bg-[#96ADA5] text-[#203959]'
                : 'bg-[#416772] text-white hover:bg-[#416772]/80'
            "
            @click="moduloSeleccionado = 'facturacion-caja'"
          >
            Sprint 7 · Caja POS
          </button>
          <button
            type="button"
            class="min-h-[44px] rounded-lg px-3.5 py-2 text-xs font-semibold transition"
            :class="
              moduloSeleccionado === 'kardex-peps'
                ? 'bg-[#96ADA5] text-[#203959]'
                : 'bg-[#416772] text-white hover:bg-[#416772]/80'
            "
            @click="moduloSeleccionado = 'kardex-peps'"
          >
            Sprint 1-4 · Kardex / Almacenes
          </button>
        </div>
      </div>
    </header>

    <!-- Contenido Principal -->
    <main class="mx-auto max-w-7xl p-6">
      <Galeria78PantallasFigma v-if="moduloSeleccionado === 'galeria-figma'" />
      <VistaGobernanzaReportesFigma v-else-if="moduloSeleccionado === 'gobernanza-reportes'" />
      <VistaAjustesInventarioFigma v-else-if="moduloSeleccionado === 'ajustes-conteos'" />
      <VistaImpuestosPreciosFigma v-else-if="moduloSeleccionado === 'impuestos-precios'" />
      <VistaEstadosSistemaNotificacionesFigma
        v-else-if="moduloSeleccionado === 'estados-alertas'"
      />
      <VistaFacturacionCajaFigma v-else-if="moduloSeleccionado === 'facturacion-caja'" />
      <div v-else class="space-y-8">
        <TablaKardexAlmacen
          :movimientos="movimientosKardexDemo"
          metodo-valoracion="PEPS"
          nombre-almacen="Bodega principal"
          sku-producto="PRD-001"
        />
        <MapaUbicacionesRack
          nombre-almacen="Bodega principal"
          codigo-almacen="BOD-01"
          :ubicaciones="[
            {
              id: 'bin-1',
              codigo_bin: 'ZONA-A-P01-R01-N01',
              zona: 'A',
              pasillo: '01',
              estante: '01',
              nivel: '01',
              capacidad_maxima: 100,
              unidades_ocupadas: 65,
              sku_principal: 'PRD-001',
            },
          ]"
        />
        <TablaControlLotesFefo :lotes="[]" />
        <PanelRecepcionOrdenCompra
          numero-orden="OC-0024"
          nombre-proveedor="TechSource Global"
          nombre-almacen-destino="Bodega principal"
          :renglones="[]"
        />
      </div>
    </main>
  </div>
</template>
