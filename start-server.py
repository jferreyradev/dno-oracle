#!/usr/bin/env python3
"""
DNO-Oracle API Server - Script de inicio universal en Python
Funciona en Windows, Linux y macOS

Este script proporciona una interfaz unificada para iniciar el servidor DNO-Oracle
en cualquier sistema operativo con Python instalado.
"""

import os
import sys
import platform
import subprocess
import argparse
import shutil
from pathlib import Path

class Colors:
    """Códigos de color ANSI para output colorido"""
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def colored_print(text, color=Colors.WHITE):
    """Imprime texto con color"""
    print(f"{color}{text}{Colors.ENDC}")

def show_banner():
    """Muestra el banner del proyecto"""
    colored_print("\n🚀 DNO-Oracle API Server", Colors.MAGENTA)
    colored_print("========================", Colors.MAGENTA)
    print()

def detect_os():
    """Detecta el sistema operativo"""
    system = platform.system()
    if system == "Windows":
        return "Windows"
    elif system == "Darwin":
        return "macOS"
    elif system == "Linux":
        return "Linux"
    else:
        return "Unknown"

def check_deno():
    """Verifica si Deno está instalado"""
    return shutil.which("deno") is not None

def show_deno_install_instructions(os_name):
    """Muestra instrucciones de instalación de Deno"""
    colored_print("❌ Deno no está instalado o no está en el PATH", Colors.RED)
    print()
    colored_print("📦 Instrucciones de instalación:", Colors.CYAN)
    print()
    
    if os_name == "Windows":
        colored_print("PowerShell:", Colors.CYAN)
        colored_print("  irm https://deno.land/install.ps1 | iex", Colors.YELLOW)
        print()
        colored_print("Scoop:", Colors.CYAN)
        colored_print("  scoop install deno", Colors.YELLOW)
        print()
        colored_print("Chocolatey:", Colors.CYAN)
        colored_print("  choco install deno", Colors.YELLOW)
        print()
        colored_print("Winget:", Colors.CYAN)
        colored_print("  winget install deno", Colors.YELLOW)
        
    elif os_name == "Linux":
        colored_print("Bash:", Colors.CYAN)
        colored_print("  curl -fsSL https://deno.land/install.sh | sh", Colors.YELLOW)
        print()
        colored_print("Snap:", Colors.CYAN)
        colored_print("  sudo snap install deno", Colors.YELLOW)
        print()
        colored_print("Cargo:", Colors.CYAN)
        colored_print("  cargo install deno --locked", Colors.YELLOW)
        print()
        colored_print("Debian/Ubuntu:", Colors.CYAN)
        colored_print("  sudo apt install deno", Colors.YELLOW)
        
    elif os_name == "macOS":
        colored_print("Homebrew:", Colors.CYAN)
        colored_print("  brew install deno", Colors.YELLOW)
        print()
        colored_print("Bash:", Colors.CYAN)
        colored_print("  curl -fsSL https://deno.land/install.sh | sh", Colors.YELLOW)
        print()
        colored_print("MacPorts:", Colors.CYAN)
        colored_print("  sudo port install deno", Colors.YELLOW)
    
    print()
    colored_print("🔗 Más información: https://deno.land/manual/getting_started/installation", Colors.CYAN)

def check_configuration(mode):
    """Verifica la configuración del proyecto"""
    config_valid = True
    
    # Verificar .env
    if not Path(".env").exists():
        colored_print("⚠️  Archivo .env no encontrado", Colors.YELLOW)
        colored_print("   Copiando desde .env.example...", Colors.CYAN)
        
        if Path(".env.example").exists():
            shutil.copy(".env.example", ".env")
            colored_print("   ✅ Archivo .env creado desde .env.example", Colors.GREEN)
        else:
            colored_print("   ❌ Archivo .env.example no encontrado", Colors.RED)
            config_valid = False
    
    # Verificar config/entities.json
    if not Path("config/entities.json").exists():
        colored_print("⚠️  Archivo config/entities.json no encontrado", Colors.YELLOW)
        config_valid = False
    
    # Verificar servidor
    server_file = Path(f"api/server-{mode}.ts")
    if not server_file.exists():
        colored_print(f"❌ Servidor {server_file} no encontrado", Colors.RED)
        config_valid = False
    
    return config_valid

