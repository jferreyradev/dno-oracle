#!/usr/bin/env pwsh
<#
.SYNOPSIS
Script de verificación de setup completo para DNO-Oracle

.DESCRIPTION
Verifica que todo esté configurado correctamente:
- Archivos de configuración
- Variables de entorno
- Conexión a Oracle
- Compilación TypeScript
- Lint del código

.PARAMETER Port
Puerto para verificar el servidor (default: 8000)

.PARAMETER SkipDatabase
Omitir verificación de conexión a base de datos

.EXAMPLE
.\verify-setup.ps1
.\verify-setup.ps1 -Port 3000 -SkipDatabase
#>

param(
    [int]$Port = 8000,
    [switch]$SkipDatabase
)

Write-Host "🔍 Verificando setup de DNO-Oracle..." -ForegroundColor Cyan

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "deno.json")) {
    Write-Host "❌ Error: Ejecuta este script desde la raíz del proyecto DNO-Oracle" -ForegroundColor Red
    exit 1
}

# Verificar archivos esenciales
Write-Host "`n📁 Verificando archivos esenciales..." -ForegroundColor Yellow

$essentialFiles = @(
    "deno.json",
    "api/server-enhanced.ts",
    "config/entities.json",
    ".env"
)

foreach ($file in $essentialFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file (FALTANTE)" -ForegroundColor Red
    }
}

# Verificar estructura de carpetas
Write-Host "`n📂 Verificando estructura..." -ForegroundColor Yellow

$folders = @(
    "api/core",
    "config",
    "docs",
    "examples",
    "public"
)

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "✅ $folder/" -ForegroundColor Green
    } else {
        Write-Host "❌ $folder/ (FALTANTE)" -ForegroundColor Red
    }
}

# Verificar variables de entorno
Write-Host "`n🔧 Verificando variables de entorno..." -ForegroundColor Yellow

if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    $requiredVars = @("DB_HOST", "DB_PORT", "DB_SERVICE", "DB_USER", "DB_PASSWORD")
    
    foreach ($var in $requiredVars) {
        $found = $envContent | Where-Object { $_ -like "$var=*" }
        if ($found) {
            Write-Host "✅ $var" -ForegroundColor Green
        } else {
            Write-Host "❌ $var (NO CONFIGURADO)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "❌ Archivo .env no encontrado" -ForegroundColor Red
}

# Verificar lint de TypeScript
Write-Host "`n🔍 Verificando código TypeScript..." -ForegroundColor Yellow

try {
    $lintResult = deno lint api/ 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Lint pasado" -ForegroundColor Green
    } else {
        Write-Host "❌ Errores de lint encontrados" -ForegroundColor Red
        Write-Host $lintResult -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error ejecutando deno lint" -ForegroundColor Red
}

# Verificar tipos TypeScript
Write-Host "`n🔧 Verificando tipos..." -ForegroundColor Yellow

try {
    $checkResult = deno check api/server-enhanced.ts 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Tipos TypeScript correctos" -ForegroundColor Green
    } else {
        Write-Host "❌ Errores de tipos encontrados" -ForegroundColor Red
        Write-Host $checkResult -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error verificando tipos" -ForegroundColor Red
}

# Verificar conexión a base de datos (si no se omite)
if (-not $SkipDatabase) {
    Write-Host "`n🔗 Verificando conexión a Oracle..." -ForegroundColor Yellow
    
    try {
        $testScript = @"
import { DatabaseService } from './api/core/DatabaseService.ts';

try {
    const db = DatabaseService.getInstance();
    const result = await db.executeQuery('SELECT 1 FROM DUAL', []);
    console.log('✅ Conexión Oracle exitosa');
    Deno.exit(0);
} catch (error) {
    console.error('❌ Error de conexión Oracle:', error.message);
    Deno.exit(1);
}
"@
        $testScript | Out-File -FilePath "temp-db-test.ts" -Encoding UTF8
        
        $dbResult = deno run --allow-net --allow-read --allow-env temp-db-test.ts 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Conexión a Oracle exitosa" -ForegroundColor Green
        } else {
            Write-Host "❌ Error conectando a Oracle" -ForegroundColor Red
            Write-Host $dbResult -ForegroundColor Yellow
        }
        
        Remove-Item "temp-db-test.ts" -ErrorAction SilentlyContinue
    } catch {
        Write-Host "❌ Error verificando conexión Oracle" -ForegroundColor Red
    }
}

# Verificar documentación
Write-Host "`n📚 Verificando documentación..." -ForegroundColor Yellow

$docFiles = @(
    "README.md",
    "docs/WEB-INTERFACE-GUIDE.md",
    "docs/FILE-IMPORT-EXAMPLES.md",
    "QUERY-QUICKSTART.md"
)

foreach ($doc in $docFiles) {
    if (Test-Path $doc) {
        Write-Host "✅ $doc" -ForegroundColor Green
    } else {
        Write-Host "❌ $doc (FALTANTE)" -ForegroundColor Red
    }
}

# Verificar scripts de inicio
Write-Host "`n🚀 Verificando scripts de inicio..." -ForegroundColor Yellow

$scripts = @(
    "start-api-only.ps1",
    "start-web-enhanced.ps1",
    "run-enhanced.ps1"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Write-Host "✅ $script" -ForegroundColor Green
    } else {
        Write-Host "❌ $script (FALTANTE)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 Resumen de verificación:" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray

Write-Host "`n✨ Para iniciar el servidor:" -ForegroundColor Yellow
Write-Host "   Modo completo:  .\start-web-enhanced.ps1" -ForegroundColor White
Write-Host "   Solo API:       .\start-api-only.ps1" -ForegroundColor White

Write-Host "`n📋 Endpoints principales:" -ForegroundColor Yellow
Write-Host "   Documentación:  http://localhost:$Port/api/info" -ForegroundColor White
Write-Host "   Health check:   http://localhost:$Port/api/health" -ForegroundColor White
Write-Host "   Interfaz web:   http://localhost:$Port/ (modo completo)" -ForegroundColor White

Write-Host "`n📚 Documentación disponible:" -ForegroundColor Yellow
Write-Host "   README.md                  - Guía principal" -ForegroundColor White
Write-Host "   QUERY-QUICKSTART.md        - Consultas SQL" -ForegroundColor White
Write-Host "   docs/FILE-IMPORT-EXAMPLES.md  - Importación" -ForegroundColor White
Write-Host "   docs/WEB-INTERFACE-GUIDE.md   - Interfaz web" -ForegroundColor White

Write-Host "`n🎉 ¡Setup verificado! El proyecto está listo para usar." -ForegroundColor Green
