#!/bin/bash

# Generador de configuración de entidades Oracle para DNO-Oracle
# Este script genera automáticamente la configuración JSON necesaria para el archivo entities.json

# Colores para la salida
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Variables
TABLA=""
ENTIDAD=""
ARCHIVO=""
AGREGAR=false
AYUDA=false

# Función para mostrar el header
show_header() {
    echo ""
    echo -e "${MAGENTA}🔧 Generador de Configuración de Entidades Oracle${NC}"
    echo -e "${MAGENTA}============================================================${NC}"
}

# Función para mostrar la ayuda
show_help() {
    show_header
    echo ""
    echo -e "${CYAN}📖 USO:${NC}"
    echo -e "${WHITE}  ./generate-entity.sh -t <NOMBRE_TABLA> [-e <NOMBRE_ENTIDAD>] [-f <ARCHIVO>] [-a]${NC}"
    echo ""
    echo -e "${CYAN}📋 PARÁMETROS:${NC}"
    echo -e "${WHITE}  -t, --tabla      Nombre de la tabla Oracle (requerido)${NC}"
    echo -e "${WHITE}  -e, --entidad    Nombre de la entidad en el JSON (opcional)${NC}"
    echo -e "${WHITE}  -f, --archivo    Archivo de salida (opcional)${NC}"
    echo -e "${WHITE}  -a, --agregar    Agregar automáticamente a entities.json${NC}"
    echo -e "${WHITE}  -h, --ayuda      Mostrar esta ayuda${NC}"
    echo ""
    echo -e "${CYAN}💡 EJEMPLOS:${NC}"
    echo -e "${YELLOW}  ./generate-entity.sh -t 'USUARIOS'${NC}"
    echo -e "${YELLOW}  ./generate-entity.sh -t 'WORKFLOW.PROC_CAB' -e 'proc_cab'${NC}"
    echo -e "${YELLOW}  ./generate-entity.sh -t 'SYSTEM_LOGS' -f 'logs-config.json'${NC}"
    echo -e "${YELLOW}  ./generate-entity.sh -t 'USUARIOS' -a${NC}"
    echo ""
    echo -e "${CYAN}🔗 REPOSITORIO:${NC}"
    echo -e "${WHITE}  https://github.com/tu-usuario/dno-oracle${NC}"
    echo ""
}

# Función para verificar prerequisitos
test_prerequisites() {
    local success=true
    
    # Verificar que Deno está instalado
    if ! command -v deno &> /dev/null; then
        echo -e "${RED}❌ Deno no está instalado o no está en el PATH${NC}"
        echo -e "${YELLOW}   Instala Deno desde: https://deno.land/manual/getting_started/installation${NC}"
        success=false
    else
        echo -e "${GREEN}✅ Deno encontrado${NC}"
    fi
    
    # Verificar que existe el archivo .env
    if [ ! -f ".env" ]; then
        echo -e "${RED}❌ Archivo .env no encontrado${NC}"
        echo -e "${YELLOW}   Crea un archivo .env con la configuración de Oracle${NC}"
        success=false
    else
        echo -e "${GREEN}✅ Archivo .env encontrado${NC}"
    fi
    
    # Verificar que existe el script generador
    if [ ! -f "scripts/generate-entity-config.ts" ]; then
        echo -e "${RED}❌ Script generador no encontrado${NC}"
        echo -e "${YELLOW}   Verifica que el archivo scripts/generate-entity-config.ts existe${NC}"
        success=false
    else
        echo -e "${GREEN}✅ Script generador encontrado${NC}"
    fi
    
    if [ "$success" = true ]; then
        return 0
    else
        return 1
    fi
}

# Función para ejecutar el generador
invoke_entity_generator() {
    local table_name="$1"
    local entity_name="$2"
    
    local arguments=("run" "--allow-all" "scripts/generate-entity-config.ts" "$table_name")
    
    if [ -n "$entity_name" ]; then
        arguments+=("$entity_name")
    fi
    
    echo -e "${CYAN}🔄 Ejecutando generador...${NC}"
    echo -e "${GRAY}   Comando: deno ${arguments[*]}${NC}"
    echo ""
    
    if result=$(deno "${arguments[@]}" 2>&1); then
        echo -e "${GREEN}✅ Generación completada exitosamente${NC}"
        echo "$result"
        return 0
    else
        echo -e "${RED}❌ Error durante la generación${NC}"
        echo -e "${RED}$result${NC}"
        return 1
    fi
}

# Función para guardar la configuración
save_configuration() {
    local configuration="$1"
    local output_file="$2"
    
    if echo "$configuration" > "$output_file"; then
        echo -e "${GREEN}💾 Configuración guardada en: $output_file${NC}"
    else
        echo -e "${RED}❌ Error guardando archivo: $output_file${NC}"
    fi
}

