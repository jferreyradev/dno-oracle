#!/bin/bash

echo "=== Diagnóstico de Oracle Instant Client ==="

# Verificar si el directorio existe
LIB_DIR="/home/jferreyradev/bin/instantclient_19_25"
if [ -d "$LIB_DIR" ]; then
    echo "✅ Directorio encontrado: $LIB_DIR"
    echo "Contenido del directorio:"
    ls -la "$LIB_DIR"
else
    echo "❌ Directorio no encontrado: $LIB_DIR"
fi

echo -e "\n=== Verificando LD_LIBRARY_PATH ==="
echo "LD_LIBRARY_PATH actual: $LD_LIBRARY_PATH"

echo -e "\n=== Verificando ldconfig ==="
ldconfig -p | grep oracle || echo "No se encontraron librerías Oracle en ldconfig"

echo -e "\n=== Verificando librerías específicas ==="
find /usr/lib* -name "*oci*" 2>/dev/null | head -10
find /opt -name "*oci*" 2>/dev/null | head -10
find "$LIB_DIR" -name "libnnz*" 2>/dev/null | head -10

echo -e "\n=== Verificando arquitectura del sistema ==="
uname -m
file /bin/bash

echo -e "\n=== Sugerencias ==="
echo "1. Verificar que Oracle Instant Client esté instalado correctamente"
echo "2. Agregar la ruta al LD_LIBRARY_PATH:"
echo "   export LD_LIBRARY_PATH=$LIB_DIR:\$LD_LIBRARY_PATH"
echo "3. O configurar ldconfig:"
echo "   sudo echo '$LIB_DIR' > /etc/ld.so.conf.d/oracle.conf"
echo "   sudo ldconfig"
