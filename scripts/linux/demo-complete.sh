#!/bin/bash

# Script simplificado para demo completo con el nuevo ejecutor SQL
# Uso: ./demo-complete.sh

set -e

echo "🚀 Demo Completo DNO-Oracle API con Sistema de Logs"
echo "=================================================="
echo ""

# Función para verificar requisitos
check_requirements() {
    echo "🔍 Verificando requisitos..."
    
    if [ ! -f ".env" ]; then
        echo "❌ Archivo .env no encontrado"
        echo "   Copia .env.example a .env y configura tus variables de Oracle"
        exit 1
    fi
    
    if ! command -v deno &> /dev/null; then
        echo "❌ Deno no está instalado"
        exit 1
    fi
    
    echo "✅ Requisitos verificados"
}

# Configurar base de datos
setup_database() {
    echo ""
    echo "📊 PASO 1: Configurando base de datos..."
    echo "======================================="
    
    echo "🔄 Ejecutando script SQL usando DNO-Oracle..."
    ./run.sh setup-logs
    
    if [ $? -eq 0 ]; then
        echo "✅ Base de datos configurada exitosamente"
    else
        echo "❌ Error configurando base de datos"
        echo "   Verifica tu configuración .env y conectividad Oracle"
        exit 1
    fi
}

# Iniciar API
start_api() {
    echo ""
    echo "🚀 PASO 2: Iniciando servidor API..."
    echo "===================================="
    
    # Verificar si el puerto está en uso
    if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Puerto 8000 ya está en uso"
        read -p "¿Usar servidor existente? (Y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Nn]$ ]]; then
            echo "❌ Detén el servidor en puerto 8000 y vuelve a intentar"
            exit 1
        fi
        echo "✅ Usando servidor existente"
        return
    fi
    
    echo "🔄 Iniciando servidor API en background..."
    ./run.sh api &
    SERVER_PID=$!
    
    echo "⏳ Esperando que el servidor esté listo..."
    sleep 5
    
    # Verificar que responde
    for i in {1..6}; do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            echo "✅ Servidor API listo en http://localhost:8000"
            return
        fi
        echo "   Intento $i/6..."
        sleep 2
    done
    
    echo "❌ Servidor no responde después de 12 segundos"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
}

# Ejecutar pruebas
run_tests() {
    echo ""
    echo "🧪 PASO 3: Ejecutando pruebas de la API..."
    echo "=========================================="
    
    sleep 2
    ./run.sh logs:test
    
    if [ $? -eq 0 ]; then
        echo "✅ Todas las pruebas completadas exitosamente"
    else
        echo "⚠️  Algunas pruebas fallaron, pero el servidor sigue funcionando"
    fi
}

# Mostrar información final
show_final_info() {
    echo ""
    echo "🎉 ¡Demo Completado Exitosamente!"
    echo "================================="
    echo ""
    echo "🌐 Tu API está corriendo en: http://localhost:8000"
    echo ""
    echo "📋 Endpoints principales:"
    echo "   GET  /api/health      - Estado de la API"
    echo "   GET  /api/logs        - Obtener logs"
    echo "   POST /api/logs        - Crear nuevo log"
    echo "   GET  /api/logs/stats  - Estadísticas"
    echo "   GET  /api/users       - Obtener usuarios"
    echo ""
    echo "🔧 Pruebas rápidas:"
    echo "   curl http://localhost:8000/api/health"
    echo "   curl http://localhost:8000/api/logs?limit=5"
    echo "   curl http://localhost:8000/api/users"
    echo ""
    echo "📚 Recursos:"
    echo "   - Postman: docs/postman-collection.json"
    echo "   - Documentación: docs/API.md"
    echo "   - Más pruebas: ./run.sh logs:test"
    echo ""
    
    if [ ! -z "$SERVER_PID" ]; then
        echo "🛑 Para detener el servidor: kill $SERVER_PID"
        echo "💡 El servidor sigue corriendo. Presiona Ctrl+C para detenerlo."
        echo ""
        
        # Mantener el script corriendo
        wait $SERVER_PID 2>/dev/null || true
    fi
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

# Mostrar ayuda si se solicita
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "🚀 Demo Completo DNO-Oracle API"
    echo ""
    echo "Este script:"
    echo "  1. Configura automáticamente las tablas Oracle"
    echo "  2. Inicia el servidor API"
    echo "  3. Ejecuta pruebas completas"
    echo "  4. Te muestra cómo usar la API"
    echo ""
    echo "Uso: ./demo-complete.sh"
    echo ""
    echo "Prerrequisitos:"
    echo "  - Archivo .env configurado con conexión Oracle"
    echo "  - Deno instalado"
    echo "  - Oracle Database accesible"
    exit 0
fi

# Ejecutar demo completo
main() {
    check_requirements
    setup_database
    start_api
    run_tests
    show_final_info
}

main
