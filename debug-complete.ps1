#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script de depuración completa del proyecto DNO-Oracle

.DESCRIPTION
    Este script ejecuta una depuración exhaustiva del proyecto incluyendo:
    - Verificación de linting
    - Verificación de compilación TypeScript
    - Pruebas de integración
    - Verificación de funcionalidades

.PARAMETER SkipTests
    Saltar las pruebas de integración (solo verificar código)

.PARAMETER Verbose
    Mostrar output detallado

.EXAMPLE
    .\debug-complete.ps1
    Ejecuta depuración completa

.EXAMPLE
    .\debug-complete.ps1 -SkipTests
    Solo verifica código sin ejecutar pruebas

.EXAMPLE
    .\debug-complete.ps1 -Verbose
    Depuración con output detallado
#>

param(
    [switch]$SkipTests,
    [switch]$Verbose
)

# Configuración
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# Colores para output
$Colors = @{
    Success = "Green"
    Error = "Red"
    Warning = "Yellow"
    Info = "Cyan"
    Header = "Magenta"
    Debug = "Gray"
}

function Write-ColorText {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Colors[$Color]
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-ColorText ("=" * 70) "Header"
    Write-ColorText " $Title" "Header"
    Write-ColorText ("=" * 70) "Header"
}

function Test-DenoInstalled {
    try {
        $version = & deno --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            if ($Verbose) {
                Write-ColorText "Deno detectado: $($version.Split([Environment]::NewLine)[0])" "Debug"
            }
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

function Test-ProjectStructure {
    Write-ColorText "🔍 Verificando estructura del proyecto..." "Info"
    
    $requiredFiles = @(
        "api/server-enhanced.ts",
        "api/core/FileImportService.ts",
        "api/core/FileImportController.ts", 
        "api/core/FileImportRouter.ts",
        "api/core/ProcedureController.ts",
        "api/core/ProcedureRouter.ts",
        "config/entities.json",
        "docs/FILE-IMPORT-EXAMPLES.md"
    )
    
    $missing = @()
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            $missing += $file
        }
    }
    
    if ($missing.Count -gt 0) {
        Write-ColorText "❌ Archivos faltantes:" "Error"
        foreach ($file in $missing) {
            Write-ColorText "   - $file" "Error"
        }
        return $false
    }
    
    Write-ColorText "✅ Estructura del proyecto correcta" "Success"
    return $true
}