# Función para agregar al archivo entities.json
add_to_entities_file() {
    local configuration="$1"
    local entity_name="$2"
    local entities_file="config/entities.json"
    
    if [ ! -f "$entities_file" ]; then
        echo -e "${RED}❌ Archivo $entities_file no encontrado${NC}"
        return 1
    fi
    
    # Crear un backup
    cp "$entities_file" "${entities_file}.backup"
    
    # Usar jq para agregar la nueva entidad
    if command -v jq &> /dev/null; then
        if echo "$configuration" | jq -r '.' > /dev/null 2>&1; then
            local new_entity_key=$(echo "$configuration" | jq -r 'keys[0]')
            local new_entity_value=$(echo "$configuration" | jq -r ".$new_entity_key")
            
            if jq ".entities.\"$new_entity_key\" = $new_entity_value" "$entities_file" > "${entities_file}.tmp" && mv "${entities_file}.tmp" "$entities_file"; then
                echo -e "${GREEN}✅ Entidad agregada a $entities_file${NC}"
                echo -e "${YELLOW}🔄 Reinicia el servidor para aplicar los cambios${NC}"
            else
                echo -e "${RED}❌ Error agregando entidad${NC}"
                mv "${entities_file}.backup" "$entities_file"
            fi
        else
            echo -e "${RED}❌ Configuración JSON inválida${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  jq no está instalado, no se puede agregar automáticamente${NC}"
        echo -e "${YELLOW}   Copia manualmente la configuración al archivo $entities_file${NC}"
    fi
}

# Función para extraer JSON de la salida
extract_json() {
    local output="$1"
    
    # Buscar el inicio del JSON
    local json_start=$(echo "$output" | grep -n "^\s*{" | head -1 | cut -d: -f1)
    
    if [ -n "$json_start" ]; then
        # Extraer desde la línea del JSON hasta el final
        local json_content=$(echo "$output" | tail -n +$json_start)
        
        # Usar un parser simple para extraer solo el JSON válido
        local brace_count=0
        local in_json=false
        local json_lines=""
        
        while IFS= read -r line; do
            if [[ "$line" =~ ^\s*\{ ]]; then
                in_json=true
            fi
            
            if [ "$in_json" = true ]; then
                json_lines="$json_lines$line"$'\n'
                brace_count=$((brace_count + $(echo "$line" | tr -cd '{' | wc -c)))
                brace_count=$((brace_count - $(echo "$line" | tr -cd '}' | wc -c)))
                
                if [ $brace_count -eq 0 ]; then
                    break
                fi
            fi
        done <<< "$json_content"
        
        echo "$json_lines"
    fi
}

# Función principal
main() {
    show_header
    
    if [ "$AYUDA" = true ]; then
        show_help
        return 0
    fi
    
    if [ -z "$TABLA" ]; then
        echo -e "${RED}❌ El parámetro -t (tabla) es requerido${NC}"
        echo -e "${YELLOW}   Usa -h para ver la ayuda completa${NC}"
        return 1
    fi
    
    echo -e "${CYAN}🎯 Configuración:${NC}"
    echo -e "${WHITE}   Tabla: $TABLA${NC}"
    if [ -n "$ENTIDAD" ]; then
        echo -e "${WHITE}   Entidad: $ENTIDAD${NC}"
    fi
    if [ -n "$ARCHIVO" ]; then
        echo -e "${WHITE}   Archivo salida: $ARCHIVO${NC}"
    fi
    if [ "$AGREGAR" = true ]; then
        echo -e "${WHITE}   Agregar a entities.json: Sí${NC}"
    fi
    echo ""
    
    # Verificar prerequisitos
    echo -e "${CYAN}🔍 Verificando prerequisitos...${NC}"
    if ! test_prerequisites; then
        return 1
    fi
    echo ""
    
    # Generar configuración
    local configuration
    if configuration=$(invoke_entity_generator "$TABLA" "$ENTIDAD"); then
        # Extraer solo la parte JSON
        local clean_json=$(extract_json "$configuration")
        
        if [ -n "$clean_json" ]; then
            # Guardar en archivo si se especifica
            if [ -n "$ARCHIVO" ]; then
                save_configuration "$clean_json" "$ARCHIVO"
            fi
            
            # Agregar a entities.json si se especifica
            if [ "$AGREGAR" = true ]; then
                add_to_entities_file "$clean_json" "${ENTIDAD:-$TABLA}"
            fi
            
            # Mostrar la configuración si no se guarda en archivo
            if [ -z "$ARCHIVO" ] && [ "$AGREGAR" = false ]; then
                echo -e "${GREEN}📋 Configuración generada:${NC}"
                echo "$clean_json"
            fi
        else
            echo -e "${RED}❌ No se pudo extraer la configuración JSON${NC}"
        fi
    else
        return 1
    fi
}

# Parsear argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--tabla)
            TABLA="$2"
            shift 2
            ;;
        -e|--entidad)
            ENTIDAD="$2"
            shift 2
            ;;
        -f|--archivo)
            ARCHIVO="$2"
            shift 2
            ;;
        -a|--agregar)
            AGREGAR=true
            shift
            ;;
        -h|--ayuda)
            AYUDA=true
            shift
            ;;
        *)
            echo -e "${RED}❌ Opción desconocida: $1${NC}"
            echo -e "${YELLOW}   Usa -h para ver la ayuda${NC}"
            exit 1
            ;;
    esac
done

# Ejecutar función principal
main
