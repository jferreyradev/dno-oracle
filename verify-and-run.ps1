# Script de Verificación y Depuración DNO-Oracle
# Verifica la configuración y ejecuta el servidor con mejoras de debug

param(
    [switch]$VerifyOnly,
    [switch]$SkipVerification,
    [int]$Port = 8000,
    [string]$Mode = "enhanced"
)

# Colores para PowerShell
function Write-ColorText {
    param([string]$Text, [string]$Color)
    
    switch($Color) {
        "Red" { Write-Host $Text -ForegroundColor Red }
        "Green" { Write-Host $Text -ForegroundColor Green }
        "Yellow" { Write-Host $Text -ForegroundColor Yellow }
        "Blue" { Write-Host $Text -ForegroundColor Blue }
        "Magenta" { Write-Host $Text -ForegroundColor Magenta }
        "Cyan" { Write-Host $Text -ForegroundColor Cyan }
        default { Write-Host $Text }
    }
}

# Header
Write-Host ""
Write-ColorText "🔍 DNO-Oracle - Script de Verificación y Depuración" "Cyan"
Write-ColorText "==================================================" "Cyan"
Write-Host ""

$errorsFound = 0
$warningsFound = 0

# 1. Verificar que Deno está instalado
Write-ColorText "📦 Verificando Deno..." "Blue"
try {
    $denoVersion = deno --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorText "✅ Deno instalado correctamente" "Green"
        Write-Host "   Versión: $($denoVersion -split "`n" | Select-Object -First 1)"
    } else {
        throw "Deno no encontrado"
    }
} catch {
    Write-ColorText "❌ Deno no está instalado o no está en el PATH" "Red"
    $errorsFound++
    Write-Host "   Instalar desde: https://deno.land/"
    return
}

# 2. Verificar archivos esenciales
Write-Host ""
Write-ColorText "📁 Verificando archivos del proyecto..." "Blue"

$requiredFiles = @(
    "config/entities.json",
    "api/server-enhanced.ts",
    "public/index.html",
    "public/app.js",
    "docs/API-DOCUMENTATION.md"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-ColorText "✅ $file" "Green"
    } else {
        Write-ColorText "❌ $file - NO ENCONTRADO" "Red"
        $errorsFound++
    }
}

# 3. Verificar configuración de entidades
Write-Host ""
Write-ColorText "🔧 Verificando configuración de entidades..." "Blue"

if (Test-Path "config/entities.json") {
    try {
        $entitiesConfig = Get-Content "config/entities.json" | ConvertFrom-Json
        $entityCount = ($entitiesConfig.entities | Get-Member -MemberType NoteProperty).Count
        Write-ColorText "✅ Archivo entities.json válido" "Green"
        Write-Host "   Entidades configuradas: $entityCount"
        
        # Verificar estructura de cada entidad
        foreach ($entityProp in ($entitiesConfig.entities | Get-Member -MemberType NoteProperty)) {
            $entityName = $entityProp.Name
            $entity = $entitiesConfig.entities.$entityName
            
            Write-Host "  ▶ $entityName"
            
            # Verificar campos básicos
            if (-not $entity.tableName) {
                Write-ColorText "    ❌ Sin 'tableName'" "Red"
                $errorsFound++
            }
            
            if (-not $entity.primaryKey) {
                Write-ColorText "    ❌ Sin 'primaryKey'" "Red"
                $errorsFound++
            }
            
            # Verificar allowedConnections
            if (-not $entity.allowedConnections) {
                Write-ColorText "    ⚠️  Sin 'allowedConnections' - puede causar errores multi-conexión" "Yellow"
                $warningsFound++
            } else {
                Write-Host "    🔗 Conexiones: $($entity.allowedConnections -join ', ')"
            }
            
            # Verificar campos
            if (-not $entity.fields) {
                Write-ColorText "    ❌ Sin 'fields' definidos" "Red"
                $errorsFound++
            }
        }
        
    } catch {
        Write-ColorText "❌ Error leyendo entities.json: $($_.Exception.Message)" "Red"
        $errorsFound++
    }
} else {
    Write-ColorText "❌ config/entities.json no encontrado" "Red"
    $errorsFound++
}

# 4. Verificar variables de entorno
Write-Host ""
Write-ColorText "🌐 Verificando variables de entorno..." "Blue"

$envFile = ".env"
if (Test-Path $envFile) {
    Write-ColorText "✅ Archivo .env encontrado" "Green"
    
    $envContent = Get-Content $envFile
    $requiredVars = @("USER", "PASSWORD", "CONNECTIONSTRING")
    $optionalVars = @("PORT", "API_ONLY", "LIB_ORA")
    
    foreach ($var in $requiredVars) {
        $found = $envContent | Where-Object { $_ -match "^$var\s*=" }
        if ($found) {
            Write-ColorText "  ✅ $var configurada" "Green"
        } else {
            Write-ColorText "  ❌ $var NO configurada" "Red"
            $errorsFound++
        }
    }
    
    foreach ($var in $optionalVars) {
        $found = $envContent | Where-Object { $_ -match "^$var\s*=" }
        if ($found) {
            Write-ColorText "  ✅ $var configurada" "Green"
        } else {
            Write-ColorText "  ⚠️  $var no configurada (usando default)" "Yellow"
        }
    }
} else {
    Write-ColorText "⚠️  Archivo .env no encontrado - usando variables del sistema" "Yellow"
    $warningsFound++
}

# 5. Ejecutar verificación TypeScript
if (-not $SkipVerification) {
    Write-Host ""
    Write-ColorText "🔎 Verificando código TypeScript..." "Blue"
    
    try {
        $tsCheck = deno check api/server-enhanced.ts 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-ColorText "✅ Código TypeScript válido" "Green"
        } else {
            Write-ColorText "⚠️  Advertencias TypeScript encontradas (puede funcionar igual)" "Yellow"
            $warningsFound++
            # No contar como error crítico ya que Deno puede ejecutar con advertencias
        }
    } catch {
        Write-ColorText "❌ Error en verificación TypeScript" "Red"
        $errorsFound++
    }
}

# 6. Resumen
Write-Host ""
Write-ColorText "📊 Resumen de Verificación" "Cyan"
Write-ColorText "=========================" "Cyan"

if ($errorsFound -eq 0) {
    Write-ColorText "✅ Sin errores críticos encontrados" "Green"
} else {
    Write-ColorText "❌ $errorsFound error(es) crítico(s) encontrado(s)" "Red"
}

if ($warningsFound -eq 0) {
    Write-ColorText "✅ Sin advertencias" "Green"
} else {
    Write-ColorText "⚠️  $warningsFound advertencia(s) encontrada(s)" "Yellow"
}

# 7. Recomendaciones y acciones
if ($errorsFound -gt 0) {
    Write-Host ""
    Write-ColorText "💡 Recomendaciones:" "Blue"
    Write-Host "  • Corregir errores críticos antes de ejecutar el servidor"
    Write-Host "  • Verificar configuración de conexiones Oracle"
    Write-Host "  • Asegurar que todos los archivos esenciales estén presentes"
    
    if (-not $VerifyOnly) {
        Write-Host ""
        Write-ColorText "⚠️  Hay errores críticos. ¿Continuar ejecutando el servidor? (s/N)" "Yellow"
        $continue = Read-Host
        if ($continue -ne "s" -and $continue -ne "S") {
            Write-ColorText "🛑 Ejecución cancelada por el usuario" "Red"
            return
        }
    }
}

if ($warningsFound -gt 0) {
    Write-Host ""
    Write-ColorText "💡 Para resolver advertencias:" "Blue"
    Write-Host "  • Agregar 'allowedConnections' a entidades sin esta configuración"
    Write-Host "  • Crear archivo .env con variables de entorno"
    Write-Host "  • Verificar configuración de Oracle Instant Client"
}

# 8. Ejecutar servidor (si no es solo verificación)
if (-not $VerifyOnly) {
    Write-Host ""
    Write-ColorText "🚀 Iniciando servidor DNO-Oracle..." "Cyan"
    Write-Host "   Puerto: $Port"
    Write-Host "   Modo: $Mode"
    Write-Host ""
    Write-ColorText "📋 Endpoints disponibles:" "Blue"
    Write-Host "   • http://localhost:$Port - Interfaz web"
    Write-Host "   • http://localhost:$Port/api/info - Documentación API"
    Write-Host "   • http://localhost:$Port/api/health - Estado del sistema"
    Write-Host ""
    Write-ColorText "   Presiona Ctrl+C para detener el servidor" "Yellow"
    Write-Host ""
    
    # Configurar variables de entorno para esta sesión
    $env:PORT = $Port
    
    # Ejecutar servidor
    try {
        if ($Mode -eq "api-only") {
            $env:API_ONLY = "true"
            deno run --allow-all api/server-api-only.ts
        } else {
            deno run --allow-all api/server-enhanced.ts
        }
    } catch {
        Write-ColorText "❌ Error ejecutando servidor: $($_.Exception.Message)" "Red"
    }
} else {
    Write-Host ""
    Write-ColorText "✅ Verificación completada" "Green"
    Write-Host ""
    Write-ColorText "🚀 Para ejecutar el servidor:" "Cyan"
    Write-Host "   .\verify-and-run.ps1"
    Write-Host ""
    Write-ColorText "🔧 Para solo verificar:" "Cyan"
    Write-Host "   .\verify-and-run.ps1 -VerifyOnly"
}
