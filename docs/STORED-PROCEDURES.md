# Guía de Procedimientos Almacenados - DNO-Oracle

Esta guía explica cómo ejecutar procedimientos almacenados, funciones y manejar cursores con DNO-Oracle.

## 🎯 Funciones Disponibles

### `callProcedure(procedureName, params, opts)`

Ejecuta un procedimiento almacenado con parámetros IN, OUT o IN_OUT.

```javascript
import { callProcedure, oracledb } from "./src/db-improved.js";

// Procedimiento simple con parámetros IN
const result1 = await callProcedure('MI_PROCEDIMIENTO', {
  p_nombre: 'Juan',
  p_edad: 25
});

// Procedimiento con parámetros OUT
const result2 = await callProcedure('PROC_CALCULAR', {
  p_numero1: 10,
  p_numero2: 5,
  p_suma: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  p_producto: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
});

console.log("Suma:", result2.outBinds.p_suma);
console.log("Producto:", result2.outBinds.p_producto);
```

### `callFunction(functionName, params, returnType, opts)`

Ejecuta una función que retorna un valor.

```javascript
import { callFunction, oracledb } from "./src/db-improved.js";

const result = await callFunction('FUNC_SALUDAR', 
  { p_nombre: 'María' },
  { type: oracledb.STRING, maxSize: 200 }
);

console.log("Resultado:", result.returnValue);
```

### `callProcedureWithCursor(procedureName, params, opts)`

Ejecuta un procedimiento que retorna un REF CURSOR.

```javascript
import { callProcedureWithCursor } from "./src/db-improved.js";

const result = await callProcedureWithCursor('PROC_OBTENER_DATOS', {
  p_filtro: 'ACTIVO'
});

console.log(`Obtenidas ${result.rows.length} filas`);
result.rows.forEach(row => {
  console.log(row.NOMBRE, row.EMAIL);
});
```

## 📋 Tipos de Parámetros

### Parámetros IN (Entrada)
```javascript
// Forma simple
{ p_nombre: 'Juan' }

// Forma explícita
{ 
  p_nombre: { 
    val: 'Juan', 
    dir: oracledb.BIND_IN 
  } 
}
```

### Parámetros OUT (Salida)
```javascript
{
  p_resultado: { 
    dir: oracledb.BIND_OUT, 
    type: oracledb.NUMBER 
  }
}
```

### Parámetros IN_OUT (Entrada y Salida)
```javascript
{
  p_texto: { 
    val: 'texto inicial',
    dir: oracledb.BIND_INOUT, 
    type: oracledb.STRING,
    maxSize: 200
  }
}
```

### REF CURSOR
```javascript
{
  p_cursor: { 
    dir: oracledb.BIND_OUT, 
    type: oracledb.CURSOR 
  }
}
```

## 🔢 Tipos de Datos Soportados

| Tipo Oracle | Constante oracledb | Descripción |
|-------------|-------------------|-------------|
| NUMBER | `oracledb.NUMBER` | Números enteros y decimales |
| VARCHAR2 | `oracledb.STRING` | Cadenas de texto |
| DATE | `oracledb.DATE` | Fechas y tiempos |
| CLOB | `oracledb.CLOB` | Objetos de caracteres grandes |
| BLOB | `oracledb.BLOB` | Objetos binarios grandes |
| CURSOR | `oracledb.CURSOR` | Cursores de resultado |

## 📝 Ejemplos Completos

### 1. Procedimiento Simple

```sql
-- SQL: Crear procedimiento
CREATE OR REPLACE PROCEDURE SALUDAR(
  p_nombre IN VARCHAR2,
  p_mensaje IN VARCHAR2 DEFAULT 'Hola'
) AS
BEGIN
  DBMS_OUTPUT.PUT_LINE(p_mensaje || ' ' || p_nombre);
END;
```

```javascript
// JavaScript: Ejecutar procedimiento
const result = await callProcedure('SALUDAR', {
  p_nombre: 'Juan',
  p_mensaje: 'Bienvenido'
});
```

### 2. Procedimiento con Parámetros OUT

```sql
-- SQL: Crear procedimiento
CREATE OR REPLACE PROCEDURE CALCULAR(
  p_a IN NUMBER,
  p_b IN NUMBER,
  p_suma OUT NUMBER,
  p_producto OUT NUMBER
) AS
BEGIN
  p_suma := p_a + p_b;
  p_producto := p_a * p_b;
END;
```