function Test-Linting {
    Write-ColorText "🔍 Ejecutando Deno lint..." "Info"
    
    try {
        $output = & deno lint 2>&1
        if ($LASTEXITCODE -eq 0) {
            $fileCount = ($output | Select-String "Checked \d+ files").Matches[0].Value
            Write-ColorText "✅ Linting exitoso: $fileCount" "Success"
            return $true
        } else {
            Write-ColorText "❌ Errores de linting encontrados:" "Error"
            Write-ColorText $output "Error"
            return $false
        }
    }
    catch {
        Write-ColorText "❌ Error ejecutando deno lint: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Test-TypeScriptCompilation {
    Write-ColorText "🔍 Verificando compilación TypeScript..." "Info"
    
    $tsFiles = @(
        "api/server-enhanced.ts",
        "api/core/FileImportService.ts",
        "api/core/FileImportController.ts",
        "api/core/FileImportRouter.ts",
        "examples/test-file-import.ts",
        "test-integration-complete.ts"
    )
    
    $errors = @()
    foreach ($file in $tsFiles) {
        if (Test-Path $file) {
            try {
                $output = & deno check $file 2>&1
                if ($LASTEXITCODE -ne 0) {
                    $errors += @{File = $file; Error = $output}
                } elseif ($Verbose) {
                    Write-ColorText "✅ $file - OK" "Debug"
                }
            }
            catch {
                $errors += @{File = $file; Error = $_.Exception.Message}
            }
        }
    }
    
    if ($errors.Count -gt 0) {
        Write-ColorText "❌ Errores de compilación TypeScript:" "Error"
        foreach ($error in $errors) {
            Write-ColorText "   📄 $($error.File):" "Error"
            Write-ColorText "      $($error.Error)" "Error"
        }
        return $false
    }
    
    Write-ColorText "✅ Compilación TypeScript exitosa: $($tsFiles.Count) archivos verificados" "Success"
    return $true
}

function Test-ServerStartup {
    Write-ColorText "🚀 Verificando inicio del servidor..." "Info"
    
    # Verificar si ya hay un servidor ejecutándose
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($response.status -eq "ok") {
            Write-ColorText "✅ Servidor ya está ejecutándose en puerto 8000" "Success"
            return $true
        }
    }
    catch {
        # El servidor no está ejecutándose, intentar iniciarlo
    }
    
    # Intentar iniciar servidor temporalmente
    try {
        Write-ColorText "Iniciando servidor temporal para verificación..." "Info"
        
        $job = Start-Job -ScriptBlock {
            Set-Location $using:PWD
            & deno run --allow-all api/server-enhanced.ts
        }
        
        # Esperar que inicie
        Start-Sleep 3
        
        # Verificar que esté funcionando
        $response = Invoke-RestMethod -Uri "http://localhost:8000/api/health" -TimeoutSec 5
        
        if ($response.status -eq "ok") {
            Write-ColorText "✅ Servidor inicia correctamente" "Success"
            $result = $true
        } else {
            Write-ColorText "❌ Servidor no responde correctamente" "Error"
            $result = $false
        }
        
        # Detener servidor temporal
        Stop-Job $job -ErrorAction SilentlyContinue
        Remove-Job $job -ErrorAction SilentlyContinue
        
        return $result
    }
    catch {
        Write-ColorText "❌ Error verificando servidor: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Test-APIEndpoints {
    Write-ColorText "🌐 Verificando endpoints de API..." "Info"
    
    $endpoints = @(
        @{Path = "/api/health"; Method = "GET"; Expected = "ok"},
        @{Path = "/api/info"; Method = "GET"; Expected = "success"},
        @{Path = "/api/import/info"; Method = "GET"; Expected = "success"},
        @{Path = "/api/procedures/help"; Method = "GET"; Expected = "success"}
    )
    
    $failed = @()
    foreach ($endpoint in $endpoints) {
        try {
            if ($endpoint.Method -eq "GET") {
                $response = Invoke-RestMethod -Uri "http://localhost:8000$($endpoint.Path)" -TimeoutSec 5
            }
            
            $success = $false
            if ($endpoint.Expected -eq "ok" -and $response.status -eq "ok") {
                $success = $true
            } elseif ($endpoint.Expected -eq "success" -and $response.success -eq $true) {
                $success = $true
            }
            
            if ($success) {
                if ($Verbose) {
                    Write-ColorText "✅ $($endpoint.Path) - OK" "Debug"
                }
            } else {
                $failed += $endpoint.Path
            }
        }
        catch {
            $failed += $endpoint.Path
        }
    }
    
    if ($failed.Count -gt 0) {
        Write-ColorText "❌ Endpoints fallidos:" "Error"
        foreach ($path in $failed) {
            Write-ColorText "   - $path" "Error"
        }
        return $false
    }
    
    Write-ColorText "✅ Todos los endpoints responden correctamente" "Success"
    return $true
}

function Test-Integration {
    Write-ColorText "🧪 Ejecutando tests de integración..." "Info"
    
    try {
        $output = & deno test test-integration-complete.ts --allow-all 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $passedTests = ($output | Select-String "test result: ok" | Measure-Object).Count
            if ($passedTests -gt 0) {
                Write-ColorText "✅ Tests de integración exitosos" "Success"
                if ($Verbose) {
                    Write-ColorText $output "Debug"
                }
                return $true
            }
        }
        
        Write-ColorText "❌ Tests de integración fallaron:" "Error"
        Write-ColorText $output "Error"
        return $false
        
    }
    catch {
        Write-ColorText "❌ Error ejecutando tests: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Show-Summary {
    param([hashtable]$Results)
    
    Write-Section "📊 RESUMEN DE DEPURACIÓN"
    
    $totalTests = $Results.Count
    $passedTests = ($Results.Values | Where-Object { $_ -eq $true }).Count
    $failedTests = $totalTests - $passedTests
    
    Write-ColorText "Total de verificaciones: $totalTests" "Info"
    Write-ColorText "Exitosas: $passedTests" "Success"
    Write-ColorText "Fallidas: $failedTests" $(if ($failedTests -eq 0) { "Success" } else { "Error" })
    
    Write-Host ""
    Write-ColorText "Detalles:" "Info"
    foreach ($test in $Results.GetEnumerator()) {
        $status = if ($test.Value) { "✅" } else { "❌" }
        $color = if ($test.Value) { "Success" } else { "Error" }
        Write-ColorText "$status $($test.Key)" $color
    }
    
    if ($failedTests -eq 0) {
        Write-Host ""
        Write-ColorText "🎉 ¡DEPURACIÓN COMPLETADA EXITOSAMENTE!" "Success"
        Write-ColorText "El proyecto DNO-Oracle está funcionando correctamente." "Success"
    } else {
        Write-Host ""
        Write-ColorText "⚠️  DEPURACIÓN COMPLETADA CON ERRORES" "Warning"
        Write-ColorText "Revisa los errores anteriores y corrígelos." "Warning"
    }
}

# Función principal
function Main {
    Write-ColorText "🔧 DEPURACIÓN COMPLETA DEL PROYECTO DNO-ORACLE" "Header"
    Write-ColorText ("=" * 70) "Header"
    
    # Verificar Deno
    if (-not (Test-DenoInstalled)) {
        Write-ColorText "❌ Deno no está instalado o no está en el PATH" "Error"
        Write-ColorText "💡 Instala Deno desde: https://deno.land/#installation" "Warning"
        exit 1
    }
    
    # Inicializar resultados
    $results = @{}
    
    # Ejecutar verificaciones
    Write-Section "📁 VERIFICACIÓN DE ESTRUCTURA"
    $results["Estructura del Proyecto"] = Test-ProjectStructure
    
    Write-Section "🔍 VERIFICACIÓN DE CÓDIGO"
    $results["Linting"] = Test-Linting
    $results["Compilación TypeScript"] = Test-TypeScriptCompilation
    
    Write-Section "🚀 VERIFICACIÓN DE SERVIDOR"
    $results["Inicio del Servidor"] = Test-ServerStartup
    
    if ($results["Inicio del Servidor"]) {
        $results["Endpoints de API"] = Test-APIEndpoints
        
        if (-not $SkipTests -and $results["Endpoints de API"]) {
            Write-Section "🧪 TESTS DE INTEGRACIÓN"
            $results["Tests de Integración"] = Test-Integration
        } elseif ($SkipTests) {
            Write-ColorText "⏭️  Tests de integración saltados (--SkipTests)" "Warning"
        }
    }
    
    # Mostrar resumen
    Show-Summary -Results $results
    
    # Determinar código de salida
    $failedCount = ($results.Values | Where-Object { $_ -eq $false }).Count
    if ($failedCount -gt 0) {
        exit 1
    } else {
        exit 0
    }
}

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "api/server-enhanced.ts")) {
    Write-ColorText "❌ Error: No se encontró api/server-enhanced.ts" "Error"
    Write-ColorText "💡 Asegúrate de ejecutar este script desde el directorio raíz del proyecto" "Warning"
    exit 1
}

# Ejecutar función principal
Main

# Limpiar
$ProgressPreference = "Continue"
