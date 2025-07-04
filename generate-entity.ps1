#!/usr/bin/env pwsh

<#
.SYNOPSIS
Generador de configuración de entidades Oracle para DNO-Oracle

.DESCRIPTION
Este script genera automáticamente la configuración JSON necesaria para el archivo entities.json
analizando una tabla de Oracle y detectando automáticamente sus columnas, tipos, constraints, etc.

.PARAMETER Tabla
Nombre de la tabla Oracle a analizar (requerido)

.PARAMETER Entidad
Nombre de la entidad en el JSON (opcional, por defecto usa el nombre de la tabla)

.PARAMETER Archivo
Archivo de salida para guardar la configuración (opcional)

.PARAMETER Agregar
Agregar automáticamente la configuración al archivo entities.json existente

.PARAMETER Ayuda
Muestra esta ayuda

.EXAMPLE
.\generate-entity.ps1 -Tabla "USUARIOS"
Genera la configuración para la tabla USUARIOS

.EXAMPLE
.\generate-entity.ps1 -Tabla "WORKFLOW.PROC_CAB" -Entidad "proc_cab"
Genera la configuración para la tabla WORKFLOW.PROC_CAB con nombre de entidad proc_cab

.EXAMPLE
.\generate-entity.ps1 -Tabla "SYSTEM_LOGS" -Archivo "logs-config.json"
Genera la configuración y la guarda en un archivo específico

.EXAMPLE
.\generate-entity.ps1 -Tabla "USUARIOS" -Agregar
Genera la configuración y la agrega automáticamente al archivo entities.json
#>

param(
    [Parameter(Mandatory = $false)]
    [string]$Tabla,
    
    [Parameter(Mandatory = $false)]
    [string]$Entidad,
    
    [Parameter(Mandatory = $false)]
    [string]$Archivo,
    
    [Parameter(Mandatory = $false)]
    [switch]$Agregar,
    
    [Parameter(Mandatory = $false)]
    [switch]$Ayuda
)

# Colores para la salida
$Color = @{
    Success = "Green"
    Warning = "Yellow"
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

function Show-Header {
    Write-Host ""
    Write-Host "🔧 " -ForegroundColor $Color.Header -NoNewline
    Write-Host "Generador de Configuración de Entidades Oracle" -ForegroundColor $Color.Header
    Write-Host "=" * 60 -ForegroundColor $Color.Header
}

function Show-Help {
    Show-Header
    Write-Host ""
    Write-Host "📖 USO:" -ForegroundColor $Color.Info
    Write-Host "  .\generate-entity.ps1 -Tabla <NOMBRE_TABLA> [-Entidad <NOMBRE_ENTIDAD>] [-Archivo <ARCHIVO>] [-Agregar]" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 PARÁMETROS:" -ForegroundColor $Color.Info
    Write-Host "  -Tabla      Nombre de la tabla Oracle (requerido)" -ForegroundColor White
    Write-Host "  -Entidad    Nombre de la entidad en el JSON (opcional)" -ForegroundColor White
    Write-Host "  -Archivo    Archivo de salida (opcional)" -ForegroundColor White
    Write-Host "  -Agregar    Agregar automáticamente a entities.json" -ForegroundColor White
    Write-Host "  -Ayuda      Mostrar esta ayuda" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 EJEMPLOS:" -ForegroundColor $Color.Info
    Write-Host "  .\generate-entity.ps1 -Tabla 'USUARIOS'" -ForegroundColor Yellow
    Write-Host "  .\generate-entity.ps1 -Tabla 'WORKFLOW.PROC_CAB' -Entidad 'proc_cab'" -ForegroundColor Yellow
    Write-Host "  .\generate-entity.ps1 -Tabla 'SYSTEM_LOGS' -Archivo 'logs-config.json'" -ForegroundColor Yellow
    Write-Host "  .\generate-entity.ps1 -Tabla 'USUARIOS' -Agregar" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔗 REPOSITORIO:" -ForegroundColor $Color.Info
    Write-Host "  https://github.com/tu-usuario/dno-oracle" -ForegroundColor White
    Write-Host ""
}

function Test-Prerequisites {
    # Verificar que Deno está instalado
    try {
        $denoVersion = deno --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Deno no encontrado"
        }
        Write-Host "✅ Deno encontrado" -ForegroundColor $Color.Success
    }
    catch {
        Write-Host "❌ Deno no está instalado o no está en el PATH" -ForegroundColor $Color.Error
        Write-Host "   Instala Deno desde: https://deno.land/manual/getting_started/installation" -ForegroundColor $Color.Warning
        return $false
    }

    # Verificar que existe el archivo .env
    if (-not (Test-Path ".env")) {
        Write-Host "❌ Archivo .env no encontrado" -ForegroundColor $Color.Error
        Write-Host "   Crea un archivo .env con la configuración de Oracle" -ForegroundColor $Color.Warning
        return $false
    }
    Write-Host "✅ Archivo .env encontrado" -ForegroundColor $Color.Success

    # Verificar que existe el script generador
    if (-not (Test-Path "scripts/generate-entity-config.ts")) {
        Write-Host "❌ Script generador no encontrado" -ForegroundColor $Color.Error
        Write-Host "   Verifica que el archivo scripts/generate-entity-config.ts existe" -ForegroundColor $Color.Warning
        return $false
    }
    Write-Host "✅ Script generador encontrado" -ForegroundColor $Color.Success

    return $true
}

