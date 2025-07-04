#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script para probar la funcionalidad de importación de archivos CSV a Oracle

.DESCRIPTION
    Este script ejecuta una prueba completa de la funcionalidad de importación de archivos CSV,
    incluyendo validación, mapeo automático e importación real a la base de datos Oracle.

.PARAMETER ServerUrl
    URL del servidor API (por defecto: http://localhost:8000)

.PARAMETER TableName
    Nombre de la tabla Oracle donde importar (por defecto: WORKFLOW.PROC_CAB)

.PARAMETER Help
    Muestra la ayuda del script

.EXAMPLE
    .\test-file-import.ps1
    Ejecuta el test con los valores por defecto

.EXAMPLE
    .\test-file-import.ps1 -ServerUrl "http://localhost:8080" -TableName "OTRA_TABLA"
    Ejecuta el test con parámetros personalizados

.EXAMPLE
    .\test-file-import.ps1 -Help
    Muestra la ayuda completa
#>

param(
    [string]$ServerUrl = "http://localhost:8000",
    [string]$TableName = "WORKFLOW.PROC_CAB",
    [switch]$Help
)

# Mostrar ayuda si se solicita
if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Full
    exit 0
}

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
}

function Write-ColorText {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Colors[$Color]
}

function Test-ServerConnection {
    param([string]$Url)
    
    try {
        $response = Invoke-RestMethod -Uri "$Url/api/health" -Method GET -TimeoutSec 5
        if ($response.status -eq "ok") {
            return $true
        }
        return $false
    }
    catch {
        return $false
    }
}

# Función principal
function Main {
    Write-ColorText "🔧 Script de Prueba de Importación de Archivos CSV a Oracle" "Header"
    Write-ColorText ("=" * 70) "Header"
    
    # Mostrar configuración
    Write-ColorText "📋 Configuración:" "Info"
    Write-ColorText "   - Servidor: $ServerUrl" "Info"
    Write-ColorText "   - Tabla: $TableName" "Info"
    Write-ColorText ""
    
    # Verificar conexión al servidor
    Write-ColorText "🌐 Verificando conexión al servidor..." "Info"
    
    if (-not (Test-ServerConnection -Url $ServerUrl)) {
        Write-ColorText "❌ Error: No se pudo conectar al servidor $ServerUrl" "Error"
        Write-ColorText "💡 Asegúrate de que el servidor esté ejecutándose:" "Warning"
        Write-ColorText "   deno run --allow-all api/server-enhanced.ts" "Warning"
        exit 1
    }
    
    Write-ColorText "✅ Servidor conectado correctamente" "Success"
    Write-ColorText ""
    
    # Ejecutar test con Deno
    Write-ColorText "🚀 Ejecutando prueba de importación..." "Info"
    Write-ColorText ("=" * 70) "Header"
    
    try {
        # Ejecutar el script de prueba
        & deno run --allow-all examples/test-file-import.ts
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorText ""
            Write-ColorText ("=" * 70) "Header"
            Write-ColorText "🎉 ¡Prueba de importación completada exitosamente!" "Success"
            Write-ColorText ""
            Write-ColorText "📊 Funcionalidades verificadas:" "Info"
            Write-ColorText "   ✅ Parseo de headers CSV" "Success"
            Write-ColorText "   ✅ Obtención de columnas de tabla" "Success"
            Write-ColorText "   ✅ Generación de mapping automático" "Success"
            Write-ColorText "   ✅ Validación de datos" "Success"
            Write-ColorText "   ✅ Importación de datos" "Success"
            Write-ColorText "   ✅ Información del sistema" "Success"
            Write-ColorText ""
            Write-ColorText "🎯 La funcionalidad de importación está funcionando correctamente" "Success"
        }
        else {
            Write-ColorText "❌ Error en la ejecución de la prueba" "Error"
            exit 1
        }
    }
    catch {
        Write-ColorText "❌ Error ejecutando la prueba: $($_.Exception.Message)" "Error"
        exit 1
    }
    
    # Mostrar información adicional
    Write-ColorText ""
    Write-ColorText "📚 Documentación disponible:" "Info"
    Write-ColorText "   - Ejemplos: docs/FILE-IMPORT-EXAMPLES.md" "Info"
    Write-ColorText "   - API Info: $ServerUrl/api/import/info" "Info"
    Write-ColorText "   - Health Check: $ServerUrl/api/health" "Info"
    Write-ColorText ""
    Write-ColorText "🛠️ Endpoints disponibles:" "Info"
    Write-ColorText "   - POST /api/import/csv (Importar CSV)" "Info"
    Write-ColorText "   - POST /api/import/validate (Validar CSV)" "Info"
    Write-ColorText "   - POST /api/import/headers (Parsear headers)" "Info"
    Write-ColorText "   - POST /api/import/mapping (Generar mapping)" "Info"
    Write-ColorText "   - GET /api/import/info (Información)" "Info"
    Write-ColorText "   - GET /api/import/columns/:tableName (Columnas)" "Info"
    Write-ColorText ""
}

# Verificar que Deno esté instalado
if (-not (Get-Command deno -ErrorAction SilentlyContinue)) {
    Write-ColorText "❌ Error: Deno no está instalado o no está en el PATH" "Error"
    Write-ColorText "💡 Instala Deno desde: https://deno.land/#installation" "Warning"
    exit 1
}

# Verificar que el archivo de prueba existe
if (-not (Test-Path "examples/test-file-import.ts")) {
    Write-ColorText "❌ Error: No se encontró el archivo de prueba examples/test-file-import.ts" "Error"
    Write-ColorText "💡 Asegúrate de ejecutar este script desde el directorio raíz del proyecto" "Warning"
    exit 1
}

# Ejecutar función principal
Main

# Limpiar
$ProgressPreference = "Continue"
