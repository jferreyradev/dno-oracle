# 🔥 Ejemplos de Consultas SQL Directas

## Ejemplos Básicos

### 1. Consulta SELECT Simple
```javascript
// Consulta básica
const response = await fetch('http://localhost:8000/api/query/select', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: 'SELECT SYSDATE, USER FROM dual'
  })
});

const result = await response.json();
console.log(result);
// Output:
// {
//   "success": true,
//   "data": [{"SYSDATE": "2025-07-03T18:51:10.000Z", "USER": "WORKFLOW"}],
//   "executionTime": 45
// }
```

### 2. Consulta con Parámetros
```javascript
// Consulta con parámetros bindables (segura contra SQL injection)
const response = await fetch('http://localhost:8000/api/query/select', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: 'SELECT * FROM usuarios WHERE activo = :activo AND nombre LIKE :nombre',
    params: { 
      activo: 1, 
      nombre: '%Juan%' 
    },
    options: { 
      maxRows: 50 
    }
  })
});
```

### 3. Consulta con Fechas
```javascript
// Consultas con rangos de fechas
const response = await fetch('http://localhost:8000/api/query/select', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      SELECT 
        id_venta,
        fecha_venta,
        total,
        cliente
      FROM ventas 
      WHERE fecha_venta BETWEEN :fecha_inicio AND :fecha_fin
      ORDER BY fecha_venta DESC
    `,
    params: { 
      fecha_inicio: '2024-01-01',
      fecha_fin: '2024-12-31'
    }
  })
});
```

## Consultas Avanzadas

### 4. Consulta con JOINs
```javascript
// Consulta compleja con múltiples tablas
const response = await fetch('http://localhost:8000/api/query/select', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      SELECT 
        u.id,
        u.nombre as usuario,
        p.nombre as perfil,
        d.nombre as departamento,
        COUNT(v.id) as total_ventas
      FROM usuarios u
      INNER JOIN perfiles p ON u.id_perfil = p.id
      LEFT JOIN departamentos d ON u.id_departamento = d.id
      LEFT JOIN ventas v ON u.id = v.id_vendedor
      WHERE u.activo = :activo
      GROUP BY u.id, u.nombre, p.nombre, d.nombre
      HAVING COUNT(v.id) > :min_ventas
      ORDER BY total_ventas DESC
    `,
    params: { 
      activo: 1,
      min_ventas: 10
    }
  })
});
```

### 5. Subconsultas y CTEs
```javascript
// Common Table Expressions (WITH clause)
const response = await fetch('http://localhost:8000/api/query/select', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      WITH ventas_mensuales AS (
        SELECT 
          EXTRACT(MONTH FROM fecha_venta) as mes,
          EXTRACT(YEAR FROM fecha_venta) as anio,
          SUM(total) as total_mes
        FROM ventas
        WHERE fecha_venta >= ADD_MONTHS(SYSDATE, -12)
        GROUP BY EXTRACT(MONTH FROM fecha_venta), EXTRACT(YEAR FROM fecha_venta)
      ),
      promedio_ventas AS (
        SELECT AVG(total_mes) as promedio
        FROM ventas_mensuales
      )
      SELECT 
        vm.mes,
        vm.anio,
        vm.total_mes,
        pv.promedio,
        CASE 
          WHEN vm.total_mes > pv.promedio THEN 'Por encima del promedio'
          ELSE 'Por debajo del promedio'
        END as rendimiento
      FROM ventas_mensuales vm
      CROSS JOIN promedio_ventas pv
      ORDER BY vm.anio DESC, vm.mes DESC
    `
  })
});
```

## Consultas de Modificación

### 6. INSERT con Validación
```javascript
// Insertar nuevo registro
const response = await fetch('http://localhost:8000/api/query/modify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      INSERT INTO usuarios (nombre, email, id_perfil, fecha_creacion)
      VALUES (:nombre, :email, :id_perfil, SYSDATE)
    `,
    params: { 
      nombre: 'Carlos Rodriguez',
      email: 'carlos@empresa.com',
      id_perfil: 2
    },
    options: { 
      autoCommit: true 
    }
  })
});

// Respuesta:
// {
//   "success": true,
//   "rowsAffected": 1,
//   "executionTime": 25
// }
```

### 7. UPDATE Masivo
```javascript
// Actualización masiva con condiciones
const response = await fetch('http://localhost:8000/api/query/modify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      UPDATE productos 
      SET precio = precio * :factor_aumento,
          fecha_actualizacion = SYSDATE
      WHERE categoria = :categoria 
        AND precio < :precio_maximo
    `,
    params: { 
      factor_aumento: 1.15,  // Aumento del 15%
      categoria: 'ELECTRONICA',
      precio_maximo: 1000
    }
  })
});
```

### 8. DELETE con Condiciones
```javascript
// Eliminación selectiva
const response = await fetch('http://localhost:8000/api/query/modify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      DELETE FROM logs 
      WHERE fecha_log < ADD_MONTHS(SYSDATE, -6)
        AND nivel_log NOT IN ('ERROR', 'CRITICAL')
    `,
    options: { 
      autoCommit: true 
    }
  })
});
```

## Herramientas de Análisis

### 9. Validación de Consultas
```javascript
// Validar antes de ejecutar
const validation = await fetch('http://localhost:8000/api/query/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      SELECT u.*, p.nombre 
      FROM usuarios u 
      INNER JOIN perfiles p ON u.id_perfil = p.id
      WHERE u.activo = 1
    `
  })
});

