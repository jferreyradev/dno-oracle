#!/bin/bash

# DNO-Oracle API Server - Script de inicio universal para Linux/macOS
# Detecta automáticamente el sistema operativo y configura las rutas apropiadas

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables por defecto
PORT=8000
MODE="minimal"
HELP=false

# Función para mostrar ayuda
show_help() {
    cat << EOF
🚀 DNO-Oracle API Server - Script de inicio universal

USO:
    $0 [OPTIONS]

OPCIONES:
    -p, --port PORT     Puerto en el que ejecutar el servidor (por defecto: 8000)
    -m, --mode MODE     Modo de ejecución: minimal (por defecto) o enhanced
    -h, --help          Muestra esta ayuda

EJEMPLOS:
    # Ejecutar en el puerto por defecto (8000)
    $0

    # Ejecutar en puerto específico
    $0 --port 3000

    # Mostrar ayuda
    $0 --help

SISTEMAS COMPATIBLES:
    - Linux (Ubuntu, Debian, CentOS, Fedora, etc.)
    - macOS (Intel y Apple Silicon)
    - Windows (con WSL)

REQUISITOS:
    - Deno 1.30 o superior
    - Oracle Instant Client configurado
    - Archivos .env y config/entities.json

EOF
}

# Función para mostrar banner
show_banner() {
    echo -e "${MAGENTA}"
    echo "🚀 DNO-Oracle API Server"
    echo "========================"
    echo -e "${NC}"
}

# Función para detectar sistema operativo
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macOS"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "Windows"
    else
        echo "Unknown"
    fi
}

# Función para verificar Deno
check_deno() {
    if ! command -v deno &> /dev/null; then
        return 1
    fi
    return 0
}

# Función para mostrar instrucciones de instalación de Deno
show_deno_install_instructions() {
    local os=$1
    
    echo -e "${RED}❌ Deno no está instalado o no está en el PATH${NC}"
    echo ""
    echo -e "${CYAN}📦 Instrucciones de instalación:${NC}"
    echo ""
    
    case $os in
        "Linux")
            echo -e "${CYAN}Bash:${NC}"
            echo -e "${YELLOW}  curl -fsSL https://deno.land/install.sh | sh${NC}"
            echo ""
            echo -e "${CYAN}Snap:${NC}"
            echo -e "${YELLOW}  sudo snap install deno${NC}"
            echo ""
            echo -e "${CYAN}Cargo:${NC}"
            echo -e "${YELLOW}  cargo install deno --locked${NC}"
            echo ""
            echo -e "${CYAN}Debian/Ubuntu:${NC}"
            echo -e "${YELLOW}  sudo apt install deno${NC}"
            ;;
        "macOS")
            echo -e "${CYAN}Homebrew:${NC}"
            echo -e "${YELLOW}  brew install deno${NC}"
            echo ""
            echo -e "${CYAN}Bash:${NC}"
            echo -e "${YELLOW}  curl -fsSL https://deno.land/install.sh | sh${NC}"
            echo ""
            echo -e "${CYAN}MacPorts:${NC}"
            echo -e "${YELLOW}  sudo port install deno${NC}"
            ;;
        "Windows")
            echo -e "${CYAN}PowerShell:${NC}"
            echo -e "${YELLOW}  irm https://deno.land/install.ps1 | iex${NC}"
            echo ""
            echo -e "${CYAN}Scoop:${NC}"
            echo -e "${YELLOW}  scoop install deno${NC}"
            echo ""
            echo -e "${CYAN}Chocolatey:${NC}"
            echo -e "${YELLOW}  choco install deno${NC}"
            ;;
    esac
    
    echo ""
    echo -e "${CYAN}🔗 Más información: https://deno.land/manual/getting_started/installation${NC}"
}

