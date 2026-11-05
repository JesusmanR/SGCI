<#
.SYNOPSIS
    Script de Inicialización Git-Flow, CI/CD y Sincronización Automática con GitHub para SGCI.
    Repositorio remoto: https://github.com/JesusmanR/SGCI.git

.DESCRIPTION
    Configura el flujo de ramas Git-Flow (main, develop y ramas feat/<modulo>),
    integra el pipeline de Integración Continua (.github/workflows/ci-sgci.yml),
    las 78 pantallas Figma (155 PNGs en frontend/public/artifacts/sgip-pantallas)
    y publica automáticamente todos los commits en GitHub.
#>

$ErrorActionPreference = "Stop"
Set-Location -Path "C:\dev\SGCI"

Write-Host "=== 1. Verificando repositorio Git y remoto origin ===" -ForegroundColor Cyan
if (-not (Test-Path ".git")) {
    git init
}

$remotoActual = git remote
if ($remotoActual -notcontains "origin") {
    git remote add origin https://github.com/JesusmanR/SGCI.git
} else {
    git remote set-url origin https://github.com/JesusmanR/SGCI.git
}

git checkout -B main

Write-Host "=== 2. Commit Base Fundacional, CI/CD, Esquema Prisma y 78 Pantallas Figma en main ===" -ForegroundColor Cyan
git add .gitignore .github/ README.md PRODUCT.md AGENTS.md docs/ database/ scripts/ backend/composer.json backend/phpunit.xml frontend/package.json frontend/tailwind.config.ts frontend/vite.config.ts frontend/tsconfig.json frontend/public/artifacts/sgip-pantallas/
git commit -m "ci(arquitectura): pipeline GitHub Actions CI/CD, fundacion SGCI, esquema Prisma y 78 pantallas Figma" --allow-empty

Write-Host "=== 3. Creando rama de integracion develop ===" -ForegroundColor Cyan
git checkout -B develop
git merge --no-ff main -m "chore: sincronizar base fundacional y CI/CD desde main" --allow-unrelated-histories

Write-Host "=== 4. Sprint 1: feat/tenants-auth-kardex ===" -ForegroundColor Cyan
git checkout -B feat/tenants-auth-kardex
git add backend/app/Compartido/ backend/app/Modulos/Kardex/ backend/app/Modulos/Tenants/ backend/app/Modulos/Autenticacion/
git add backend/tests/Feature/Modulos/Kardex/ backend/tests/Feature/Modulos/Autenticacion/
git add frontend/src/compartido/ frontend/src/diseno/atomos/ frontend/src/diseno/moleculas/SelectorTenantAlmacen.vue frontend/src/diseno/moleculas/TarjetaIndicadorStock.vue frontend/src/diseno/organismos/TablaKardexAlmacen.vue frontend/src/modulos/inventario/ frontend/src/modulos/autenticacion/
git commit -m "feat(sprint-1): aislamiento multi-tenant, RBAC 10 roles y motor Kardex PEPS/UEPS/CPP" --allow-empty
git checkout develop
git merge --no-ff feat/tenants-auth-kardex -m "merge: integrar feat/tenants-auth-kardex en develop"

Write-Host "=== 5. Sprint 2: feat/catalogo-almacenes ===" -ForegroundColor Cyan
git checkout -B feat/catalogo-almacenes
git add backend/app/Modulos/Catalogo/Modelos/ backend/app/Modulos/Catalogo/DTOs/RegistrarProductoDTO.php backend/app/Modulos/Catalogo/Servicios/ValidadorCodigoBarrasService.php backend/app/Modulos/Catalogo/Acciones/ backend/app/Modulos/Almacenes/ backend/tests/Feature/Modulos/CatalogoAlmacenes/
git add frontend/src/diseno/moleculas/BuscadorEscanerSku.vue frontend/src/diseno/organismos/MapaUbicacionesRack.vue frontend/src/modulos/catalogo/ frontend/src/modulos/almacenes/
git commit -m "feat(sprint-2): maestro de catalogo EAN-13/QR, topologia de almacenes y transferencias atomicas" --allow-empty
git checkout develop
git merge --no-ff feat/catalogo-almacenes -m "merge: integrar feat/catalogo-almacenes en develop"

Write-Host "=== 6. Sprint 3: feat/lotes-caducidad ===" -ForegroundColor Cyan
git checkout -B feat/lotes-caducidad
git add backend/app/Modulos/Lotes/ backend/tests/Feature/Modulos/Lotes/
git add frontend/src/diseno/moleculas/InsigniaSemaforoLote.vue frontend/src/diseno/organismos/TablaControlLotesFefo.vue frontend/src/modulos/lotes/
git commit -m "feat(sprint-3): trazabilidad de lotes, motor de despacho FEFO y bloqueo de cuarentena" --allow-empty
git checkout develop
git merge --no-ff feat/lotes-caducidad -m "merge: integrar feat/lotes-caducidad en develop"

