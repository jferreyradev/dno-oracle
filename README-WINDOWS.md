# DNO-Oracle - Scripts para Windows

Este documento describe cómo usar los scripts de PowerShell para probar y gestionar DNO-Oracle en Windows.

## 📋 Requisitos Previos

### 1. Instalaciones Necesarias
- **Deno** (versión 1.30 o superior)
- **Oracle Instant Client** (19c recomendado)
- **PowerShell** (incluido en Windows 10/11)

### 2. Configuración de Oracle Instant Client

1. Descargar Oracle Instant Client desde:
   ```
   https://www.oracle.com/database/technologies/instant-client/downloads.html
   ```

2. Extraer en `C:\oracle\instantclient_19_25` (o ajustar la ruta en los scripts)

3. Agregar al PATH del sistema:
   ```powershell
   [Environment]::SetEnvironmentVariable('PATH', "C:\oracle\instantclient_19_25;$env:PATH", 'User')
   ```

## 🚀 Scripts Disponibles

### Script Principal: `run.ps1`

El script principal que gestiona todas las operaciones:

```powershell
# Configuración inicial
.\run.ps1 install

# Pruebas de conexión
.\run.ps1 test
.\run.ps1 test:advanced
.\run.ps1 test:final

# Servidor API
.\run.ps1 api
.\run.ps1 api:dev  # Modo desarrollo con recarga automática

# Demostraciones
.\run.ps1 demo
.\run.ps1 demo:complete

# Utilidades
.\run.ps1 diagnose
.\run.ps1 fix:dns
.\run.ps1 help
```

### Scripts Específicos

#### `oracle-setup.ps1`
Script de configuración del entorno Oracle:
```powershell
.\scripts\oracle-setup.ps1 test           # Prueba básica
.\scripts\oracle-setup.ps1 test-advanced  # Diagnóstico avanzado
.\scripts\oracle-setup.ps1 diagnose       # Diagnóstico de Oracle Client
.\scripts\oracle-setup.ps1 fix-dns        # Solución de problemas DNS
```

#### `diagnose-oracle.ps1`
Diagnóstico completo del entorno Oracle:
```powershell
.\scripts\diagnose-oracle.ps1
```
- Verifica instalación de Oracle Instant Client
- Comprueba variables de entorno
- Lista librerías disponibles
- Muestra información del sistema

#### `fix-dns.ps1`
Herramienta para solucionar problemas de DNS:
```powershell
.\scripts\fix-dns.ps1
```
- Diagnostica problemas de conectividad
- Ofrece soluciones automatizadas
- Configura DNS públicos (Google, Cloudflare)
- Limpia caché DNS

#### `demo-api.ps1`
Demostración de la API REST:
```powershell
.\scripts\demo-api.ps1
```
- Verifica estado de la API
- Ejecuta operaciones CRUD
- Muestra funcionalidades principales

#### `demo-complete.ps1`
Demostración completa del sistema:
```powershell
.\scripts\demo-complete.ps1
```
- Configuración completa del entorno
- Inicio automático de la API
- Pruebas exhaustivas
- Demostración de todas las funcionalidades

#### `setup-logs-demo.ps1`
Configuración del sistema de logs:
```powershell
.\scripts\setup-logs-demo.ps1
```
- Crea tablas necesarias
- Inserta datos de prueba
- Verifica la configuración

## 🛠️ Guía de Uso Paso a Paso

### 1. Configuración Inicial

```powershell
# Clonar el repositorio y navegar al directorio
cd d:\proyectos\denostuff\dno-oracle

# Configurar el proyecto
.\run.ps1 install

# Crear archivo de configuración
Copy-Item .env.example .env
# Editar .env con tus datos de conexión
```

### 2. Verificar Configuración

```powershell
# Diagnosticar entorno Oracle
.\run.ps1 diagnose

# Prueba básica de conexión
.\run.ps1 test
```

### 3. Configurar Base de Datos

```powershell
# Configurar tablas de demostración
.\run.ps1 setup:logs
```

### 4. Ejecutar Demostraciones

```powershell
# Demostración básica
.\run.ps1 demo

# Demostración completa (recomendado)
.\run.ps1 demo:complete
```

### 5. Usar la API

```powershell
# Iniciar servidor (en una terminal)
.\run.ps1 api

# En otra terminal, probar la API
curl http://localhost:8000/api/health
curl http://localhost:8000/api/users
```

## 🔧 Resolución de Problemas

### Error: "Oracle Instant Client no encontrado"
```powershell
# Verificar instalación
.\scripts\diagnose-oracle.ps1

# Descargar e instalar Oracle Instant Client
# Ajustar la variable $ORACLE_HOME en los scripts
```

### Error: "No se puede conectar a la base de datos"
```powershell
# Verificar archivo .env
# Ejecutar diagnóstico
.\run.ps1 diagnose

# Probar solución DNS
.\run.ps1 fix:dns
```

### Error: "API no disponible"
```powershell
# Verificar que la API esté ejecutándose
Get-Process | Where-Object {$_.ProcessName -like "*deno*"}

# Reiniciar API
.\run.ps1 api
```

### Problemas de Permisos
```powershell
# Ejecutar PowerShell como Administrador para:
# - Configurar DNS
# - Instalar Oracle Instant Client
# - Modificar variables de entorno del sistema
```

## 📊 Variables de Entorno

Los scripts utilizan estas variables principales:

- `ORACLE_HOME`: Ruta del Oracle Instant Client
- `PATH`: Incluye la ruta de Oracle
- Variables del archivo `.env` para conexión a BD

## 🔍 Logs y Debugging

### Ver logs de la API:
```powershell
# Con la API ejecutándose
curl http://localhost:8000/api/logs

# O usar el script de demostración
.\run.ps1 demo
```

### Debugging de conexión:
```powershell
# Pruebas progresivas
.\run.ps1 test           # Básica
.\run.ps1 test:advanced  # Avanzada
.\run.ps1 test:final     # Completa
```

## 📚 Archivos de Configuración

- `.env` - Variables de entorno de la aplicación
- `deno.json` - Configuración de Deno
- `scripts/*.sql` - Scripts de base de datos
- `docs/` - Documentación adicional

## 🆘 Soporte

Si encuentras problemas:

1. Ejecuta el diagnóstico completo:
   ```powershell
   .\run.ps1 diagnose
   ```

2. Revisa los logs de error

3. Consulta la documentación en `docs/`

4. Ejecuta la demostración paso a paso:
   ```powershell
   .\run.ps1 demo:complete
   ```

## 📋 Comandos Rápidos

```powershell
# Setup completo
.\run.ps1 install && .\run.ps1 setup:logs

# Prueba rápida
.\run.ps1 test && .\run.ps1 demo

# Desarrollo
.\run.ps1 api:dev  # Terminal 1
.\run.ps1 demo     # Terminal 2

# Limpieza
.\run.ps1 clean
```
