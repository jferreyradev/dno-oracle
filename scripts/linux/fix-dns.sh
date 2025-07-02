#!/bin/bash

echo "=== Solucionando problema de resolución DNS ==="

HOSTNAME="DESKTOP-QVNJL5C"

echo "1. Verificando resolución DNS actual:"
nslookup $HOSTNAME 2>/dev/null || echo "❌ No se puede resolver $HOSTNAME"

echo -e "\n2. Buscando la IP en la red local..."
echo "Escaneando red 192.168.1.x..."
for i in {1..254}; do
    IP="192.168.1.$i"
    # Verificar si responde ping y si el puerto 1521 está abierto
    if ping -c 1 -W 1 $IP &>/dev/null; then
        echo "Host activo encontrado: $IP"
        # Verificar si el puerto 1521 está abierto
        if timeout 2 bash -c "echo >/dev/tcp/$IP/1521" 2>/dev/null; then
            echo "  ✅ Puerto 1521 abierto en $IP"
            # Intentar obtener el hostname
            REVERSE=$(nslookup $IP 2>/dev/null | grep "name =" | cut -d" " -f4 | sed 's/\.$//')
            if [ ! -z "$REVERSE" ]; then
                echo "  Hostname: $REVERSE"
            fi
        fi
    fi
done

echo -e "\n3. Verificando tabla ARP para dispositivos conocidos:"
arp -a | grep -i desktop || echo "No se encontró dispositivo con 'desktop' en ARP"

echo -e "\n4. Instrucciones para resolver el problema:"
echo "Opción 1 - Agregar entrada al archivo hosts:"
echo "  sudo nano /etc/hosts"
echo "  Agregar línea: IP_DEL_SERVIDOR    DESKTOP-QVNJL5C"
echo ""
echo "Opción 2 - Cambiar el .env para usar IP directamente:"
echo "  CONNECTIONSTRING=IP_DEL_SERVIDOR:1521/desa"
echo ""
echo "Opción 3 - Si es una máquina Windows con WSL:"
echo "  CONNECTIONSTRING=host.docker.internal:1521/desa"
echo "  o usar la IP de Windows desde WSL"
