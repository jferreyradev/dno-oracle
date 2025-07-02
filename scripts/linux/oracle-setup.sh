#!/bin/bash

# Script para configurar el entorno Oracle y ejecutar pruebas
export LD_LIBRARY_PATH=/home/jferreyradev/bin/instantclient_19_25:$LD_LIBRARY_PATH

echo "=== Configuración del Entorno Oracle ==="
echo "LD_LIBRARY_PATH configurado: $LD_LIBRARY_PATH"

case "$1" in
    "test")
        echo "Ejecutando prueba básica de conexión..."
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-connection.js
        ;;
    "test-advanced")
        echo "Ejecutando diagnóstico avanzado..."
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-connection-advanced.js
        ;;
    "test-final")
        echo "Ejecutando prueba final completa..."
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-final.js
        ;;
    "diagnose")
        echo "Ejecutando diagnóstico de Oracle Client..."
        ./scripts/diagnose-oracle.sh
        ;;
    "fix-dns")
        echo "Ejecutando solución DNS..."
        ./scripts/fix-dns.sh
        ;;
    *)
        echo "Uso: ./scripts/oracle-setup.sh {test|test-advanced|test-final|diagnose|fix-dns}"
        echo ""
        echo "Comandos disponibles:"
        echo "  test         - Prueba básica de conexión"
        echo "  test-advanced - Diagnóstico completo de conexión"
        echo "  test-final   - Prueba final con ejemplos de consultas"
        echo "  diagnose     - Diagnóstico de Oracle Client"
        echo "  fix-dns      - Ayuda para resolver problemas DNS"
        ;;
esac
