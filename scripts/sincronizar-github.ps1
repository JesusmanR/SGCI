<#
.SYNOPSIS
    Script de Inicialización Git-Flow y Sincronización con GitHub para SGCI.
.DESCRIPTION
    Configura el repositorio Git en C:\dev\SGCI, estructura las ramas Git-Flow
    (main, develop, feat/tenants-auth, feat/catalogo-almacenes, feat/lotes-caducidad)
    con commits semánticos por Sprint y las publica en GitHub.
.PARAMETER UrlRemoto
    URL del repositorio remoto en GitHub (por defecto: https://github.com/JesusmanR/SGCI.git)
#>
param(
    [string]$UrlRemoto = "https://github.com/JesusmanR/SGCI.git"
)

$ErrorActionPreference = "Stop"
Set-Location -Path "C:\dev\SGCI"

Write-Host "=== SGCI: Inicializando Git-Flow y conexión con GitHub ===" -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    git init
    git branch -M main
}

# Verificar o registrar el remoto origin
$remotos = git remote
if ($remotos -notcontains "origin") {
    git remote add origin $UrlRemoto
    Write-Host "Remoto 'origin' vinculado a: $UrlRemoto" -ForegroundColor Green
} else {
    git remote set-url origin $UrlRemoto
    Write-Host "Remoto 'origin' actualizado a: $UrlRemoto" -ForegroundColor Green
}

# 1. Commit fundacional en main / develop
git add .gitignore README.md PRODUCT.md AGENTS.md docs/ database/
git commit -m "docs(arquitectura): fundacion documental, ADRs, Prisma Multi-Tenant y guia Figma Aurora Mist" --allow-empty

# Crear o actualizar rama develop
git checkout -B develop

# 2. Rama Sprint 1: feat/tenants-auth
git checkout -B feat/tenants-auth
git add backend/composer.json backend/app/Compartido/ backend/app/Modulos/Tenants/ backend/app/Modulos/Autenticacion/ backend/app/Modulos/Kardex/ backend/tests/Feature/Modulos/Kardex/ backend/tests/Feature/Modulos/Autenticacion/
git add frontend/package.json frontend/tailwind.config.ts frontend/src/compartido/ frontend/src/diseno/atomos/ frontend/src/diseno/moleculas/SelectorTenantAlmacen.vue frontend/src/diseno/moleculas/TarjetaIndicadorStock.vue frontend/src/diseno/organismos/TablaKardexAlmacen.vue frontend/src/modulos/inventario/ frontend/src/modulos/autenticacion/
git commit -m "feat(tenants-auth): Sprint 1 - aislamiento Multi-Tenant, JWT con rotacion, RBAC 10 roles y motor Kardex" --allow-empty

git checkout develop
git merge --no-ff feat/tenants-auth -m "Merge branch 'feat/tenants-auth' into develop"

# 3. Rama Sprint 2: feat/catalogo-almacenes
git checkout -B feat/catalogo-almacenes
git add backend/app/Modulos/Catalogo/ backend/app/Modulos/Almacenes/ backend/tests/Feature/Modulos/CatalogoAlmacenes/
git add frontend/src/diseno/moleculas/BuscadorEscanerSku.vue frontend/src/diseno/organismos/MapaUbicacionesRack.vue frontend/src/modulos/catalogo/ frontend/src/modulos/almacenes/
git commit -m "feat(catalogo-almacenes): Sprint 2 - catalogo SKU/EAN-13/QR, puntos de reorden, ubicaciones Bin y transferencias en transito" --allow-empty

git checkout develop
git merge --no-ff feat/catalogo-almacenes -m "Merge branch 'feat/catalogo-almacenes' into develop"

# 4. Rama Sprint 3: feat/lotes-caducidad
git checkout -B feat/lotes-caducidad
git add backend/app/Modulos/Lotes/ backend/tests/Feature/Modulos/Lotes/
git add frontend/src/diseno/moleculas/InsigniaSemaforoLote.vue frontend/src/diseno/organismos/TablaControlLotesFefo.vue frontend/src/modulos/lotes/ scripts/
git commit -m "feat(lotes-caducidad): Sprint 3 - trazabilidad por lote, motor de despacho FEFO, semaforo de caducidad y cuarentena" --allow-empty

git checkout develop
git merge --no-ff feat/lotes-caducidad -m "Merge branch 'feat/lotes-caducidad' into develop"

Write-Host "`nSubiendo ramas a GitHub ($UrlRemoto)..." -ForegroundColor Yellow
git push -u origin main
git push -u origin develop
git push -u origin feat/tenants-auth
git push -u origin feat/catalogo-almacenes
git push -u origin feat/lotes-caducidad

Write-Host "`n=== Sincronización Git-Flow completada con éxito ===" -ForegroundColor Green
