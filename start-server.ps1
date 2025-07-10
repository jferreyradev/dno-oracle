#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Script de inicio universal para DNO-Oracle API

.DESCRIPTION
    Script universal que funciona en Windows, Linux y macOS para iniciar el servidor DNO-Oracle.
    Detecta automáticamente el sistema operativo y configura las rutas apropiadas.

.PARAMETER Port
    Puerto en el que ejecutar el servidor (por defecto: 8000)

.PARAMETER Mode
    Modo de ejecución: minimal (por defecto) o enhanced

.PARAMETER Help
    Muestra esta ayuda

.EXAMPLE
    # Ejecutar en el puerto por defecto (8000)
    ./start-server.ps1

.EXAMPLE
    # Ejecutar en puerto específico
    ./start-server.ps1 -Port 3000

.EXAMPLE
    # Mostrar ayuda
    ./start-server.ps1 -Help
#>

param(
    [int]$Port = 8000,
    [string]$Mode = "minimal",
    [switch]$Help
)

# Mostrar ayuda si se solicita
if ($Help) {
    Get-Help $MyInvocation.MyCommand.Path -Full
    exit 0
}

# Colores para output
$ColorInfo = "Cyan"
$ColorSuccess = "Green"
$ColorWarning = "Yellow"
$ColorError = "Red"
$ColorHeader = "Magenta"

# Función para mostrar banner
function Show-Banner {
    Write-Host ""
    Write-Host "DNO-Oracle API Server" -ForegroundColor $ColorHeader
    Write-Host "====================" -ForegroundColor $ColorHeader
    Write-Host ""
}

# Función para detectar sistema operativo
function Get-OSPlatform {
    if ($IsWindows -or $env:OS -eq "Windows_NT") {
        return "Windows"
    } elseif ($IsLinux) {
        return "Linux"
    } elseif ($IsMacOS) {
        return "macOS"
    } else {
        return "Unknown"
    }
}

