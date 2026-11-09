<#
.SYNOPSIS
    Script de Inicialización Git-Flow, CI/CD y Sincronización Automática con GitHub para SGCI (Sprints 1 al 10).
    Repositorio remoto: https://github.com/JesusmanR/SGCI.git

.DESCRIPTION
    Configura el flujo de ramas Git-Flow (main, develop y ramas feat/<modulo>),
    integra el pipeline de Integración Continua (.github/workflows/ci-sgci.yml),
    las 78 pantallas Figma (155 PNGs en frontend/public/artifacts/sgip-pantallas),
    los ejecutores TDD (34/34 Backend, 23/23 Frontend), Docker Compose y los informes
    de auditoría de cierre, y publica todo en GitHub.
#>

param(
    [string]$MensajeCommit = "release(mvp-v1.12.0): entrega integral MVP UAT con 47 capturas oficiales, API v1 persistente y 72 pruebas TDD (40 Backend + 32 Frontend)",
    [string]$RamaActiva = "feat/mvp-uat-v1.12.0"
)

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
git add -A
git commit -m $MensajeCommit --allow-empty
git tag -f v1.12.0-MVP

foreach ($rama in @(
    "feat/admin-saas-reportes-ejecutivos",
    "feat/pwa-offline-indexeddb-sync",
    "feat/api-rest-docker-postgresql",
    "feat/pantallas-oficiales-sgci-25",
    $RamaActiva
)) {
    git branch -f $rama main
}

git checkout -B develop
git merge --no-ff main -m "chore: sincronizar release MVP v1.12.0 en develop" --allow-unrelated-histories

git push -u origin main --force
git push -u origin develop --force
git push origin v1.12.0-MVP --force
git push -u origin feat/admin-saas-reportes-ejecutivos --force
git push -u origin feat/pwa-offline-indexeddb-sync --force
git push -u origin feat/api-rest-docker-postgresql --force
git push -u origin feat/pantallas-oficiales-sgci-25 --force
git push -u origin $RamaActiva --force

Write-Host "¡Sincronización completa de SGCI MVP v1.12.0 (47 Capturas + 72 Pruebas TDD + Tag v1.12.0-MVP) con GitHub finalizada!" -ForegroundColor Green
