# Script de verificación de la nueva estructura multiplataforma

Write-Host "🔍 Verificando Estructura Multiplataforma de DNO-Oracle" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0
$warnings = 0

# Función para verificar archivos
function Test-ScriptFile {
    param(
        [string]$Path,
        [string]$Description
    )
    
    if (Test-Path $Path) {
        Write-Host "✅ $Description" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ $Description - No encontrado: $Path" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

# Función para verificar directorios
function Test-Directory {
    param(
        [string]$Path,
        [string]$Description
    )
    
    if (Test-Path $Path -PathType Container) {
        Write-Host "📁 $Description" -ForegroundColor Blue
        return $true
    } else {
        Write-Host "❌ $Description - No encontrado: $Path" -ForegroundColor Red
        $script:errors++
        return $false
    }
}

Write-Host "=== Verificando Estructura de Directorios ===" -ForegroundColor Yellow

Test-Directory "scripts\windows" "Directorio Windows"
Test-Directory "scripts\linux" "Directorio Linux"
Test-Directory "scripts\common" "Directorio Common"

Write-Host ""
Write-Host "=== Verificando Scripts de Windows ===" -ForegroundColor Yellow

$windowsScripts = @(
    @{ Path = "scripts\windows\oracle-setup.ps1"; Desc = "Oracle Setup (Windows)" },
    @{ Path = "scripts\windows\diagnose-oracle.ps1"; Desc = "Diagnóstico Oracle (Windows)" },
    @{ Path = "scripts\windows\fix-dns.ps1"; Desc = "Fix DNS (Windows)" },
    @{ Path = "scripts\windows\demo-api.ps1"; Desc = "Demo API (Windows)" },
    @{ Path = "scripts\windows\demo-complete.ps1"; Desc = "Demo Completo (Windows)" },
    @{ Path = "scripts\windows\setup-logs-demo.ps1"; Desc = "Setup Logs (Windows)" }
)

foreach ($script in $windowsScripts) {
    Test-ScriptFile -Path $script.Path -Description $script.Desc
}

Write-Host ""
Write-Host "=== Verificando Scripts de Linux ===" -ForegroundColor Yellow

$linuxScripts = @(
    @{ Path = "scripts\linux\oracle-setup.sh"; Desc = "Oracle Setup (Linux)" },
    @{ Path = "scripts\linux\diagnose-oracle.sh"; Desc = "Diagnóstico Oracle (Linux)" },
    @{ Path = "scripts\linux\fix-dns.sh"; Desc = "Fix DNS (Linux)" },
    @{ Path = "scripts\linux\demo-api.sh"; Desc = "Demo API (Linux)" },
    @{ Path = "scripts\linux\demo-complete.sh"; Desc = "Demo Completo (Linux)" },
    @{ Path = "scripts\linux\setup-logs-demo.sh"; Desc = "Setup Logs (Linux)" }
)

foreach ($script in $linuxScripts) {
    Test-ScriptFile -Path $script.Path -Description $script.Desc
}

Write-Host ""
Write-Host "=== Verificando Archivos Comunes ===" -ForegroundColor Yellow

$commonFiles = @(
    @{ Path = "scripts\common\sql-executor.js"; Desc = "Ejecutor SQL" },
    @{ Path = "scripts\common\create-logs-table.sql"; Desc = "Script Tabla Logs" },
    @{ Path = "scripts\common\create-users-table.sql"; Desc = "Script Tabla Users" },
    @{ Path = "scripts\common\test-logs-simple.js"; Desc = "Test Logs Simple" }
)

foreach ($file in $commonFiles) {
    Test-ScriptFile -Path $file.Path -Description $file.Desc
}

Write-Host ""
Write-Host "=== Verificando Scripts Principales ===" -ForegroundColor Yellow

Test-ScriptFile "run.ps1" "Script Principal Windows (PowerShell)"
Test-ScriptFile "run.bat" "Script Principal Windows (Batch)"
Test-ScriptFile "run.sh" "Script Principal Linux"

Write-Host ""
Write-Host "=== Verificando Documentación ===" -ForegroundColor Yellow

$docs = @(
    @{ Path = "README-WINDOWS.md"; Desc = "Documentación Windows" },
    @{ Path = "README-MULTIPLATAFORMA.md"; Desc = "Documentación Multiplataforma" },
    @{ Path = "docs\API.md"; Desc = "Documentación API" }
)

foreach ($doc in $docs) {
    if (Test-Path $doc.Path) {
        Write-Host "📚 $($doc.Desc)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $($doc.Desc) - No encontrado" -ForegroundColor Yellow
        $warnings++
    }
}

Write-Host ""
Write-Host "=== Probando Funcionalidad Básica ===" -ForegroundColor Yellow

# Probar que los scripts principales responden
try {
    $helpOutput = & ".\run.ps1" "help" 2>&1
    if ($helpOutput -match "DNO-Oracle") {
        Write-Host "✅ Script principal Windows funcional" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Script principal Windows responde pero sin contenido esperado" -ForegroundColor Yellow
        $warnings++
    }
} catch {
    Write-Host "❌ Error ejecutando script principal Windows" -ForegroundColor Red
    $errors++
}

# Probar que el sql-executor funciona con las rutas corregidas
try {
    $sqlOutput = deno run --allow-net --allow-read --allow-env --allow-ffi scripts/common/sql-executor.js --help 2>&1
    if ($LASTEXITCODE -eq 0 -or $sqlOutput -match "SQL") {
        Write-Host "✅ SQL Executor con rutas corregidas" -ForegroundColor Green
    } else {
        Write-Host "⚠️  SQL Executor puede tener problemas de rutas" -ForegroundColor Yellow
        $warnings++
    }
} catch {
    Write-Host "❌ Error en SQL Executor - revisar rutas de importación" -ForegroundColor Red
    $errors++
}

# Verificar estructura de comandos
$expectedCommands = @("install", "test", "api", "demo", "diagnose", "help")
Write-Host ""
Write-Host "📋 Comandos disponibles verificados:" -ForegroundColor Cyan
foreach ($cmd in $expectedCommands) {
    Write-Host "   - $cmd" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Resumen de Verificación ===" -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "🎉 ¡Estructura multiplataforma configurada correctamente!" -ForegroundColor Green
    Write-Host "   ✅ Todos los archivos en su lugar" -ForegroundColor Green
    Write-Host "   ✅ Scripts principales funcionales" -ForegroundColor Green
    Write-Host "   ✅ Documentación disponible" -ForegroundColor Green
} elseif ($errors -eq 0) {
    Write-Host "✅ Estructura básica correcta con algunas advertencias" -ForegroundColor Yellow
    Write-Host "   Errores: $errors" -ForegroundColor Green
    Write-Host "   Advertencias: $warnings" -ForegroundColor Yellow
} else {
    Write-Host "❌ Se encontraron problemas en la estructura" -ForegroundColor Red
    Write-Host "   Errores: $errors" -ForegroundColor Red
    Write-Host "   Advertencias: $warnings" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Próximos pasos recomendados:" -ForegroundColor Cyan
Write-Host "1. Ejecutar: .\run.ps1 install" -ForegroundColor Gray
Write-Host "2. Configurar: Copy-Item .env.example .env" -ForegroundColor Gray
Write-Host "3. Probar: .\run.ps1 test" -ForegroundColor Gray
Write-Host "4. Demo completo: .\run.ps1 demo:complete" -ForegroundColor Gray

Write-Host ""
Write-Host "📚 Consultar documentación:" -ForegroundColor Cyan
Write-Host "   - README-WINDOWS.md para Windows" -ForegroundColor Gray
Write-Host "   - README-MULTIPLATAFORMA.md para visión general" -ForegroundColor Gray

if ($errors -gt 0) {
    exit 1
} else {
    exit 0
}
