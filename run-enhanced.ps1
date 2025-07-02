# API Genérica Mejorada - Script de inicio para Windows
# Uso: .\run-enhanced.ps1 [puerto]

param(
    [int]$Puerto = 8000,
    [switch]$ConCache = $true,
    [switch]$ConAuth = $false,
    [switch]$Ayuda
)

if ($Ayuda) {
    Write-Host "=== API Genérica Mejorada ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso: .\run-enhanced.ps1 [opciones]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Green
    Write-Host "  -Puerto <numero>    Puerto del servidor (default: 8000)"
    Write-Host "  -ConCache           Habilitar cache (default: true)"
    Write-Host "  -ConAuth            Habilitar autenticación (default: false)"
    Write-Host "  -Ayuda              Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Ejemplos:" -ForegroundColor Magenta
    Write-Host "  .\run-enhanced.ps1"
    Write-Host "  .\run-enhanced.ps1 -Puerto 3000"
    Write-Host "  .\run-enhanced.ps1 -ConAuth"
    Write-Host ""
    exit 0
}

Write-Host "=== API Genérica Mejorada ===" -ForegroundColor Cyan
Write-Host ""

# Verificar que Deno esté instalado
$denoVersion = deno --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deno no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "   Instala Deno desde: https://deno.land/manual/getting_started/installation" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Deno disponible: $($denoVersion.Split("`n")[0])" -ForegroundColor Green

# Verificar archivos requeridos
$archivosRequeridos = @(
    "api\server-enhanced.ts",
    "config\entities.json",
    ".env"
)

$archivosFaltantes = @()
foreach ($archivo in $archivosRequeridos) {
    if (-not (Test-Path $archivo)) {
        $archivosFaltantes += $archivo
    }
}

if ($archivosFaltantes.Count -gt 0) {
    Write-Host "❌ Archivos faltantes:" -ForegroundColor Red
    foreach ($archivo in $archivosFaltantes) {
        Write-Host "   - $archivo" -ForegroundColor Red
    }
    exit 1
}

Write-Host "✅ Archivos de configuración encontrados" -ForegroundColor Green

# Configurar variables de entorno
if (Test-Path ".env") {
    Write-Host "📄 Cargando variables de entorno desde .env" -ForegroundColor Blue
    Get-Content ".env" | Where-Object { $_ -match "^[^#].*=" } | ForEach-Object {
        $name, $value = $_ -split '=', 2
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), [System.EnvironmentVariableTarget]::Process)
    }
}

# Establecer puerto
$env:PORT = $Puerto

Write-Host ""
Write-Host "🔧 Configuración:" -ForegroundColor Yellow
Write-Host "   Puerto: $Puerto"
Write-Host "   Cache: $(if($ConCache){'Habilitado'}else{'Deshabilitado'})"
Write-Host "   Autenticación: $(if($ConAuth){'Habilitada'}else{'Deshabilitada'})"
Write-Host ""

Write-Host "🚀 Iniciando servidor..." -ForegroundColor Magenta
Write-Host ""

# Comando Deno con permisos necesarios
$denoArgs = @(
    "run"
    "--allow-net"
    "--allow-read" 
    "--allow-env"
    "--allow-ffi"
    "run-enhanced.ts"
    $Puerto.ToString()
)

try {
    # Iniciar servidor
    & deno @denoArgs
}
catch {
    Write-Host ""
    Write-Host "❌ Error al ejecutar el servidor: $_" -ForegroundColor Red
    exit 1
}
finally {
    Write-Host ""
    Write-Host "🛑 Servidor detenido" -ForegroundColor Yellow
}
