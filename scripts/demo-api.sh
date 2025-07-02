#!/bin/bash

# Script de demostración completa de la API DNO-Oracle
# Uso: ./demo-api.sh

set -e

API_URL="http://localhost:8000/api"
echo "🚀 Demostración de la API DNO-Oracle"
echo "===================================="
echo ""

# Función para hacer peticiones con formato
make_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo "📡 $description"
    echo "   $method $endpoint"
    
    if [ -n "$data" ]; then
        echo "   Datos: $data"
        response=$(curl -s -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X $method "$API_URL$endpoint")
    fi
    
    echo "   Respuesta:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
    sleep 1
}

# Verificar que la API esté ejecutándose
echo "🔍 Verificando que la API esté disponible..."
if ! curl -s "$API_URL/health" > /dev/null; then
    echo "❌ La API no está disponible en $API_URL"
    echo "   Ejecuta: ./run.sh api"
    exit 1
fi
echo "✅ API disponible"
echo ""

# 1. Estado de la API
make_request "GET" "/health" "" "Verificar estado de la API"

# 2. Información general
make_request "GET" "/" "" "Obtener información general"

# 3. Listar tablas disponibles
make_request "GET" "/tables" "" "Listar tablas disponibles"

# 4. Obtener esquema de tabla (ejemplo con una tabla del sistema)
make_request "GET" "/schema?table=USER_TABLES" "" "Obtener esquema de USER_TABLES"

# 5. Ejecutar consulta simple
QUERY_DATA='{"sql": "SELECT table_name, num_rows FROM user_tables WHERE rownum <= 3", "binds": []}'
make_request "POST" "/execute" "$QUERY_DATA" "Ejecutar consulta SQL simple"

# 6. Intentar obtener usuarios (puede fallar si la tabla no existe)
make_request "GET" "/users?page=1&limit=5" "" "Obtener usuarios (si la tabla existe)"

# 7. Ejecutar procedimiento de ejemplo
PROC_DATA='{"procedure": "DBMS_OUTPUT.PUT_LINE", "binds": {"line": "Hola desde el demo!"}, "type": "procedure"}'
make_request "POST" "/procedure" "$PROC_DATA" "Ejecutar procedimiento almacenado"

# 8. Ejecutar transacción de ejemplo
TRANS_DATA='{"queries": [{"sql": "SELECT COUNT(*) as total_tables FROM user_tables", "binds": []}, {"sql": "SELECT COUNT(*) as total_views FROM user_views", "binds": []}]}'
make_request "POST" "/transaction" "$TRANS_DATA" "Ejecutar transacción con múltiples consultas"

# 9. Intentar crear usuario (puede fallar si la tabla no existe)
USER_DATA='{"username": "demo_user", "email": "demo@example.com", "fullName": "Usuario Demo", "isActive": true}'
echo "📡 Intentar crear usuario demo"
echo "   POST /users"
echo "   Datos: $USER_DATA"
response=$(curl -s -X POST "$API_URL/users" \
    -H "Content-Type: application/json" \
    -d "$USER_DATA")
echo "   Respuesta:"
echo "$response" | jq '.' 2>/dev/null || echo "$response"
echo ""

echo "✅ Demostración completada!"
echo ""
echo "📚 Recursos adicionales:"
echo "   - Documentación: docs/API.md"
echo "   - Postman Collection: docs/postman-collection.json"
echo "   - Ejemplos interactivos: deno run --allow-net examples/api-usage.js"
echo "   - Script de tabla de usuarios: scripts/create-users-table.sql"
