#!/bin/bash

# Script para configurar y probar la API con la tabla de logs
# Uso: ./setup-logs-demo.sh

set -e

API_URL="http://localhost:8000/api"
SQL_FILE="scripts/create-logs-table.sql"

echo "🚀 Configuración y prueba de la API DNO-Oracle con Logs"
echo "======================================================="
echo ""

# Función para verificar requisitos
check_requirements() {
    echo "🔍 Verificando requisitos..."
    
    # Verificar que existe el archivo .env
    if [ ! -f ".env" ]; then
        echo "❌ Archivo .env no encontrado"
        echo "   Copia .env.example a .env y configura tus variables de Oracle"
        exit 1
    fi
    
    # Verificar Deno
    if ! command -v deno &> /dev/null; then
        echo "❌ Deno no está instalado"
        echo "   Instala Deno desde: https://deno.land/"
        exit 1
    fi
    
    # Verificar Oracle Client (opcional, se detecta en tiempo de ejecución)
    echo "✅ Requisitos básicos verificados"
}

# Función para mostrar información del setup
show_setup_info() {
    echo "📋 Información del setup:"
    echo ""
    echo "📄 Script SQL: $SQL_FILE"
    echo "🌐 API URL: $API_URL"
    echo "📂 Directorio actual: $(pwd)"
    echo ""
    echo "📚 Archivos que se van a usar:"
    echo "   - scripts/create-logs-table.sql (crear tablas)"
    echo "   - api/server.ts (servidor API)"
    echo "   - examples/test-logs-api.js (pruebas)"
    echo ""
}

# Función para crear las tablas
setup_database() {
    echo "📊 Configuración de base de datos..."
    echo ""
    echo "⚠️  IMPORTANTE: Debes ejecutar manualmente el script SQL en tu base de datos:"
    echo ""
    echo "   sqlplus usuario/password@host:puerto/servicio @$SQL_FILE"
    echo ""
    echo "   O usando SQL Developer, DBeaver, etc."
    echo ""
    echo "📝 El script SQL incluye:"
    echo "   - Tabla SYSTEM_LOGS (para logs del sistema)"
    echo "   - Tabla USERS (para usuarios)"
    echo "   - Índices para optimización"
    echo "   - Datos de ejemplo"
    echo "   - Procedimientos almacenados"
    echo "   - Vista V_LOGS_WITH_USER"
    echo ""
    
    read -p "¿Has ejecutado el script SQL en tu base de datos? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Ejecuta primero el script SQL y luego vuelve a ejecutar este script"
        echo ""
        echo "💡 Comando de ejemplo:"
        echo "   sqlplus tu_usuario/tu_password@tu_host:1521/tu_servicio @$SQL_FILE"
        exit 1
    fi
    
    echo "✅ Base de datos configurada"
}

# Función para iniciar la API en background
start_api_server() {
    echo "🚀 Iniciando servidor API..."
    
    # Verificar si el puerto está en uso
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  El puerto 8000 ya está en uso"
        read -p "¿Quieres continuar con el servidor existente? (Y/n): " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            echo "❌ Detén el servidor en el puerto 8000 y vuelve a intentar"
            exit 1
        fi
        
        echo "✅ Usando servidor existente en puerto 8000"
        return
    fi
    
    # Iniciar servidor en background
    echo "🔄 Iniciando servidor Deno en puerto 8000..."
    deno run --allow-net --allow-read --allow-env --allow-ffi api/server.ts &
    SERVER_PID=$!
    
    echo "✅ Servidor iniciado (PID: $SERVER_PID)"
    echo "   URL: $API_URL"
    
    # Esperar a que el servidor esté listo
    echo "⏳ Esperando que el servidor esté listo..."
    sleep 3
    
    # Verificar que el servidor responde
    for i in {1..10}; do
        if curl -s "$API_URL/health" > /dev/null 2>&1; then
            echo "✅ Servidor listo y respondiendo"
            return
        fi
        echo "   Intento $i/10 - esperando..."
        sleep 2
    done
    
    echo "❌ El servidor no responde después de 20 segundos"
    echo "   Verifica los logs del servidor"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
}

# Función para ejecutar las pruebas
run_tests() {
    echo "🧪 Ejecutando pruebas de la API..."
    echo ""
    
    # Esperar un poco más para asegurar que el servidor esté completamente listo
    sleep 2
    
    # Ejecutar las pruebas
    deno run --allow-net examples/test-logs-api.js
    
    echo ""
    echo "✅ Pruebas completadas"
}

# Función para mostrar información final
show_final_info() {
    echo ""
    echo "🎉 ¡Setup completado exitosamente!"
    echo "=================================="
    echo ""
    echo "🌐 Tu API está corriendo en: $API_URL"
    echo ""
    echo "📋 Endpoints principales:"
    echo "   GET  $API_URL/health      - Estado de la API"
    echo "   GET  $API_URL/logs        - Obtener logs"
    echo "   POST $API_URL/logs        - Crear nuevo log"
    echo "   GET  $API_URL/logs/stats  - Estadísticas"
    echo "   GET  $API_URL/users       - Obtener usuarios"
    echo ""
    echo "🔧 Comandos útiles:"
    echo "   ./run.sh api              - Iniciar API"
    echo "   ./run.sh api:dev          - API en modo desarrollo"
    echo "   ./run.sh api:demo         - Demo completa de la API"
    echo ""
    echo "📚 Recursos:"
    echo "   - Documentación: docs/API.md"
    echo "   - Postman: docs/postman-collection.json"
    echo "   - Pruebas: examples/test-logs-api.js"
    echo ""
    echo "🛑 Para detener el servidor: kill $SERVER_PID"
    echo ""
}

# Función de limpieza
cleanup() {
    echo ""
    echo "🧹 Limpiando..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
        echo "✅ Servidor detenido"
    fi
}

# Configurar trap para limpieza
trap cleanup EXIT

# Función principal
main() {
    check_requirements
    show_setup_info
    setup_database
    start_api_server
    run_tests
    show_final_info
    
    echo "💡 El servidor sigue corriendo. Presiona Ctrl+C para detenerlo."
    
    # Mantener el script corriendo
    wait $SERVER_PID 2>/dev/null || true
}

# Verificar argumentos
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "🚀 Script de configuración y prueba de la API DNO-Oracle"
    echo ""
    echo "Uso: ./setup-logs-demo.sh"
    echo ""
    echo "Este script:"
    echo "  1. Verifica requisitos (Deno, .env)"
    echo "  2. Te guía para configurar la base de datos"
    echo "  3. Inicia el servidor API"
    echo "  4. Ejecuta pruebas automatizadas"
    echo "  5. Te muestra cómo usar la API"
    echo ""
    echo "Prerrequisitos:"
    echo "  - Deno instalado"
    echo "  - Archivo .env configurado"
    echo "  - Base de datos Oracle accesible"
    echo "  - Ejecutar scripts/create-logs-table.sql"
    exit 0
fi

# Ejecutar función principal
main