function Invoke-EntityGenerator {
    param(
        [string]$TableName,
        [string]$EntityName
    )

    $arguments = @("run", "--allow-all", "scripts/generate-entity-config.ts", $TableName)
    
    if ($EntityName) {
        $arguments += $EntityName
    }
    
    # Agregar flags según las opciones
    if ($Archivo -or $Agregar) {
        $arguments += "--silent"
    }
    
    if ($Agregar) {
        $arguments += "--add-to-entities"
    }
    
    if ($Archivo) {
        $arguments += "--save-file=$Archivo"
    }

    Write-Host "🔄 Ejecutando generador..." -ForegroundColor $Color.Info
    Write-Host "   Comando: deno $($arguments -join ' ')" -ForegroundColor Gray
    Write-Host ""

    try {
        $result = & deno $arguments 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Generación completada exitosamente" -ForegroundColor $Color.Success
            return $result
        }
        else {
            Write-Host "❌ Error durante la generación" -ForegroundColor $Color.Error
            Write-Host $result -ForegroundColor $Color.Error
            return $null
        }
    }
    catch {
        Write-Host "❌ Error ejecutando el generador: $($_.Exception.Message)" -ForegroundColor $Color.Error
        return $null
    }
}

# Función principal
function Main {
    Show-Header

    if ($Ayuda) {
        Show-Help
        return
    }

    if (-not $Tabla) {
        Write-Host "❌ El parámetro -Tabla es requerido" -ForegroundColor $Color.Error
        Write-Host "   Usa -Ayuda para ver la ayuda completa" -ForegroundColor $Color.Warning
        return
    }

    Write-Host "🎯 Configuración:" -ForegroundColor $Color.Info
    Write-Host "   Tabla: $Tabla" -ForegroundColor White
    if ($Entidad) {
        Write-Host "   Entidad: $Entidad" -ForegroundColor White
    }
    if ($Archivo) {
        Write-Host "   Archivo salida: $Archivo" -ForegroundColor White
    }
    if ($Agregar) {
        Write-Host "   Agregar a entities.json: Sí" -ForegroundColor White
    }
    Write-Host ""

    # Verificar prerequisitos
    Write-Host "🔍 Verificando prerequisitos..." -ForegroundColor $Color.Info
    if (-not (Test-Prerequisites)) {
        return
    }
    Write-Host ""

    # Generar configuración
    $configuration = Invoke-EntityGenerator -TableName $Tabla -EntityName $Entidad
    
    if (-not $configuration) {
        return
    }

    # Si no se especificó archivo ni agregar, mostrar el resultado
    if (-not $Archivo -and -not $Agregar) {
        Write-Host "📋 Configuración generada:" -ForegroundColor $Color.Success
        Write-Host $configuration -ForegroundColor White
    }
}

# Ejecutar función principal
Main
