# Script de diagnóstico de Oracle Instant Client para Windows

Write-Host "=== Diagnóstico de Oracle Instant Client ===" -ForegroundColor Cyan

# Verificar si el directorio de Oracle existe
$ORACLE_HOME = "C:\oracle\instantclient_19_25"
if (Test-Path $ORACLE_HOME) {
    Write-Host "✅ Directorio encontrado: $ORACLE_HOME" -ForegroundColor Green
    Write-Host "Contenido del directorio:" -ForegroundColor White
    Get-ChildItem $ORACLE_HOME | Format-Table Name, Length, LastWriteTime
} else {
    Write-Host "❌ Directorio no encontrado: $ORACLE_HOME" -ForegroundColor Red
    Write-Host "Buscando Oracle Instant Client en ubicaciones comunes..." -ForegroundColor Yellow
    
    $commonPaths = @(
        "C:\oracle\*",
        "C:\app\*\product\*",
        "C:\Program Files\Oracle\*"
    )
    
    foreach ($path in $commonPaths) {
        if (Get-ChildItem $path -ErrorAction SilentlyContinue) {
            Write-Host "Encontrado Oracle en: $path" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n=== Verificando PATH ===" -ForegroundColor Cyan
$pathEntries = $env:PATH -split ";"
$oracleInPath = $pathEntries | Where-Object { $_ -like "*oracle*" -or $_ -like "*instantclient*" }
if ($oracleInPath) {
    Write-Host "PATH contiene Oracle:" -ForegroundColor Green
    $oracleInPath | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "PATH no contiene rutas de Oracle" -ForegroundColor Yellow
}

Write-Host "`n=== Verificando librerías específicas ===" -ForegroundColor Cyan
$oracleLibs = @("oci.dll", "oraociei*.dll", "ociw32.dll")
foreach ($lib in $oracleLibs) {
    $found = Get-ChildItem -Path $ORACLE_HOME -Filter $lib -ErrorAction SilentlyContinue
    if ($found) {
        Write-Host "✅ Encontrado: $($found.Name)" -ForegroundColor Green
    } else {
        Write-Host "❌ No encontrado: $lib" -ForegroundColor Red
    }
}

Write-Host "`n=== Verificando arquitectura del sistema ===" -ForegroundColor Cyan
$arch = (Get-WmiObject Win32_Processor).Architecture
switch ($arch) {
    0 { $archName = "x86" }
    5 { $archName = "ARM" }
    6 { $archName = "ia64" }
    9 { $archName = "x64" }
    default { $archName = "Desconocida ($arch)" }
}
Write-Host "Arquitectura: $archName" -ForegroundColor White

Write-Host "`n=== Verificando versión de Windows ===" -ForegroundColor Cyan
$osInfo = Get-WmiObject Win32_OperatingSystem
Write-Host "OS: $($osInfo.Caption)" -ForegroundColor White
Write-Host "Versión: $($osInfo.Version)" -ForegroundColor White

Write-Host "`n=== Verificando Deno ===" -ForegroundColor Cyan
try {
    $denoVersion = deno --version
    Write-Host "✅ Deno instalado:" -ForegroundColor Green
    Write-Host $denoVersion -ForegroundColor Gray
} catch {
    Write-Host "❌ Deno no encontrado" -ForegroundColor Red
}

Write-Host "`n=== Sugerencias ===" -ForegroundColor Cyan
Write-Host "1. Verificar que Oracle Instant Client esté instalado correctamente" -ForegroundColor White
Write-Host "2. Agregar la ruta al PATH del sistema:" -ForegroundColor White
Write-Host "   [Environment]::SetEnvironmentVariable('PATH', `"$ORACLE_HOME;`$env:PATH`", 'User')" -ForegroundColor Gray
Write-Host "3. Descargar Oracle Instant Client desde:" -ForegroundColor White
Write-Host "   https://www.oracle.com/database/technologies/instant-client/downloads.html" -ForegroundColor Gray
Write-Host "4. Asegurarse de que coincida la arquitectura (32-bit vs 64-bit)" -ForegroundColor White
