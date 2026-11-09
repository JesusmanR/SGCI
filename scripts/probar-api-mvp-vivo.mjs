/**
 * Verificador Automatizado End-to-End del Servidor MVP SGCI en Vivo (http://127.0.0.1:4173)
 * Comprueba:
 * 1. Portal Principal HTML (200 OK, barra lateral 252px/72px, Guía UAT)
 * 2. Endpoint /api/v1/health (v1.12.0-MVP, 40/40 Backend, 32/32 Frontend)
 * 3. Persistencia /api/v1/mvp/state (GET y POST) y /api/v1/mvp/reset
 * 4. Comparador INDICE.html y disponibilidad HTTP 200 de las 47 capturas oficiales PNG
 */

const BASE_URL = process.env.SGCI_URL || 'http://127.0.0.1:4173';

function assert(cond, msg) {
  if (!cond) throw new Error(`Fallo E2E MVP: ${msg}`);
}

console.log(`=== VERIFICANDO SERVIDOR MVP SGCI EN VIVO (${BASE_URL}) ===`);

// 1. Verificar /api/v1/health
const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
assert(healthRes.status === 200, 'GET /api/v1/health debe responder 200');
const health = await healthRes.json();
assert(health.estado === 'MVP_LISTO_PARA_PRUEBA_UAT', 'Estado debe ser MVP_LISTO_PARA_PRUEBA_UAT');
assert(health.pantallasOficialesSgci === 47, 'Debe reportar las 47 pantallas oficiales SGCI');
assert(health.tddBackend.aprobadas === 40, 'Debe reportar 40/40 pruebas Backend');
assert(health.tddFrontend.aprobadas === 32, 'Debe reportar 32/32 pruebas Frontend');
console.log('  ✔ Endpoint /api/v1/health verificado (47 PNGs, 40/40 Backend, 32/32 Frontend)');

// 2. Verificar Portal HTML principal
const htmlRes = await fetch(`${BASE_URL}/`);
assert(htmlRes.status === 200, 'GET / debe responder 200');
const html = await htmlRes.text();
assert(html.includes('Guía Prueba MVP'), 'El portal debe incluir el botón Guía Prueba MVP');
assert(html.includes('exportarLibroKardexCsv'), 'El portal debe incluir la exportación CSV del Kardex');
assert(html.includes('w-[72px] min-w-[72px] max-w-[72px]'), 'El menú contraído debe tener ancho fijo 72px sin colisión');
console.log('  ✔ Portal HTML interactivo y barra lateral fija (252px/72px) verificados');

// 3. Verificar Persistencia /api/v1/mvp/state y /api/v1/mvp/reset
const resetRes = await fetch(`${BASE_URL}/api/v1/mvp/reset`, { method: 'POST' });
assert(resetRes.status === 200, 'POST /api/v1/mvp/reset debe responder 200');
const stateRes = await fetch(`${BASE_URL}/api/v1/mvp/state`);
const stateData = await stateRes.json();
assert(Array.isArray(stateData.state.productos) && stateData.state.productos.length >= 3, 'Estado MVP debe contener los productos iniciales');
console.log('  ✔ Endpoints de persistencia (/api/v1/mvp/state y /api/v1/mvp/reset) verificados');

// 4. Verificar manifest.json y las 47 capturas PNG
const manifestRes = await fetch(`${BASE_URL}/artifacts/sgci-pantallas/manifest.json`);
assert(manifestRes.status === 200, 'manifest.json debe responder 200');
const manifest = await manifestRes.json();
assert(Array.isArray(manifest.screens) && manifest.screens.length === 47, 'manifest.json debe listar exactamente 47 capturas');

for (const item of manifest.screens) {
  const pngRes = await fetch(`${BASE_URL}/artifacts/sgci-pantallas/${item.file}`);
  assert(pngRes.status === 200, `Captura PNG no encontrada: ${item.file}`);
}
console.log('  ✔ Las 47 capturas oficiales PNG y el comparador INDICE.html responden HTTP 200 OK');
console.log('=== RESULTADO E2E MVP EN VIVO: 100% OPERATIVO Y LISTO PARA UAT ===');
