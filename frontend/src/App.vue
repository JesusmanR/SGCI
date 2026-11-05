<script setup lang="ts">
import { onMounted, ref } from 'vue';
import BarraLateralNavegacionAurora from './diseno/organismos/BarraLateralNavegacionAurora.vue';
import VistaDashboardEjecutivoFigma from './diseno/organismos/VistaDashboardEjecutivoFigma.vue';
import VistaCatalogoProveedoresClientesFigma from './diseno/organismos/VistaCatalogoProveedoresClientesFigma.vue';
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
import { useSesionMultiTenantStore } from './stores/useSesionMultiTenantStore';
import { useAuditoriaConteosStore } from './modulos/conteos/almacen/useAuditoriaConteosStore';
import { usePreciosImpuestosStore } from './modulos/precios/almacen/usePreciosImpuestosStore';
import { useFacturacionCajaStore } from './modulos/caja/almacen/useFacturacionCajaStore';
import {
  useGobernanzaSaasStore,
  type RolUsuarioSaas,
} from './modulos/gobernanza/almacen/useGobernanzaSaasStore';
import { useSincronizacionOfflineStore } from './modulos/offline/almacen/useSincronizacionOfflineStore';
import type { MovimientoKardex } from './compartido/tipos/entidadBase';

const TENANT_DEMO = '11111111-1111-4111-8111-111111111111';
const ALMACEN_DEMO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OPERADOR_DEMO = '99999999-9999-4999-8999-999999999999';

const moduloSeleccionado = ref<string>('dashboard-ejecutivo');

const sesionStore = useSesionMultiTenantStore();
const storeConteos = useAuditoriaConteosStore();
const storePrecios = usePreciosImpuestosStore();
const storeCaja = useFacturacionCajaStore();
const storeGobernanza = useGobernanzaSaasStore();
const storeOffline = useSincronizacionOfflineStore();

function sincronizarContextoTenant(tenantId: string): void {
  storeConteos.establecerContextoTenant(tenantId, sesionStore.empresaActiva.bodegaPrincipalId);
  storePrecios.establecerTenantActivo(tenantId);
  storeCaja.establecerTenantActivo(tenantId);
  storeGobernanza.establecerTenantActivo(tenantId);
  storeOffline.establecerTenantActivo(tenantId);
}

function sincronizarRolActivo(rol: RolUsuarioSaas): void {
  storeGobernanza.cambiarRolActivo(rol);
  if (rol === 'superadmin') {
    moduloSeleccionado.value = 'gobernanza-reportes';
  }
}

function sincronizarEstadoRed(): void {
  storeOffline.cambiarEstadoConexion(sesionStore.conectadoRed);
}

onMounted(() => {
  sincronizarContextoTenant(TENANT_DEMO);

  storeConteos.cargarProductosIniciales([
    {
      id: 'prod-1',
      tenant_id: TENANT_DEMO,
      sku: 'AC-100-FLEX',
      nombre: 'Válvula de Presión Industrial 2"',
      almacenId: ALMACEN_DEMO,
      bodegaNombre: 'ALM-CENTRAL-01 — Bodega Central Monterrey',
      stockActual: 5,
      stockMinimo: 12,
      costoUnitarioBase: 142.5,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: OPERADOR_DEMO,
      updated_by: OPERADOR_DEMO,
    },
    {
      id: 'prod-2',
      tenant_id: TENANT_DEMO,
      sku: 'RB-220-INOX',
      nombre: 'Rodamiento sellado acero inoxidable',
      almacenId: ALMACEN_DEMO,
      bodegaNombre: 'ALM-CENTRAL-01 — Bodega Central Monterrey',
      stockActual: 14,
      stockMinimo: 10,
      costoUnitarioBase: 148.2,
      created_at: '2026-11-04T10:00:00.000Z',
      updated_at: '2026-11-04T10:00:00.000Z',
      deleted_at: null,
      created_by: OPERADOR_DEMO,
      updated_by: OPERADOR_DEMO,
    },
  ]);

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
      detalle: 'Quedan 5 uds. en Bodega Central Bogotá (mínimo 8).',
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
    motivo: 'Recepción inicial en Bodega Central Bogotá',
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
  <div class="flex min-h-screen flex-col bg-[#F4F7F6] text-slate-900 lg:flex-row">
    <!-- Barra Lateral Institucional Aurora Mist (#203959) -->
    <BarraLateralNavegacionAurora
      :ruta-activa-id="moduloSeleccionado"
      :notificaciones-pendientes="storePrecios.notificacionesNoLeidas"
      :operaciones-offline-pendientes="storeOffline.totalPendientes"
      @seleccionar-ruta="moduloSeleccionado = $event"
      @cambiar-tenant="sincronizarContextoTenant"
      @cambiar-rol="sincronizarRolActivo"
      @alternar-conexion="sincronizarEstadoRed"
    />

    <!-- Área Principal Operativa -->
    <main class="flex-1 p-6 overflow-y-auto">
      <div class="mx-auto max-w-7xl space-y-6">
        <VistaDashboardEjecutivoFigma
          v-if="moduloSeleccionado === 'dashboard-ejecutivo'"
          @ir-a-modulo="moduloSeleccionado = $event"
        />
        <VistaCatalogoProveedoresClientesFigma
          v-else-if="moduloSeleccionado === 'catalogo-proveedores-clientes'"
        />
        <Galeria78PantallasFigma v-else-if="moduloSeleccionado === 'galeria-figma'" />
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
            nombre-almacen="Bodega Central Bogotá"
            sku-producto="PRD-001"
          />
          <MapaUbicacionesRack
            nombre-almacen="Bodega Central Bogotá"
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
            nombre-almacen-destino="Bodega Central Bogotá"
            :renglones="[]"
          />
        </div>
      </div>
    </main>
  </div>
</template>