# Función para verificar configuración
check_configuration() {
    local config_valid=true
    
    # Verificar .env
    if [[ ! -f ".env" ]]; then
        echo -e "${YELLOW}⚠️  Archivo .env no encontrado${NC}"
        echo -e "${CYAN}   Copiando desde .env.example...${NC}"
        
        if [[ -f ".env.example" ]]; then
            cp ".env.example" ".env"
            echo -e "${GREEN}   ✅ Archivo .env creado desde .env.example${NC}"
        else
            echo -e "${RED}   ❌ Archivo .env.example no encontrado${NC}"
            config_valid=false
        fi
    fi
    
    # Verificar config/entities.json
    if [[ ! -f "config/entities.json" ]]; then
        echo -e "${YELLOW}⚠️  Archivo config/entities.json no encontrado${NC}"
        config_valid=false
    fi
    
    # Verificar servidor
    local server_file="api/server-$MODE.ts"
    if [[ ! -f "$server_file" ]]; then
        echo -e "${RED}❌ Servidor $server_file no encontrado${NC}"
        config_valid=false
    fi
    
    [[ $config_valid == true ]]
}

# Función para obtener configuración del puerto
get_configured_port() {
    if [[ -f ".env" ]]; then
        local port_line=$(grep "^PORT=" ".env" 2>/dev/null || echo "")
        if [[ -n "$port_line" ]]; then
            local configured_port=$(echo "$port_line" | cut -d'=' -f2 | tr -d ' ')
            if [[ "$configured_port" =~ ^[0-9]+$ ]]; then
                echo "$configured_port"
                return
            fi
        fi
    fi
    echo "8000"
}

# Función principal
start_server() {
    show_banner
    
    # Detectar sistema operativo
    local os=$(detect_os)
    echo -e "${CYAN}🖥️  Sistema operativo detectado: $os${NC}"
    
    # Verificar Deno
    echo -e "${CYAN}🔍 Verificando instalación de Deno...${NC}"
    if ! check_deno; then
        show_deno_install_instructions "$os"
        exit 1
    fi
    
    # Mostrar versión de Deno
    local deno_version=$(deno --version | head -n1)
    echo -e "${GREEN}   ✅ $deno_version${NC}"
    
    # Verificar configuración
    echo -e "${CYAN}🔧 Verificando configuración...${NC}"
    if ! check_configuration; then
        echo -e "${RED}❌ Configuración incompleta. Revisa los archivos mencionados.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}   ✅ Configuración válida${NC}"
    
    # Configurar puerto
    local env_port=$(get_configured_port)
    if [[ $PORT -eq 8000 && $env_port -ne 8000 ]]; then
        PORT=$env_port
        echo -e "${CYAN}🔧 Usando puerto configurado en .env: $PORT${NC}"
    fi
    
    # Configurar servidor
    local server_file="api/server-$MODE.ts"
    echo -e "${CYAN}🚀 Iniciando servidor DNO-Oracle...${NC}"
    echo -e "${CYAN}   📄 Archivo: $server_file${NC}"
    echo -e "${CYAN}   🌐 Puerto: $PORT${NC}"
    echo -e "${CYAN}   🖥️  Plataforma: $os${NC}"
    echo ""
    
    # Configurar variable de entorno del puerto si es diferente
    if [[ $PORT -ne $env_port ]]; then
        export PORT=$PORT
    fi
    
    # Comando de Deno
    local deno_args=(
        "run"
        "--allow-net"
        "--allow-read"
        "--allow-env"
        "--allow-ffi"
        "$server_file"
    )
    
    echo -e "${CYAN}🎯 Ejecutando comando:${NC}"
    echo -e "${YELLOW}   deno ${deno_args[*]}${NC}"
    echo ""
    echo -e "${YELLOW}🛑 Presiona Ctrl+C para detener el servidor${NC}"
    echo ""
    
    # Ejecutar servidor
    if ! deno "${deno_args[@]}"; then
        echo -e "${RED}❌ Error al ejecutar el servidor${NC}"
        exit 1
    fi
}

# Procesar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validar argumentos
if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ Puerto debe ser un número válido${NC}"
    exit 1
fi

if [[ "$MODE" != "minimal" && "$MODE" != "enhanced" ]]; then
    echo -e "${RED}❌ Modo debe ser 'minimal' o 'enhanced'${NC}"
    exit 1
fi

# Ejecutar función principal
start_server
