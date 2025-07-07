#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Inicia el servidor DNO-Oracle con interfaz web

.DESCRIPTION
    Este script inicia el servidor API con la interfaz web moderna para gestión de datos Oracle.
    Incluye importación de archivos, gestión de tablas, consultas SQL y procedimientos almacenados.

.PARAMETER Port
    Puerto del servidor (por defecto: 8000)

.PARAMETER OpenBrowser
    Abre automáticamente el navegador web

.PARAMETER Help
    Muestra la ayuda del script

.EXAMPLE
    .\start-web-interface.ps1
    Inicia el servidor en el puerto 8000

.EXAMPLE
    .\start-web-interface.ps1 -Port 8080 -OpenBrowser
    Inicia el servidor en el puerto 8080 y abre el navegador

.EXAMPLE
    .\start-web-interface.ps1 -Help
    Muestra la ayuda completa
#>

param(
    [int]$Port = 8000,
    [switch]$OpenBrowser,
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

function Test-Port {
    param([int]$PortNumber)
    
    try {
        $tcpConnection = New-Object System.Net.Sockets.TcpClient
        $tcpConnection.Connect("localhost", $PortNumber)
        $tcpConnection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Función principal
function Main {
    Write-ColorText "🌐 DNO-Oracle - Interfaz Web" "Header"
    Write-ColorText ("=" * 60) "Header"
    
    # Mostrar configuración
    Write-ColorText "📋 Configuración:" "Info"
    Write-ColorText "   - Puerto: $Port" "Info"
    Write-ColorText "   - URL: http://localhost:$Port" "Info"
    Write-ColorText ""
    
    # Verificar que Deno esté instalado
    if (-not (Get-Command deno -ErrorAction SilentlyContinue)) {
        Write-ColorText "❌ Error: Deno no está instalado o no está en el PATH" "Error"
        Write-ColorText "💡 Instala Deno desde: https://deno.land/#installation" "Warning"
        exit 1
    }
    
    # Verificar que el puerto esté libre
    if (Test-Port -PortNumber $Port) {
        Write-ColorText "⚠️  Advertencia: El puerto $Port está en uso" "Warning"
        Write-ColorText "💡 Intentando cerrar procesos anteriores..." "Info"
        
        try {
            Get-Process -Name "deno" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
        catch {
            # Ignorar errores al cerrar procesos
        }
        
        if (Test-Port -PortNumber $Port) {
            Write-ColorText "❌ Error: No se pudo liberar el puerto $Port" "Error"
            Write-ColorText "💡 Usa un puerto diferente con -Port" "Warning"
            exit 1
        }
    }
    
    # Verificar archivos necesarios
    $requiredFiles = @(
        "api/server-enhanced.ts",
        "public/index.html",
        "public/styles.css",
        "public/app.js"
    )
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            Write-ColorText "❌ Error: No se encontró el archivo $file" "Error"
            Write-ColorText "💡 Asegúrate de ejecutar este script desde el directorio raíz del proyecto" "Warning"
            exit 1
        }
    }
    
    Write-ColorText "✅ Todos los archivos necesarios están presentes" "Success"
    Write-ColorText ""
    
    # Iniciar servidor
    Write-ColorText "🚀 Iniciando servidor..." "Info"
    Write-ColorText ("=" * 60) "Header"
    
    try {
        # Abrir navegador si se solicita
        if ($OpenBrowser) {
            Write-ColorText "🌐 Abriendo navegador en 3 segundos..." "Info"
            Start-Job -ScriptBlock {
                Start-Sleep -Seconds 3
                Start-Process "http://localhost:$using:Port"
            } | Out-Null
        }
        
        # Mostrar información
        Write-ColorText ""
        Write-ColorText "🎉 ¡Servidor iniciado exitosamente!" "Success"
        Write-ColorText ""
        Write-ColorText "📱 Interfaz Web: http://localhost:$Port" "Info"
        Write-ColorText "📋 API Docs: http://localhost:$Port/api/info" "Info"
        Write-ColorText "❤️  Health Check: http://localhost:$Port/api/health" "Info"
        Write-ColorText ""
        Write-ColorText "✨ Funcionalidades disponibles:" "Header"
        Write-ColorText "   📤 Importación de archivos CSV" "Success"
        Write-ColorText "   🗂️  Gestión de tablas Oracle" "Success"
        Write-ColorText "   🔍 Consultas SQL interactivas" "Success"
        Write-ColorText "   ⚙️  Ejecución de procedimientos" "Success"
        Write-ColorText "   💾 Sistema de cache inteligente" "Success"
        Write-ColorText ""
        Write-ColorText "🛑 Presiona Ctrl+C para detener el servidor" "Warning"
        Write-ColorText ("=" * 60) "Header"
        Write-ColorText ""
        
        # Iniciar servidor Deno
        & deno run --allow-all api/server-enhanced.ts
        
    }
    catch {
        Write-ColorText "❌ Error iniciando servidor: $($_.Exception.Message)" "Error"
        exit 1
    }
}

# Verificar directorio de trabajo
if (-not (Test-Path "api/server-enhanced.ts")) {
    Write-ColorText "❌ Error: Ejecuta este script desde el directorio raíz del proyecto DNO-Oracle" "Error"
    Write-ColorText "💡 Asegúrate de estar en la carpeta que contiene la carpeta 'api'" "Warning"
    exit 1
}

# Ejecutar función principal
try {
    Main
}
catch {
    Write-ColorText "❌ Error inesperado: $($_.Exception.Message)" "Error"
    exit 1
}
finally {
    # Limpiar
    $ProgressPreference = "Continue"
}
