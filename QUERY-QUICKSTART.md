# 🔥 Guía Rápida - Consultas SQL Directas

## ⚡ Inicio Rápido

### 1. Iniciar Servidor
```bash
deno run --allow-all api/server-enhanced.ts
```

### 2. Probar Consulta Básica
```bash
curl -X POST http://localhost:8000/api/query/select \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT SYSDATE, USER FROM dual"}'
```

### 3. Consulta con Parámetros
```bash
curl -X POST http://localhost:8000/api/query/select \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM usuarios WHERE activo = :activo", 
    "params": {"activo": 1}
  }'
```

## 🎯 Endpoints Disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/query/info` | GET | Información del servicio |
| `/api/query/select` | POST | Ejecutar SELECT |
| `/api/query/modify` | POST | Ejecutar INSERT/UPDATE/DELETE |
| `/api/query/validate` | POST | Validar sintaxis |
| `/api/query/explain` | POST | Plan de ejecución |
| `/api/query/tables/:name/stats` | GET | Estadísticas de tabla |

## 🛡️ Seguridad

- ✅ **Permitido**: SELECT, INSERT, UPDATE, DELETE, MERGE, WITH
- ❌ **Bloqueado**: DROP, TRUNCATE, ALTER, CREATE, GRANT, REVOKE
- 🔒 **Parámetros bindables**: `:parametro` (anti SQL injection)
- ⚡ **Límite**: 1000 filas máximo

## 📋 Formato de Request

```json
{
  "sql": "SELECT * FROM tabla WHERE campo = :valor",
  "params": { "valor": 123 },
  "options": { 
    "maxRows": 100,
    "autoCommit": true 
  }
}
```

## 📊 Formato de Response

```json
{
  "success": true,
  "data": [...],
  "metaData": [...],
  "rowsAffected": 1,
  "executionTime": 45,
  "query": "SELECT ..."
}
```

## 🚀 Ejemplos Prácticos

### Ejecutar Ejemplos Interactivos
```bash
deno run --allow-net examples/query-api-usage.js
```

### Ver Documentación Completa
- **Archivo**: `docs/QUERY-EXAMPLES.md`
- **Web**: http://localhost:8000/api/query/info

## 🎯 Casos de Uso Comunes

### Dashboard/Reportes
```javascript
fetch('/api/query/select', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      SELECT 
        COUNT(*) as total_usuarios,
        SUM(CASE WHEN activo = 1 THEN 1 ELSE 0 END) as activos,
        AVG(edad) as edad_promedio
      FROM usuarios
    `
  })
});
```

### Búsqueda Avanzada
```javascript
fetch('/api/query/select', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      SELECT u.*, p.nombre as perfil
      FROM usuarios u
      JOIN perfiles p ON u.id_perfil = p.id
      WHERE u.nombre LIKE :busqueda
        AND u.activo = :activo
      ORDER BY u.fecha_creacion DESC
    `,
    params: { 
      busqueda: '%juan%', 
      activo: 1 
    },
    options: { maxRows: 50 }
  })
});
```

### Análisis de Datos
```javascript
fetch('/api/query/select', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      WITH ventas_diarias AS (
        SELECT 
          TRUNC(fecha_venta) as fecha,
          COUNT(*) as num_ventas,
          SUM(total) as total_dia
        FROM ventas
        WHERE fecha_venta >= SYSDATE - 30
        GROUP BY TRUNC(fecha_venta)
      )
      SELECT 
        fecha,
        num_ventas,
        total_dia,
        AVG(total_dia) OVER (ORDER BY fecha ROWS 6 PRECEDING) as promedio_7dias
      FROM ventas_diarias
      ORDER BY fecha DESC
    `
  })
});
```

## 🔧 Tips de Rendimiento

1. **Usar EXPLAIN PLAN** para consultas complejas
2. **Limitar resultados** con `maxRows`
3. **Usar índices** apropiados
4. **Parámetros bindables** siempre
5. **Monitorear** `executionTime`

## 🆘 Solución de Problemas

### Error "NJS-007: invalid value for outFormat"
- ✅ **Solucionado** - El sistema usa automáticamente el formato correcto

### Error "Comando no permitido"
- 🛡️ **Seguridad** - Solo se permiten consultas seguras

### Error de conexión
- 🔍 **Verificar** que el servidor esté ejecutándose
- 🔍 **Revisar** configuración de base de datos en `.env`

---

**🎉 ¡Listo para usar consultas SQL directas!**
