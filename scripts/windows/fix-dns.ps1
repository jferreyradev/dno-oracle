# Script para resolver problemas DNS en Windows

Write-Host "=== Solución de Problemas DNS en Windows ===" -ForegroundColor Cyan

Write-Host "`n🔍 Verificando configuración de red actual..." -ForegroundColor Yellow

# Verificar configuración DNS actual
Write-Host "`n=== Configuración DNS Actual ===" -ForegroundColor Cyan
Get-DnsClientServerAddress | Where-Object { $_.ServerAddresses } | Format-Table InterfaceAlias, ServerAddresses

# Verificar conectividad básica
Write-Host "`n=== Verificando Conectividad ===" -ForegroundColor Cyan
$testHosts = @("8.8.8.8", "1.1.1.1", "google.com")
foreach ($host in $testHosts) {
    try {
        $result = Test-Connection -ComputerName $host -Count 1 -Quiet
        if ($result) {
            Write-Host "✅ Conectividad a $host: OK" -ForegroundColor Green
        } else {
            Write-Host "❌ Conectividad a $host: FALLO" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error probando $host" -ForegroundColor Red
    }
}

# Verificar cache DNS
Write-Host "`n=== Cache DNS ===" -ForegroundColor Cyan
try {
    $cacheEntries = Get-DnsClientCache | Measure-Object
    Write-Host "Entradas en cache DNS: $($cacheEntries.Count)" -ForegroundColor White
} catch {
    Write-Host "No se pudo acceder al cache DNS" -ForegroundColor Yellow
}

Write-Host "`n=== Soluciones Sugeridas ===" -ForegroundColor Cyan

Write-Host "1. Limpiar cache DNS:" -ForegroundColor White
Write-Host "   Clear-DnsClientCache" -ForegroundColor Gray
Write-Host "   ipconfig /flushdns" -ForegroundColor Gray

Write-Host "`n2. Configurar DNS públicos (ejecutar como Administrador):" -ForegroundColor White
Write-Host "   # Google DNS" -ForegroundColor Gray
Write-Host "   Set-DnsClientServerAddress -InterfaceAlias 'Ethernet' -ServerAddresses '8.8.8.8','8.8.4.4'" -ForegroundColor Gray
Write-Host "   # Cloudflare DNS" -ForegroundColor Gray
Write-Host "   Set-DnsClientServerAddress -InterfaceAlias 'Ethernet' -ServerAddresses '1.1.1.1','1.0.0.1'" -ForegroundColor Gray

Write-Host "`n3. Reiniciar servicios de red:" -ForegroundColor White
Write-Host "   Restart-Service Dnscache" -ForegroundColor Gray
Write-Host "   netsh winsock reset" -ForegroundColor Gray
Write-Host "   netsh int ip reset" -ForegroundColor Gray

Write-Host "`n4. Verificar firewall:" -ForegroundColor White
Write-Host "   Get-NetFirewallRule | Where-Object {`$_.DisplayName -like '*Oracle*'}" -ForegroundColor Gray

Write-Host "`n5. Para Oracle específicamente:" -ForegroundColor White
Write-Host "   - Verificar tnsnames.ora" -ForegroundColor Gray
Write-Host "   - Usar IP directa en lugar de hostname" -ForegroundColor Gray
Write-Host "   - Verificar puerto 1521 abierto" -ForegroundColor Gray

Write-Host "`n🛠️  ¿Quieres ejecutar alguna de estas soluciones? (Requiere permisos de Administrador)" -ForegroundColor Yellow
$choice = Read-Host "Selecciona: [1] Limpiar DNS [2] Configurar Google DNS [3] Reiniciar servicios [N] No hacer nada"

switch ($choice) {
    "1" {
        Write-Host "Limpiando cache DNS..." -ForegroundColor Yellow
        Clear-DnsClientCache
        ipconfig /flushdns
        Write-Host "✅ Cache DNS limpiado" -ForegroundColor Green
    }
    "2" {
        Write-Host "Configurando Google DNS..." -ForegroundColor Yellow
        try {
            $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
            foreach ($adapter in $adapters) {
                Set-DnsClientServerAddress -InterfaceAlias $adapter.Name -ServerAddresses "8.8.8.8","8.8.4.4"
                Write-Host "✅ DNS configurado para $($adapter.Name)" -ForegroundColor Green
            }
        } catch {
            Write-Host "❌ Error configurando DNS. Ejecuta como Administrador." -ForegroundColor Red
        }
    }
    "3" {
        Write-Host "Reiniciando servicios..." -ForegroundColor Yellow
        try {
            Restart-Service Dnscache -Force
            Write-Host "✅ Servicio DNS reiniciado" -ForegroundColor Green
        } catch {
            Write-Host "❌ Error reiniciando servicios. Ejecuta como Administrador." -ForegroundColor Red
        }
    }
    default {
        Write-Host "No se ejecutó ninguna acción." -ForegroundColor Gray
    }
}
