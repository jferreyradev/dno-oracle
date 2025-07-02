# Guía de Instalación - Oracle Instant Client

Esta guía te ayudará a instalar Oracle Instant Client en diferentes sistemas operativos.

## Linux (Ubuntu/Debian)

### Opción 1: Descarga Manual

1. **Descargar Oracle Instant Client:**
   ```bash
   # Visitar: https://www.oracle.com/database/technologies/instant-client.html
   # Descargar Basic o Basic Light package para tu arquitectura
   ```

2. **Extraer archivos:**
   ```bash
   mkdir -p ~/bin
   unzip instantclient-basic-linux.x64-19.25.0.0.0dbru.zip -d ~/bin/
   ```

3. **Configurar librerías:**
   ```bash
   # Opción A: Usar ldconfig (requiere sudo)
   echo '/home/usuario/bin/instantclient_19_25' | sudo tee /etc/ld.so.conf.d/oracle.conf
   sudo ldconfig
   
   # Opción B: Configurar LD_LIBRARY_PATH
   echo 'export LD_LIBRARY_PATH=/home/usuario/bin/instantclient_19_25:$LD_LIBRARY_PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

### Opción 2: Usando apt (Oracle Linux/RHEL)

```bash
# Agregar repositorio Oracle
wget https://yum.oracle.com/RPM-GPG-KEY-oracle-ol7 -O /tmp/RPM-GPG-KEY-oracle
sudo apt-key add /tmp/RPM-GPG-KEY-oracle

# Instalar
sudo apt update
sudo apt install oracle-instantclient19.25-basic
```

## macOS

### Opción 1: Homebrew

```bash
# Instalar Homebrew si no está instalado
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Oracle Instant Client
brew tap homebrew/cask
brew install --cask oracle-instantclient
```

### Opción 2: Descarga Manual

```bash
# Descargar desde Oracle
# Extraer en /usr/local/
sudo mkdir -p /usr/local/
sudo unzip instantclient-basic-macos.x64-19.8.0.0.0dbru.zip -d /usr/local/

# Configurar variables de entorno
echo 'export LD_LIBRARY_PATH=/usr/local/instantclient_19_8:$LD_LIBRARY_PATH' >> ~/.zshrc
source ~/.zshrc
```

## Windows

### Usando winget

```powershell
# Instalar con winget
winget install Oracle.InstantClient

# O descargar manualmente
# https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html
```

### Configuración Manual

1. **Descargar y extraer:**
   - Descargar Basic package desde Oracle
   - Extraer en `C:\instantclient_21_10`

2. **Configurar PATH:**
   ```cmd
   # Agregar al PATH del sistema
   set PATH=%PATH%;C:\instantclient_21_10
   
   # O usando PowerShell
   $env:PATH += ";C:\instantclient_21_10"
   ```

## Verificación de Instalación

```bash
# Ejecutar diagnóstico
./scripts/oracle-setup.sh diagnose

# Verificar librerías
ldd /ruta/a/instantclient/libclntsh.so.19.1  # Linux
otool -L /ruta/a/instantclient/libclntsh.dylib.19.1  # macOS

# Probar conexión
./scripts/oracle-setup.sh test
```

## Arquitecturas Soportadas

| SO | Arquitectura | Notas |
|---|---|---|
| Linux | x86_64 | Más común |
| Linux | ARM64 | Para sistemas ARM |
| macOS | x86_64 | Intel Macs |
| macOS | ARM64 | Apple Silicon (M1/M2) |
| Windows | x86_64 | Windows 10/11 |

## Troubleshooting

### Error: "libclntsh.so: cannot open shared object file"

```bash
# Verificar LD_LIBRARY_PATH
echo $LD_LIBRARY_PATH

# Configurar temporalmente
export LD_LIBRARY_PATH=/ruta/a/instantclient:$LD_LIBRARY_PATH

# Configurar permanentemente
echo 'export LD_LIBRARY_PATH=/ruta/a/instantclient:$LD_LIBRARY_PATH' >> ~/.bashrc
```

### Error: "wrong ELF class: ELFCLASS64"

```bash
# Verificar arquitectura del sistema
uname -m

# Verificar arquitectura de las librerías
file /ruta/a/instantclient/libclntsh.so.19.1

# Descargar la versión correcta para tu arquitectura
```

### Permisos en macOS

```bash
# Si aparece error de seguridad en macOS
sudo xattr -r -d com.apple.quarantine /usr/local/instantclient_19_8
```

## Enlaces Útiles

- [Oracle Instant Client Downloads](https://www.oracle.com/database/technologies/instant-client.html)
- [Installation Guide](https://www.oracle.com/database/technologies/instant-client/linux-x86-64-downloads.html)
- [node-oracledb Installation](https://oracle.github.io/node-oracledb/INSTALL.html)