def get_configured_port():
    """Obtiene el puerto configurado en .env"""
    if Path(".env").exists():
        try:
            with open(".env", "r") as f:
                for line in f:
                    if line.strip().startswith("PORT="):
                        port_str = line.split("=")[1].strip()
                        if port_str.isdigit():
                            return int(port_str)
        except Exception:
            pass
    return 8000

def start_server(port, mode):
    """Inicia el servidor DNO-Oracle"""
    show_banner()
    
    # Detectar sistema operativo
    os_name = detect_os()
    colored_print(f"🖥️  Sistema operativo detectado: {os_name}", Colors.CYAN)
    
    # Verificar Deno
    colored_print("🔍 Verificando instalación de Deno...", Colors.CYAN)
    if not check_deno():
        show_deno_install_instructions(os_name)
        sys.exit(1)
    
    # Mostrar versión de Deno
    try:
        result = subprocess.run(["deno", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            colored_print(f"   ✅ {version_line}", Colors.GREEN)
    except Exception:
        colored_print("   ⚠️  No se pudo obtener la versión de Deno", Colors.YELLOW)
    
    # Verificar configuración
    colored_print("🔧 Verificando configuración...", Colors.CYAN)
    if not check_configuration(mode):
        colored_print("❌ Configuración incompleta. Revisa los archivos mencionados.", Colors.RED)
        sys.exit(1)
    
    colored_print("   ✅ Configuración válida", Colors.GREEN)
    
    # Configurar puerto
    env_port = get_configured_port()
    if port == 8000 and env_port != 8000:
        port = env_port
        colored_print(f"🔧 Usando puerto configurado en .env: {port}", Colors.CYAN)
    
    # Configurar servidor
    server_file = f"api/server-{mode}.ts"
    colored_print("🚀 Iniciando servidor DNO-Oracle...", Colors.CYAN)
    colored_print(f"   📄 Archivo: {server_file}", Colors.CYAN)
    colored_print(f"   🌐 Puerto: {port}", Colors.CYAN)
    colored_print(f"   🖥️  Plataforma: {os_name}", Colors.CYAN)
    print()
    
    # Configurar variable de entorno del puerto
    if port != env_port:
        os.environ['PORT'] = str(port)
    
    # Comando de Deno
    deno_args = [
        "deno",
        "run",
        "--allow-net",
        "--allow-read",
        "--allow-env",
        "--allow-ffi",
        server_file
    ]
    
    colored_print("🎯 Ejecutando comando:", Colors.CYAN)
    colored_print(f"   {' '.join(deno_args)}", Colors.YELLOW)
    print()
    colored_print("🛑 Presiona Ctrl+C para detener el servidor", Colors.YELLOW)
    print()
    
    # Ejecutar servidor
    try:
        subprocess.run(deno_args)
    except KeyboardInterrupt:
        colored_print("\n🛑 Servidor detenido por el usuario", Colors.YELLOW)
    except Exception as e:
        colored_print(f"❌ Error al ejecutar el servidor: {e}", Colors.RED)
        sys.exit(1)

def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description="DNO-Oracle API Server - Script de inicio universal",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
EJEMPLOS:
    # Ejecutar en el puerto por defecto (8000)
    python start-server.py

    # Ejecutar en puerto específico
    python start-server.py --port 3000

    # Usar modo enhanced
    python start-server.py --mode enhanced

SISTEMAS COMPATIBLES:
    - Windows 10/11
    - Linux (Ubuntu, Debian, CentOS, Fedora, etc.)
    - macOS (Intel y Apple Silicon)

REQUISITOS:
    - Python 3.6 o superior
    - Deno 1.30 o superior
    - Oracle Instant Client configurado
    - Archivos .env y config/entities.json
        """
    )
    
    parser.add_argument(
        "-p", "--port",
        type=int,
        default=8000,
        help="Puerto en el que ejecutar el servidor (por defecto: 8000)"
    )
    
    parser.add_argument(
        "-m", "--mode",
        choices=["minimal", "enhanced"],
        default="minimal",
        help="Modo de ejecución (por defecto: minimal)"
    )
    
    args = parser.parse_args()
    
    # Validar argumentos
    if args.port < 1 or args.port > 65535:
        colored_print("❌ Puerto debe estar entre 1 y 65535", Colors.RED)
        sys.exit(1)
    
    # Cambiar al directorio del script
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    # Iniciar servidor
    start_server(args.port, args.mode)

if __name__ == "__main__":
    main()
