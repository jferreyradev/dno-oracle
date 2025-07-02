#!/bin/bash

# Makefile-style script para DNO-Oracle
# Uso: ./run.sh <comando>

set -e

# Configurar variables de entorno
export LD_LIBRARY_PATH=/home/jferreyradev/bin/instantclient_19_25:$LD_LIBRARY_PATH

case "$1" in
    "install")
        echo "🔧 Configurando proyecto DNO-Oracle..."
        echo "✅ Dependencias ya incluidas en deps.ts"
        echo "📝 Copia .env.example a .env y configura tus variables"
        echo "🚀 Ejecuta './run.sh test' para verificar la configuración"
        ;;
    
    "test")
        echo "🧪 Ejecutando prueba básica..."
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-connection.js
        ;;
    
    "test:advanced")
        echo "🔬 Ejecutando diagnóstico avanzado..."
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-connection-advanced.js
        ;;
    
    "test:final")
        echo "🎯 Ejecutando prueba completa..."
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-final.js
        ;;
    
    "example")
        echo "📚 Ejecutando ejemplos avanzados..."
        deno run --allow-net --allow-read --allow-env --allow-ffi examples/advanced-usage.js
        ;;
    
    "procedures")
        echo "🔧 Ejecutando ejemplos de procedimientos almacenados..."
        deno run --allow-net --allow-read --allow-env --allow-ffi examples/stored-procedures.js
        ;;
    
    "api-examples")
        echo "🌐 Ejecutando ejemplos de la API..."
        deno run --allow-net --allow-read --allow-env examples/api-usage.js
        ;;
    
    "compare")
        echo "⚖️  Comparando versiones original vs mejorada..."
        deno run --allow-net --allow-read --allow-env --allow-ffi tests/test-comparison.js
        ;;
    
    "diagnose")
        echo "🔍 Ejecutando diagnóstico de Oracle Client..."
        ./scripts/diagnose-oracle.sh
        ;;
    
    "fix-dns")
        echo "🌐 Ejecutando solución DNS..."
        ./scripts/fix-dns.sh
        ;;
    
    "dev")
        echo "👨‍💻 Modo desarrollo - observando cambios..."
        deno run --allow-net --allow-read --allow-env --allow-ffi --watch tests/test-connection.js
        ;;
    
    "api")
        echo "🚀 Iniciando servidor API..."
        deno run --allow-net --allow-read --allow-env --allow-ffi api/server.ts
        ;;
    
    "api:dev")
        echo "🚀 Iniciando servidor API en modo desarrollo..."
        deno run --allow-net --allow-read --allow-env --allow-ffi --watch api/server.ts
        ;;
    
    "api:demo")
        echo "🎬 Ejecutando demostración de la API..."
        ./scripts/demo-api.sh
        ;;
    
    "logs:demo")
        echo "📊 Configurando y probando API con logs..."
        ./scripts/setup-logs-demo.sh
        ;;
    
    "logs:test")
        echo "🧪 Probando endpoints de logs..."
        deno run --allow-net examples/test-logs-api.js
        ;;
    
    "sql")
        if [ -z "$2" ]; then
            echo "❌ Uso: ./run.sh sql <archivo.sql>"
            echo "Ejemplo: ./run.sh sql scripts/create-logs-table.sql"
            exit 1
        fi
        echo "📊 Ejecutando archivo SQL: $2"
        deno run --allow-net --allow-read --allow-env --allow-ffi scripts/sql-executor.js "$2"
        ;;
    
    "setup-logs")
        echo "📊 Configurando tablas de logs usando la librería DNO-Oracle..."
        deno run --allow-net --allow-read --allow-env --allow-ffi scripts/sql-executor.js scripts/create-logs-table.sql
        ;;
    
    "demo-complete")
        echo "🎬 Demo completo automatizado (DB + API + Tests)..."
        ./scripts/demo-complete.sh
        ;;
    
    "lint")
        echo "🧹 Ejecutando linter..."
        deno lint
        ;;
    
    "fmt")
        echo "💅 Formateando código..."
        deno fmt
        ;;
    
    "clean")
        echo "🧽 Limpiando archivos temporales..."
        rm -rf .deno/ deno_modules/ *.log
        echo "✅ Limpieza completada"
        ;;
    
    "docs")
        echo "📖 Abriendo documentación..."
        if command -v xdg-open &> /dev/null; then
            xdg-open README.md
        elif command -v open &> /dev/null; then
            open README.md
        else
            echo "📋 Ver README.md para documentación completa"
        fi
        ;;
    
    "info")
        echo "ℹ️  Información del proyecto:"
        echo "   Nombre: DNO-Oracle"
        echo "   Versión: 1.0.0"
        echo "   Descripción: Oracle Database connection module for Deno"
        echo ""
        echo "📁 Estructura:"
        tree -L 2 2>/dev/null || ls -la
        ;;
    
    "env")
        echo "🔧 Variables de entorno actuales:"
        echo "   LD_LIBRARY_PATH: $LD_LIBRARY_PATH"
        echo "   USER: $(cat .env 2>/dev/null | grep "^USER=" | cut -d'=' -f2 || echo 'No configurado')"
        echo "   CONNECTIONSTRING: $(cat .env 2>/dev/null | grep "^CONNECTIONSTRING=" | cut -d'=' -f2 || echo 'No configurado')"
        echo "   LIB_ORA: $(cat .env 2>/dev/null | grep "^LIB_ORA=" | cut -d'=' -f2 || echo 'No configurado')"
        ;;
    
    "check")
        echo "✅ Verificando configuración completa..."
        echo ""
        
        # Verificar Deno
        if command -v deno &> /dev/null; then
            echo "✅ Deno instalado: $(deno --version | head -n1)"
        else
            echo "❌ Deno no encontrado"
        fi
        
        # Verificar archivo .env
        if [ -f ".env" ]; then
            echo "✅ Archivo .env encontrado"
        else
            echo "❌ Archivo .env no encontrado"
            echo "   Ejecuta: cp .env.example .env"
        fi
        
        # Verificar Oracle Client
        if [ -d "$(cat .env 2>/dev/null | grep "^LIB_ORA=" | cut -d'=' -f2)" ]; then
            echo "✅ Oracle Instant Client encontrado"
        else
            echo "⚠️  Oracle Instant Client no verificado"
        fi
        
        # Verificar estructura de proyecto
        echo ""
        echo "📁 Estructura del proyecto:"
        for dir in src tests scripts docs examples; do
            if [ -d "$dir" ]; then
                echo "   ✅ $dir/"
            else
                echo "   ❌ $dir/"
            fi
        done
        ;;
    
    "help"|*)
        echo "🚀 DNO-Oracle - Comandos disponibles:"
        echo ""
        echo "📦 Configuración:"
        echo "   install     - Configurar proyecto inicial"
        echo "   check       - Verificar configuración"
        echo "   env         - Ver variables de entorno"
        echo ""
        echo "🧪 Testing:"
        echo "   test        - Prueba básica de conexión"
        echo "   test:advanced - Diagnóstico completo"
        echo "   test:final  - Prueba final con ejemplos"
        echo "   example     - Ejecutar ejemplos avanzados"
        echo "   procedures  - Ejemplos de procedimientos almacenados"
        echo "   api-examples - Ejemplos de uso de la API"
        echo "   compare     - Comparar versión original vs mejorada"
        echo ""
        echo "🔧 Herramientas:"
        echo "   diagnose    - Diagnóstico Oracle Client"
        echo "   fix-dns     - Solución problemas DNS"
        echo "   dev         - Modo desarrollo con watch"
        echo ""
        echo "🌐 API:"
        echo "   api         - Iniciar servidor API"
        echo "   api:dev     - Servidor API en modo desarrollo"
        echo "   api:demo    - Demostración completa de la API"
        echo "   logs:demo   - Demo completo con tabla de logs"
        echo "   logs:test   - Probar endpoints de logs"
        echo "   demo-complete - Demo automático completo (todo en uno)"
        echo ""
        echo "📊 Base de Datos:"
        echo "   sql <archivo> - Ejecutar archivo SQL usando DNO-Oracle"
        echo "   setup-logs  - Crear tablas de logs automáticamente"
        echo ""
        echo "🧹 Mantenimiento:"
        echo "   lint        - Ejecutar linter"
        echo "   fmt         - Formatear código"
        echo "   clean       - Limpiar archivos temporales"
        echo ""
        echo "📚 Documentación:"
        echo "   docs        - Abrir documentación"
        echo "   info        - Información del proyecto"
        echo "   help        - Ver esta ayuda"
        echo ""
        echo "Ejemplo: ./run.sh test"
        ;;
esac