const validationResult = await validation.json();
if (validationResult.success) {
  console.log('✅ Consulta válida');
  // Proceder a ejecutar
} else {
  console.error('❌ Error:', validationResult.error);
}
```

### 10. Plan de Ejecución
```javascript
// Analizar rendimiento antes de ejecutar
const explain = await fetch('http://localhost:8000/api/query/explain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      SELECT * FROM ventas v
      INNER JOIN productos p ON v.id_producto = p.id
      WHERE v.fecha_venta >= :fecha_inicio
    `,
    params: { 
      fecha_inicio: '2024-01-01' 
    }
  })
});

const plan = await explain.json();
console.log('Plan de ejecución:', plan.data);
```

### 11. Estadísticas de Tabla
```javascript
// Obtener estadísticas de una tabla
const stats = await fetch('http://localhost:8000/api/query/tables/usuarios/stats');
const tableStats = await stats.json();

console.log('Estadísticas de la tabla usuarios:', tableStats.data);
// Output incluye: num_rows, blocks, avg_row_len, last_analyzed, etc.
```

## Consultas de Reporte

### 12. Dashboard de Ventas
```javascript
// Reporte completo de ventas
const response = await fetch('http://localhost:8000/api/query/select', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      SELECT 
        'Ventas Hoy' as metrica,
        COUNT(*) as cantidad,
        SUM(total) as total_dinero
      FROM ventas 
      WHERE TRUNC(fecha_venta) = TRUNC(SYSDATE)
      
      UNION ALL
      
      SELECT 
        'Ventas Este Mes' as metrica,
        COUNT(*) as cantidad,
        SUM(total) as total_dinero
      FROM ventas 
      WHERE TRUNC(fecha_venta) >= TRUNC(SYSDATE, 'MM')
      
      UNION ALL
      
      SELECT 
        'Top Producto' as metrica,
        1 as cantidad,
        MAX(precio) as total_dinero
      FROM productos
      ORDER BY metrica
    `
  })
});
```

### 13. Análisis de Tendencias
```javascript
// Tendencias de los últimos 30 días
const response = await fetch('http://localhost:8000/api/query/select', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      SELECT 
        TRUNC(fecha_venta) as fecha,
        COUNT(*) as num_ventas,
        SUM(total) as total_dia,
        AVG(total) as promedio_venta,
        MIN(total) as venta_minima,
        MAX(total) as venta_maxima
      FROM ventas
      WHERE fecha_venta >= SYSDATE - 30
      GROUP BY TRUNC(fecha_venta)
      ORDER BY fecha DESC
    `
  })
});
```

## Gestión de Errores

### 14. Manejo de Errores
```javascript
async function ejecutarConsultaSegura(sql, params = {}) {
  try {
    const response = await fetch('http://localhost:8000/api/query/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ Consulta exitosa en ${result.executionTime}ms`);
      return result.data;
    } else {
      console.error('❌ Error en consulta:', result.error);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    throw error;
  }
}

// Uso
try {
  const usuarios = await ejecutarConsultaSegura(
    'SELECT * FROM usuarios WHERE activo = :activo',
    { activo: 1 }
  );
  console.log('Usuarios activos:', usuarios);
} catch (error) {
  console.error('No se pudieron obtener los usuarios:', error.message);
}
```

## Casos de Uso Típicos

### 15. Migración de Datos
```javascript
// Migrar datos entre tablas
const response = await fetch('http://localhost:8000/api/query/modify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      INSERT INTO usuarios_historico (
        id_usuario, nombre, email, fecha_creacion, fecha_migracion
      )
      SELECT 
        id, nombre, email, fecha_creacion, SYSDATE
      FROM usuarios 
      WHERE activo = 0 
        AND fecha_creacion < ADD_MONTHS(SYSDATE, -24)
    `
  })
});
```

### 16. Limpieza de Datos
```javascript
// Limpiar datos duplicados
const response = await fetch('http://localhost:8000/api/query/modify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sql: `
      DELETE FROM logs l1
      WHERE EXISTS (
        SELECT 1 FROM logs l2 
        WHERE l2.mensaje = l1.mensaje 
          AND l2.fecha_log = l1.fecha_log
          AND l2.id > l1.id
      )
    `
  })
});
```

## Información del Servicio

### 17. Estado del Servicio
```javascript
// Obtener información completa del servicio
const info = await fetch('http://localhost:8000/api/query/info');
const serviceInfo = await info.json();

console.log('Servicio de consultas:', serviceInfo);
// Incluye endpoints disponibles, configuración de seguridad, ejemplos, etc.
```

---

## 🔒 Buenas Prácticas de Seguridad

1. **Siempre usar parámetros bindables** `:parametro` en lugar de concatenación
2. **Validar consultas** antes de ejecutar en producción
3. **Limitar filas** usando `options.maxRows`
4. **No exponer credenciales** en las consultas
5. **Usar autoCommit: false** para consultas de solo lectura
6. **Monitorear tiempos de ejecución** para detectar consultas lentas

## 📊 Optimización de Rendimiento

1. **Usar EXPLAIN PLAN** para analizar consultas complejas
2. **Revisar estadísticas de tablas** regularmente
3. **Implementar índices** para consultas frecuentes
4. **Limitar resultados** con WHERE apropiados
5. **Usar el cache del servidor** para consultas repetitivas
