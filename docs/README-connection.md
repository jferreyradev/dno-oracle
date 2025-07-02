# Oracle Database Connection - dno-oracle

Este proyecto contiene scripts para conectar a una base de datos Oracle usando Deno.

## Archivos Creados

### Scripts de Conexión
- `test-connection.js` - Script básico para probar la conexión a Oracle
- `test-connection-advanced.js` - Diagnóstico avanzado de conexión con múltiples formatos
- `db.js` - Módulo principal de conexión a Oracle

### Scripts de Configuración
- `oracle-setup.sh` - Script principal para configurar entorno y ejecutar pruebas
- `diagnose-oracle.sh` - Diagnóstico de Oracle Instant Client
- `fix-dns.sh` - Ayuda para resolver problemas de DNS/resolución de nombres

### Archivos de Configuración
- `.env` - Variables de entorno para la conexión
- `deps.ts` - Dependencias de Deno

## Uso

### 1. Configurar las variables de entorno
Edita el archivo `.env` con los datos correctos de tu base de datos:
```bash
USER=tu_usuario
PASSWORD=tu_password
CONNECTIONSTRING=tu_host:1521/tu_servicio
POOL=10
LIB_ORA=/ruta/a/instantclient
```

### 2. Usar el script principal
```bash
# Prueba básica de conexión
./oracle-setup.sh test

# Diagnóstico completo
./oracle-setup.sh test-advanced

# Diagnóstico de Oracle Client
./oracle-setup.sh diagnose

# Ayuda para resolver DNS
./oracle-setup.sh fix-dns
```

## Problemas Comunes y Soluciones

### Error: "Cannot locate a 64-bit Oracle Client library"
**Solución:** Configurar el LD_LIBRARY_PATH
```bash
export LD_LIBRARY_PATH=/ruta/a/instantclient:$LD_LIBRARY_PATH
```

### Error: "ORA-12154: TNS:could not resolve the connect identifier"
**Causa:** El hostname no se puede resolver

**Soluciones:**
1. **Usar IP directamente:**
   ```bash
   CONNECTIONSTRING=192.168.1.100:1521/desa
   ```

2. **Agregar al archivo hosts:**
   ```bash
   sudo nano /etc/hosts
   # Agregar: 192.168.1.100    DESKTOP-QVNJL5C
   ```

3. **Formato TNS completo:**
   ```bash
   CONNECTIONSTRING=(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=192.168.1.100)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=desa)))
   ```

### Error: "Name or service not known"
**Causa:** Problema de resolución DNS
**Solución:** Ejecutar `./oracle-setup.sh fix-dns` para obtener ayuda específica

## Estado Actual

✅ Oracle Instant Client configurado correctamente
✅ Scripts de diagnóstico funcionando
❌ Problema de resolución DNS para 'DESKTOP-QVNJL5C'

**Próximo paso:** Resolver la IP del servidor Oracle y actualizar el archivo `.env`

## Comandos Útiles

```bash
# Verificar librerías Oracle
ldd /home/jferreyradev/bin/instantclient_19_25/libclntsh.so.19.1

# Verificar conectividad de red
nc -zv HOSTNAME 1521

# Verificar resolución DNS
nslookup DESKTOP-QVNJL5C
```
