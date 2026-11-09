import { register } from 'node:module';

register('./loader-ts.mjs', import.meta.url);

const { suites } = await import('vitest');

// Importar las suites TDD de los Sprints de Frontend (TypeScript + Pinia)
await import('../src/modulos/catalogo/__tests__/catalogoAlmacenes.prueba.ts');
await import('../src/modulos/lotes/__tests__/lotesFefo.prueba.ts');
await import('../src/modulos/compras/__tests__/comprasRecepcion.prueba.ts');
await import('../src/modulos/conteos/__tests__/auditoriaConteos.prueba.ts');
await import('../src/modulos/precios/__tests__/preciosImpuestosEstados.prueba.ts');
await import('../src/modulos/caja/__tests__/facturacionCajaFigma.prueba.ts');
await import('../src/modulos/gobernanza/__tests__/gobernanzaSaasReportes.prueba.ts');
await import('../src/modulos/offline/__tests__/sincronizacionOfflinePwa.prueba.ts');
await import('../src/stores/__tests__/arquitecturaFrontendCompleta.prueba.ts');
await import('../src/modulos/autenticacion/__tests__/restablecerContrasenaToken.prueba.ts');
await import('../src/modulos/analitica/__tests__/analiticaInventarioAbc.prueba.ts');

let totalTests = 0;
let passedTests = 0;
const failures = [];

console.log('=== EJECUTANDO SUITE TDD FRONTEND SGCI (Node ' + process.version + ' + TypeScript + Pinia) ===');

for (const suite of suites) {
  console.log(`\n▶ Suite: ${suite.name}`);
  for (const testItem of suite.tests) {
    totalTests++;
    try {
      for (const hook of suite.beforeEachFns) {
        await hook();
      }
      await testItem.fn();
      passedTests++;
      console.log(`  ✔ ${testItem.name}`);
    } catch (err) {
      failures.push(`${suite.name} -> ${testItem.name}: ${err.message}`);
      console.log(`  ✘ ${testItem.name} -> ${err.message}`);
    }
  }
}

console.log('\n============================================================');
console.log(`Resumen TDD Frontend: ${passedTests}/${totalTests} pruebas aprobadas.`);
if (failures.length > 0) {
  for (const f of failures) {
    console.error(`FALLO: ${f}`);
  }
  process.exit(1);
}
console.log('ESTADO: 100% VERDE (0 ERRORES)');