```javascript
// JavaScript: Ejecutar y obtener resultados
const result = await callProcedure('CALCULAR', {
  p_a: 15,
  p_b: 3,
  p_suma: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  p_producto: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
});

console.log("Suma:", result.outBinds.p_suma);
console.log("Producto:", result.outBinds.p_producto);
```

### 3. Función con Valor de Retorno

```sql
-- SQL: Crear función
CREATE OR REPLACE FUNCTION CALCULAR_DESCUENTO(
  p_precio NUMBER,
  p_porcentaje NUMBER DEFAULT 10
) RETURN NUMBER AS
BEGIN
  RETURN p_precio * (1 - p_porcentaje/100);
END;
```

```javascript
// JavaScript: Ejecutar función
const result = await callFunction('CALCULAR_DESCUENTO',
  { p_precio: 100, p_porcentaje: 15 },
  { type: oracledb.NUMBER }
);

console.log("Precio con descuento:", result.returnValue);
```

### 4. Procedimiento con REF CURSOR

```sql
-- SQL: Crear procedimiento con cursor
CREATE OR REPLACE PROCEDURE OBTENER_EMPLEADOS(
  p_departamento IN VARCHAR2,
  p_cursor OUT SYS_REFCURSOR
) AS
BEGIN
  OPEN p_cursor FOR
    SELECT ID, NOMBRE, EMAIL, SALARIO
    FROM EMPLEADOS 
    WHERE DEPARTAMENTO = p_departamento
    ORDER BY NOMBRE;
END;
```

```javascript
// JavaScript: Ejecutar y procesar cursor
const result = await callProcedureWithCursor('OBTENER_EMPLEADOS', {
  p_departamento: 'IT'
});

console.log(`Encontrados ${result.rows.length} empleados:`);
result.rows.forEach(emp => {
  console.log(`${emp.NOMBRE} - ${emp.EMAIL} - $${emp.SALARIO}`);
});
```

### 5. Procedimiento con Parámetros IN_OUT

```sql
-- SQL: Crear procedimiento
CREATE OR REPLACE PROCEDURE FORMATEAR_NOMBRE(
  p_nombre IN OUT VARCHAR2,
  p_formato IN VARCHAR2 DEFAULT 'TITLE'
) AS
BEGIN
  CASE p_formato
    WHEN 'UPPER' THEN
      p_nombre := UPPER(p_nombre);
    WHEN 'LOWER' THEN
      p_nombre := LOWER(p_nombre);
    WHEN 'TITLE' THEN
      p_nombre := INITCAP(p_nombre);
  END CASE;
END;
```

```javascript
// JavaScript: Ejecutar con parámetro IN_OUT
const result = await callProcedure('FORMATEAR_NOMBRE', {
  p_nombre: { 
    val: 'juan pérez garcía',
    dir: oracledb.BIND_INOUT,
    type: oracledb.STRING,
    maxSize: 100
  },
  p_formato: 'TITLE'
});

console.log("Nombre formateado:", result.outBinds.p_nombre);
```

## ⚠️ Manejo de Errores

```javascript
try {
  const result = await callProcedure('MI_PROCEDIMIENTO', params);
  console.log("Éxito:", result);
} catch (error) {
  console.error("Error Oracle:", error.message);
  
  // Los errores incluyen información detallada:
  // - Mensaje de error Oracle
  // - SQL ejecutado
  // - Parámetros utilizados
  // - Stack trace completo
}
```

## 🔧 Opciones Avanzadas

### Configurar AutoCommit
```javascript
const result = await callProcedure('MI_PROC', params, {
  autoCommit: false  // Requerirá commit manual
});
```

### Trabajar con CLOB/BLOB
```javascript
const result = await callProcedure('PROC_CON_CLOB', {
  p_texto_grande: {
    val: textoMuyLargo,
    dir: oracledb.BIND_IN,
    type: oracledb.CLOB
  },
  p_resultado: {
    dir: oracledb.BIND_OUT,
    type: oracledb.CLOB
  }
});
```

## 🚀 Comandos de Prueba

```bash
# Ejecutar todos los ejemplos de procedimientos
./run.sh procedures

# Ejecutar pruebas básicas
./run.sh test

# Ver ayuda completa
./run.sh help
```

## 📚 Referencias Útiles

- [Oracle PL/SQL Documentation](https://docs.oracle.com/database/121/LNPLS/toc.htm)
- [node-oracledb Stored Procedures](https://oracle.github.io/node-oracledb/doc/api.html#plsqlexecution)
- [Oracle Data Types](https://docs.oracle.com/database/121/SQLRF/sql_elements001.htm)

---

**¡Ahora puedes ejecutar cualquier procedimiento almacenado de Oracle desde Deno!** 🎉