Write-Host "=== 7. Sprint 4: feat/abastecimiento-recepcion ===" -ForegroundColor Cyan
git checkout -B feat/abastecimiento-recepcion
git add backend/app/Modulos/Compras/ backend/tests/Feature/Modulos/Compras/
git add frontend/src/diseno/moleculas/RenglonRecepcionMuelle.vue frontend/src/diseno/organismos/PanelRecepcionOrdenCompra.vue frontend/src/modulos/compras/
git commit -m "feat(sprint-4): ordenes de compra, recepcion ciega en muelle e inyeccion en Kardex" --allow-empty
git checkout develop
git merge --no-ff feat/abastecimiento-recepcion -m "merge: integrar feat/abastecimiento-recepcion en develop"

Write-Host "=== 8. Sprint 5: feat/auditoria-conteos-ciegos ===" -ForegroundColor Cyan
git checkout -B feat/auditoria-conteos-ciegos
git add backend/app/Modulos/AuditoriaConteos/ backend/tests/Feature/Modulos/AuditoriaConteos/
git add frontend/src/diseno/moleculas/ModalAjusteExistenciasFigma.vue frontend/src/diseno/organismos/VistaAjustesInventarioFigma.vue frontend/src/modulos/conteos/
git commit -m "feat(sprint-5): auditoria de conteos ciegos, ajustes de inventario Figma (pantallas 42-45 y 78) y conciliacion en Kardex" --allow-empty
git checkout develop
git merge --no-ff feat/auditoria-conteos-ciegos -m "merge: integrar feat/auditoria-conteos-ciegos en develop"

Write-Host "=== 9. Sprint 6: feat/precios-impuestos-estados-pwa ===" -ForegroundColor Cyan
git checkout -B feat/precios-impuestos-estados-pwa
git add backend/app/Modulos/Catalogo/DTOs/ReglaGananciaImpuestoDTO.php backend/app/Modulos/Catalogo/Servicios/CalculadoraPreciosImpuestosService.php backend/app/Modulos/AlertasTiempoReal/ backend/tests/Feature/Modulos/Catalogo/PreciosImpuestosAlertasTest.php
git add frontend/src/diseno/organismos/VistaImpuestosPreciosFigma.vue frontend/src/diseno/organismos/VistaEstadosSistemaNotificacionesFigma.vue frontend/src/modulos/precios/
git commit -m "feat(sprint-6): impuestos IVA, reglas de ganancia, importador CSV con alerta bajo costo y estados del sistema (pantallas Figma 46-59, 68-69 y 77)" --allow-empty
git checkout develop
git merge --no-ff feat/precios-impuestos-estados-pwa -m "merge: integrar feat/precios-impuestos-estados-pwa en develop"

Write-Host "=== 10. Sprint 7: feat/facturacion-caja-galeria-figma ===" -ForegroundColor Cyan
git checkout -B feat/facturacion-caja-galeria-figma
git add backend/app/Modulos/FacturacionCaja/ backend/tests/Feature/Modulos/FacturacionCaja/
git add frontend/src/diseno/organismos/VistaFacturacionCajaFigma.vue frontend/src/diseno/organismos/Galeria78PantallasFigma.vue frontend/src/modulos/caja/
git commit -m "feat(sprint-7): facturacion POS, cobros en caja, arqueo con diferencia y galeria interactiva de las 78 pantallas Figma (pantallas 21-35, 75 y 76)" --allow-empty
git checkout develop
git merge --no-ff feat/facturacion-caja-galeria-figma -m "merge: integrar feat/facturacion-caja-galeria-figma en develop"

Write-Host "=== 11. Publicando ramas en GitHub (origin) ===" -ForegroundColor Green
git push -u origin main --force
git push -u origin develop --force
git push -u origin feat/tenants-auth-kardex --force
git push -u origin feat/catalogo-almacenes --force
git push -u origin feat/lotes-caducidad --force
git push -u origin feat/abastecimiento-recepcion --force
git push -u origin feat/auditoria-conteos-ciegos --force
git push -u origin feat/precios-impuestos-estados-pwa --force
git push -u origin feat/facturacion-caja-galeria-figma --force

Write-Host "¡Sincronización completa de CI/CD, los 7 Sprints y las 78 pantallas Figma con GitHub finalizada!" -ForegroundColor Green
