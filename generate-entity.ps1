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
    
    # Agregar flag --silent si se va a guardar en archivo o agregar a entities.json
    if ($Archivo -or $Agregar) {
        $arguments += "--silent"
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

function Save-Configuration {
    param(
        [string]$Configuration,
        [string]$OutputFile
    )

    try {
        $Configuration | Out-File -FilePath $OutputFile -Encoding UTF8
        Write-Host "💾 Configuración guardada en: $OutputFile" -ForegroundColor $Color.Success
    }
    catch {
        Write-Host "❌ Error guardando archivo: $($_.Exception.Message)" -ForegroundColor $Color.Error
    }
}

function Add-ToEntitiesFile {
    param(
        [string]$Configuration,
        [string]$EntityName
    )

    $entitiesFile = "config/entities.json"
    
    if (-not (Test-Path $entitiesFile)) {
        Write-Host "❌ Archivo $entitiesFile no encontrado" -ForegroundColor $Color.Error
        return
    }

    try {
        # Leer el archivo actual
        $currentContent = Get-Content $entitiesFile -Raw | ConvertFrom-Json
        
        # Parsear la nueva configuración
        $newEntity = $Configuration | ConvertFrom-Json
        
        # Agregar la nueva entidad
        foreach ($key in $newEntity.PSObject.Properties.Name) {
            $currentContent.entities | Add-Member -Name $key -Value $newEntity.$key -MemberType NoteProperty -Force
        }
        
        # Guardar el archivo actualizado
        $currentContent | ConvertTo-Json -Depth 10 | Out-File $entitiesFile -Encoding UTF8
        
        Write-Host "✅ Entidad agregada a $entitiesFile" -ForegroundColor $Color.Success
        Write-Host "🔄 Reinicia el servidor para aplicar los cambios" -ForegroundColor $Color.Warning
    }
    catch {
        Write-Host "❌ Error agregando entidad: $($_.Exception.Message)" -ForegroundColor $Color.Error
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

    # Extraer solo la parte JSON de la salida
    $lines = $configuration -split "`n"
    $jsonStartIndex = -1
    
    # Buscar el inicio del JSON (línea con solo "{")
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i].Trim() -eq "{") {
            $jsonStartIndex = $i
            break
        }
    }
    
    if ($jsonStartIndex -ge 0) {
        $jsonContent = $lines[$jsonStartIndex..($lines.Length - 1)] -join "`n"
        
        # Encontrar el final del JSON
        $jsonLines = $jsonContent -split "`n"
        $finalJsonLines = @()
        $braceCount = 0
        
        foreach ($line in $jsonLines) {
            # Contar llaves abiertas y cerradas en la línea
            $openBraces = ($line.ToCharArray() | Where-Object { $_ -eq '{' }).Count
            $closeBraces = ($line.ToCharArray() | Where-Object { $_ -eq '}' }).Count
            
            $braceCount += $openBraces - $closeBraces
            $finalJsonLines += $line
            
            # Si braceCount llega a 0, hemos terminado el JSON
            if ($braceCount -eq 0) {
                break
            }
        }
        
        
        # Guardar en archivo si se especifica
        if ($Archivo) {
            Save-Configuration -Configuration $jsonContent -OutputFile $Archivo
        }
        
        # Agregar a entities.json si se especifica
        if ($Agregar) {
            Add-ToEntitiesFile -Configuration $jsonContent -EntityName ($Entidad -or $Tabla)
        }
        
        if (-not $Archivo -and -not $Agregar) {
            Write-Host "📋 Configuración generada:" -ForegroundColor $Color.Success
            Write-Host $jsonContent -ForegroundColor White
        }
    }
    else {
        Write-Host "❌ No se pudo extraer la configuración JSON" -ForegroundColor $Color.Error
    }
}

# Ejecutar función principal
Main
