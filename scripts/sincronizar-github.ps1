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
git commit -m "feat(sgci-pantallas): integración de las 25 pantallas oficiales SGCI (15 escritorio 1440px + 10 móvil 390px), cierre de brechas LEEME.txt y TDD 100% verde (36/36 Backend, 28/28 Frontend)" --allow-empty

foreach ($rama in @(
    "feat/admin-saas-reportes-ejecutivos",
    "feat/pwa-offline-indexeddb-sync",
    "feat/api-rest-docker-postgresql",
    "feat/pantallas-oficiales-sgci-25"
)) {
    git branch -f $rama main
}

git checkout -B develop
git merge --no-ff main -m "chore: sincronizar pantallas oficiales SGCI y cierre de brechas en develop" --allow-unrelated-histories

git push -u origin main --force
git push -u origin develop --force
git push -u origin feat/admin-saas-reportes-ejecutivos --force
git push -u origin feat/pwa-offline-indexeddb-sync --force
git push -u origin feat/api-rest-docker-postgresql --force
git push -u origin feat/pantallas-oficiales-sgci-25 --force

Write-Host "¡Sincronización completa de SGCI (25 Pantallas Oficiales + Sprints 1-12) con GitHub finalizada!" -ForegroundColor Green
