# Script para iniciar la interfaz web de DNO-Oracle
# Versión mejorada con verificaciones y mejores mensajes

param(
    [int]$Puerto = 8000,
    [switch]$Ayuda
)

if ($Ayuda) {
    Write-Host "🚀 DNO-Oracle Web Interface Launcher" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\start-web-interface.ps1              # Iniciar en puerto 8000"
    Write-Host "  .\start-web-interface.ps1 -Puerto 3000 # Iniciar en puerto 3000"
    Write-Host "  .\start-web-interface.ps1 -Ayuda       # Mostrar esta ayuda"
    Write-Host ""
    Write-Host "Funcionalidades de la interfaz web:" -ForegroundColor Green
    Write-Host "  • 📁 Importación de archivos CSV con drag & drop"
    Write-Host "  • 🗄️ Gestión visual de tablas y datos"
    Write-Host "  • 💻 Editor SQL integrado con validación"
    Write-Host "  • 🔧 Ejecución de procedimientos almacenados"
    Write-Host "  • 📊 Visualización de datos en tiempo real"
    Write-Host ""
    exit 0
}

Write-Host "🚀 Iniciando DNO-Oracle Web Interface..." -ForegroundColor Cyan
Write-Host ""

# Verificar si Deno está instalado
try {
    $denoVersion = deno --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Deno detectado" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Deno no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "   Instala Deno desde: https://deno.land/manual/getting_started/installation" -ForegroundColor Yellow
    exit 1
}

# Verificar archivos de configuración
if (-not (Test-Path ".env")) {
    Write-Host "⚠️  Archivo .env no encontrado" -ForegroundColor Yellow
    Write-Host "   Copia .env.example a .env y configura tus datos de Oracle" -ForegroundColor Yellow
}

if (-not (Test-Path "config/entities.json")) {
    Write-Host "⚠️  Archivo config/entities.json no encontrado" -ForegroundColor Yellow
    Write-Host "   Se usará la configuración por defecto" -ForegroundColor Yellow
}

# Terminar procesos Deno existentes
$denoProcesses = Get-Process -Name "deno" -ErrorAction SilentlyContinue
if ($denoProcesses) {
    Write-Host "🔄 Terminando procesos Deno existentes..." -ForegroundColor Yellow
    $denoProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "🔧 Configuración:" -ForegroundColor Cyan
Write-Host "   Puerto: $Puerto"
Write-Host "   URL: http://localhost:$Puerto"
Write-Host ""

# Iniciar el servidor
Write-Host "🚀 Iniciando servidor..." -ForegroundColor Green
Write-Host ""

try {
    # Configurar puerto si no es el por defecto
    if ($Puerto -ne 8000) {
        $env:PORT = $Puerto
    }
    
    # Iniciar servidor en background
    $serverProcess = Start-Process -FilePath "deno" -ArgumentList "run", "--allow-all", "api/server-enhanced.ts" -NoNewWindow -PassThru -RedirectStandardOutput "server.log" -RedirectStandardError "server-error.log"
    
    # Esperar a que el servidor se inicie
    Write-Host "⏳ Esperando a que el servidor se inicie..." -ForegroundColor Yellow
    Start-Sleep -Seconds 4
    
    # Verificar si el servidor está respondiendo
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Puerto/api/health" -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Servidor iniciado correctamente!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🌐 Interfaz Web disponible en:" -ForegroundColor Cyan
            Write-Host "   http://localhost:$Puerto" -ForegroundColor White -BackgroundColor DarkBlue
            Write-Host ""
            Write-Host "📋 Endpoints disponibles:" -ForegroundColor Cyan
            Write-Host "   • Health Check:  http://localhost:$Puerto/api/health"
            Write-Host "   • Documentación: http://localhost:$Puerto/api/info"
            Write-Host "   • API Entities:  http://localhost:$Puerto/api/{entidad}"
            Write-Host ""
            Write-Host "🎯 Funcionalidades:" -ForegroundColor Green
            Write-Host "   📁 Importación CSV con drag & drop"
            Write-Host "   🗄️ Gestión visual de tablas"
            Write-Host "   💻 Editor SQL integrado"
            Write-Host "   🔧 Ejecución de procedimientos"
            Write-Host "   📊 Visualización de datos"
            Write-Host ""
            Write-Host "🛑 Para detener: Ctrl+C en esta ventana o cierra PowerShell" -ForegroundColor Yellow
            Write-Host ""
            
            # Intentar abrir navegador
            try {
                Start-Process "http://localhost:$Puerto"
                Write-Host "🌐 Abriendo navegador..." -ForegroundColor Green
            } catch {
                Write-Host "💡 Abre manualmente: http://localhost:$Puerto" -ForegroundColor Yellow
            }
            
            # Mantener el script corriendo
            Write-Host "📊 Logs del servidor:" -ForegroundColor Cyan
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
            
            # Mostrar logs en tiempo real
            if (Test-Path "server.log") {
                Get-Content "server.log" -Wait
            } else {
                # Fallback: mantener el proceso activo
                Wait-Process -Id $serverProcess.Id
            }
            
        } else {
            throw "Servidor no responde correctamente"
        }
    } catch {
        Write-Host "❌ Error: El servidor no pudo iniciarse correctamente" -ForegroundColor Red
        Write-Host "   Revisa los logs para más detalles:" -ForegroundColor Yellow
        
        if (Test-Path "server-error.log") {
            Write-Host "   Error log:" -ForegroundColor Red
            Get-Content "server-error.log" | Select-Object -Last 10
        }
        
        exit 1
    }
    
} catch {
    Write-Host "❌ Error iniciando el servidor: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Limpiar archivos de log temporales
    if (Test-Path "server.log") { Remove-Item "server.log" -Force -ErrorAction SilentlyContinue }
    if (Test-Path "server-error.log") { Remove-Item "server-error.log" -Force -ErrorAction SilentlyContinue }
}
