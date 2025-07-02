# DNO-Oracle - Estructura Multiplataforma

Esta es la nueva estructura organizada del proyecto DNO-Oracle, con scripts específicos para cada plataforma.

## 📁 Estructura de Scripts

```
scripts/
├── windows/           # Scripts específicos para Windows (.ps1)
│   ├── oracle-setup.ps1
│   ├── diagnose-oracle.ps1
│   ├── fix-dns.ps1
│   ├── demo-api.ps1
│   ├── demo-complete.ps1
│   └── setup-logs-demo.ps1
├── linux/             # Scripts específicos para Linux/Unix (.sh)
│   ├── oracle-setup.sh
│   ├── diagnose-oracle.sh
│   ├── fix-dns.sh
│   ├── demo-api.sh
│   ├── demo-complete.sh
│   └── setup-logs-demo.sh
└── common/            # Archivos compartidos (SQL, JS)
    ├── *.sql          # Scripts de base de datos
    ├── *.js           # Utilidades JavaScript
    └── test-*.js      # Scripts de prueba
```

## 🚀 Scripts Principales por Plataforma

### Windows (PowerShell)
```powershell
# Script principal
.\run.ps1 <comando>

# Scripts específicos
.\scripts\windows\oracle-setup.ps1 <comando>
.\scripts\windows\diagnose-oracle.ps1
.\scripts\windows\fix-dns.ps1
```

### Linux/Unix (Bash)
```bash
# Script principal
./run.sh <comando>

# Scripts específicos
./scripts/linux/oracle-setup.sh <comando>
./scripts/linux/diagnose-oracle.sh
./scripts/linux/fix-dns.sh
```

### Alternativa Windows (Batch)
```cmd
REM Script simple para cmd
run.bat <comando>
```

## 📋 Comandos Universales

Estos comandos funcionan igual en ambas plataformas:

### Configuración
- `install` - Configurar proyecto inicial
- `check` - Verificar configuración
- `diagnose` - Diagnóstico del sistema Oracle

### Pruebas
- `test` - Prueba básica de conexión
- `test:advanced` - Diagnóstico completo
- `test:final` - Prueba final con ejemplos

### API
- `api` - Iniciar servidor API
- `api:dev` - Servidor en modo desarrollo
- `demo` - Demostración básica
- `demo:complete` - Demostración completa

### Base de Datos
- `setup:logs` - Configurar tablas de logs
- `sql <archivo>` - Ejecutar scripts SQL

### Utilidades
- `clean` - Limpiar archivos temporales
- `help` - Mostrar ayuda
- `docs` - Abrir documentación

## 🔧 Configuración por Plataforma

### Windows
1. Instalar Oracle Instant Client en `C:\oracle\instantclient_19_25`
2. Configurar variables de entorno (automatizado en scripts)
3. Usar PowerShell o CMD según preferencia

### Linux
1. Instalar Oracle Instant Client en `/home/usuario/bin/instantclient_19_25`
2. Configurar `LD_LIBRARY_PATH` (automatizado en scripts)
3. Dar permisos de ejecución: `chmod +x scripts/linux/*.sh`

## 📖 Documentación Específica

- **Windows**: `README-WINDOWS.md` - Guía completa para Windows
- **Linux**: `README.md` - Documentación principal
- **API**: `docs/API.md` - Documentación de la API REST
- **Instalación**: `docs/INSTALLATION.md` - Guía de instalación

## 🛠️ Migración de Scripts Existentes

Si tienes scripts antiguos, la migración es automática:

### Scripts Movidos a `windows/`:
- `oracle-setup.ps1`
- `diagnose-oracle.ps1`
- `fix-dns.ps1`
- `demo-api.ps1`
- `demo-complete.ps1`
- `setup-logs-demo.ps1`

### Scripts Movidos a `linux/`:
- `oracle-setup.sh`
- `diagnose-oracle.sh`
- `fix-dns.sh`
- `demo-api.sh`
- `demo-complete.sh`
- `setup-logs-demo.sh`

### Archivos Movidos a `common/`:
- `*.sql` - Scripts de base de datos
- `*.js` - Utilidades y pruebas JavaScript

## 🔍 Resolución de Problemas

### Error: "Script no encontrado"
```bash
# Linux
./scripts/linux/oracle-setup.sh test

# Windows
.\scripts\windows\oracle-setup.ps1 test
```

### Error: "Permisos denegados" (Linux)
```bash
chmod +x scripts/linux/*.sh
chmod +x run.sh
```

### Error: "Política de ejecución" (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📊 Ventajas de la Nueva Estructura

1. **Organización Clara**: Scripts separados por plataforma
2. **Mantenimiento Simplificado**: Cambios específicos por OS
3. **Reutilización**: Archivos comunes compartidos
4. **Escalabilidad**: Fácil agregar nuevas plataformas
5. **Compatibilidad**: Scripts antiguos siguen funcionando

## 🚀 Inicio Rápido

### Windows
```powershell
.\run.ps1 install
.\run.ps1 test
.\run.ps1 demo:complete
```

### Linux
```bash
./run.sh install
./run.sh test
./run.sh demo:complete
```

## 📋 Próximos Pasos

1. Ejecutar diagnóstico: `diagnose`
2. Configurar base de datos: `setup:logs`
3. Probar conexión: `test`
4. Ejecutar demostración: `demo:complete`
5. Iniciar desarrollo: `api:dev`

La nueva estructura mantiene toda la funcionalidad existente mientras proporciona mejor organización y soporte multiplataforma.