# Función para verificar Deno
function Test-DenoInstallation {
    try {
        $denoVersion = deno --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Función para mostrar instrucciones de instalación de Deno
function Show-DenoInstallInstructions {
    param([string]$OS)
    
    Write-Host "ERROR: Deno no esta instalado o no esta en el PATH" -ForegroundColor $ColorError
    Write-Host ""
    Write-Host "Instrucciones de instalacion:" -ForegroundColor $ColorInfo
    Write-Host ""
    
    switch ($OS) {
        "Windows" {
            Write-Host "PowerShell:" -ForegroundColor $ColorInfo
            Write-Host "  irm https://deno.land/install.ps1 | iex" -ForegroundColor $ColorWarning
            Write-Host ""
            Write-Host "Scoop:" -ForegroundColor $ColorInfo
            Write-Host "  scoop install deno" -ForegroundColor $ColorWarning
            Write-Host ""
            Write-Host "Chocolatey:" -ForegroundColor $ColorInfo
            Write-Host "  choco install deno" -ForegroundColor $ColorWarning
        }
        "Linux" {
            Write-Host "Bash:" -ForegroundColor $ColorInfo
            Write-Host "  curl -fsSL https://deno.land/install.sh | sh" -ForegroundColor $ColorWarning
            Write-Host ""
            Write-Host "Snap:" -ForegroundColor $ColorInfo
            Write-Host "  snap install deno" -ForegroundColor $ColorWarning
            Write-Host ""
            Write-Host "Cargo:" -ForegroundColor $ColorInfo
            Write-Host "  cargo install deno --locked" -ForegroundColor $ColorWarning
        }
        "macOS" {
            Write-Host "Homebrew:" -ForegroundColor $ColorInfo
            Write-Host "  brew install deno" -ForegroundColor $ColorWarning
            Write-Host ""
            Write-Host "Bash:" -ForegroundColor $ColorInfo
            Write-Host "  curl -fsSL https://deno.land/install.sh | sh" -ForegroundColor $ColorWarning
            Write-Host ""
            Write-Host "MacPorts:" -ForegroundColor $ColorInfo
            Write-Host "  sudo port install deno" -ForegroundColor $ColorWarning
        }
    }
    
    Write-Host ""
    Write-Host "Mas informacion: https://deno.land/manual/getting_started/installation" -ForegroundColor $ColorInfo
}

# Función para verificar configuración
function Test-Configuration {
    $configValid = $true
    
    # Verificar .env
    if (-not (Test-Path ".env")) {
        Write-Host "WARNING: Archivo .env no encontrado" -ForegroundColor $ColorWarning
        Write-Host "   Copiando desde .env.example..." -ForegroundColor $ColorInfo
        
        if (Test-Path ".env.example") {
            Copy-Item ".env.example" ".env"
            Write-Host "   SUCCESS: Archivo .env creado desde .env.example" -ForegroundColor $ColorSuccess
        } else {
            Write-Host "   ERROR: Archivo .env.example no encontrado" -ForegroundColor $ColorError
            $configValid = $false
        }
    }
    
    # Verificar config/entities.json
    if (-not (Test-Path "config/entities.json")) {
        Write-Host "WARNING: Archivo config/entities.json no encontrado" -ForegroundColor $ColorWarning
        $configValid = $false
    }
    
    # Verificar servidor
    $serverFile = "api/server-$Mode.ts"
    if (-not (Test-Path $serverFile)) {
        Write-Host "ERROR: Servidor $serverFile no encontrado" -ForegroundColor $ColorError
        $configValid = $false
    }
    
    return $configValid
}

# Función para obtener configuración del puerto
function Get-ConfiguredPort {
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $portLine = $envContent | Where-Object { $_ -match "^PORT\s*=" }
        if ($portLine) {
            $configuredPort = ($portLine -split "=")[1].Trim()
            if ($configuredPort -match "^\d+$") {
                return [int]$configuredPort
            }
        }
    }
    return 8000
}

# Función principal
function Start-Server {
    Show-Banner
    
    # Detectar sistema operativo
    $os = Get-OSPlatform
    Write-Host "Sistema operativo detectado: $os" -ForegroundColor $ColorInfo
    
    # Verificar Deno
    Write-Host "Verificando instalacion de Deno..." -ForegroundColor $ColorInfo
    if (-not (Test-DenoInstallation)) {
        Show-DenoInstallInstructions -OS $os
        exit 1
    }
    
    # Mostrar versión de Deno
    $denoVersion = (deno --version | Select-Object -First 1)
    Write-Host "   SUCCESS: $denoVersion" -ForegroundColor $ColorSuccess
    
    # Verificar configuración
    Write-Host "Verificando configuracion..." -ForegroundColor $ColorInfo
    if (-not (Test-Configuration)) {
        Write-Host "ERROR: Configuracion incompleta. Revisa los archivos mencionados." -ForegroundColor $ColorError
        exit 1
    }
    
    Write-Host "   SUCCESS: Configuracion valida" -ForegroundColor $ColorSuccess
    
    # Configurar puerto
    $envPort = Get-ConfiguredPort
    if ($Port -eq 8000 -and $envPort -ne 8000) {
        $Port = $envPort
        Write-Host "Usando puerto configurado en .env: $Port" -ForegroundColor $ColorInfo
    }
    
    # Configurar servidor
    $serverFile = "api/server-$Mode.ts"
    Write-Host "Iniciando servidor DNO-Oracle..." -ForegroundColor $ColorInfo
    Write-Host "   Archivo: $serverFile" -ForegroundColor $ColorInfo
    Write-Host "   Puerto: $Port" -ForegroundColor $ColorInfo
    Write-Host "   Plataforma: $os" -ForegroundColor $ColorInfo
    Write-Host ""
    
    # Configurar variable de entorno del puerto si es diferente
    if ($Port -ne $envPort) {
        $env:PORT = $Port
    }
    
    # Comando de Deno
    $denoArgs = @(
        "run",
        "--allow-net",
        "--allow-read", 
        "--allow-env",
        "--allow-ffi",
        $serverFile
    )
    
    Write-Host "Ejecutando comando:" -ForegroundColor $ColorInfo
    Write-Host "   deno $($denoArgs -join ' ')" -ForegroundColor $ColorWarning
    Write-Host ""
    Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor $ColorWarning
    Write-Host ""
    
    # Ejecutar servidor
    try {
        & deno @denoArgs
    } catch {
        Write-Host "ERROR: Error al ejecutar el servidor: $($_.Exception.Message)" -ForegroundColor $ColorError
        exit 1
    }
}

# Ejecutar función principal
Start-Server
