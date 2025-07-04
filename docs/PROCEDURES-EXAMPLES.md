# 🚀 Procedimientos Almacenados - Ejemplos de Uso

Este documento muestra cómo usar la API para ejecutar procedimientos almacenados y funciones de Oracle.

## 📋 Endpoints Disponibles

### 1. **POST /api/procedures/call** - Ejecutar Procedimiento Básico

Ejecuta un procedimiento almacenado con parámetros de entrada y salida.

```bash
curl -X POST http://localhost:8000/api/procedures/call \
  -H "Content-Type: application/json" \
  -d '{
    "procedureName": "WORKFLOW.UPDATE_STATUS",
    "params": {
      "id": 123,
      "new_status": "COMPLETED",
      "result_message": { "dir": "OUT", "type": "STRING" }
    }
  }'
```

### 2. **POST /api/procedures/function** - Ejecutar Función

Ejecuta una función almacenada que retorna un valor.

```bash
curl -X POST http://localhost:8000/api/procedures/function \
  -H "Content-Type: application/json" \
  -d '{
    "functionName": "WORKFLOW.CALCULATE_TOTAL",
    "params": {
      "amount": 1000,
      "tax_rate": 0.21
    },
    "returnType": { "type": "NUMBER" }
  }'
```

### 3. **POST /api/procedures/cursor** - Procedimiento con Cursor

Ejecuta un procedimiento que retorna un REF CURSOR con datos.

```bash
curl -X POST http://localhost:8000/api/procedures/cursor \
  -H "Content-Type: application/json" \
  -d '{
    "procedureName": "WORKFLOW.GET_USER_REPORTS",
    "params": {
      "user_id": 123,
      "start_date": "2024-01-01",
      "end_date": "2024-12-31"
    }
  }'
```

### 4. **GET /api/procedures/list** - Listar Procedimientos

Lista todos los procedimientos y funciones disponibles.

```bash
# Listar todos
curl http://localhost:8000/api/procedures/list

# Filtrar por esquema
curl "http://localhost:8000/api/procedures/list?owner=WORKFLOW"

# Filtrar por tipo
curl "http://localhost:8000/api/procedures/list?type=PROCEDURE"
```

### 5. **GET /api/procedures/info/:name** - Información Detallada

Obtiene información detallada de un procedimiento específico.

```bash
curl "http://localhost:8000/api/procedures/info/UPDATE_STATUS?owner=WORKFLOW"
```

### 6. **GET /api/procedures/help** - Documentación

Obtiene la documentación completa de la API.

```bash
curl http://localhost:8000/api/procedures/help
```

## 🔧 Tipos de Parámetros

### Parámetros de Entrada (IN)
```json
{
  "param_name": "valor_directo"
}
```

### Parámetros de Salida (OUT)
```json
{
  "param_name": {
    "dir": "OUT",
    "type": "STRING"
  }
}
```

### Parámetros de Entrada/Salida (IN/OUT)
```json
{
  "param_name": {
    "val": "valor_inicial",
    "dir": "IN_OUT",
    "type": "STRING"
  }
}
```

## 📊 Tipos de Datos Soportados

| Tipo Oracle | Ejemplo |
|-------------|---------|
| STRING | `{ "type": "STRING" }` |
| NUMBER | `{ "type": "NUMBER" }` |
| DATE | `{ "type": "DATE" }` |
| TIMESTAMP | `{ "type": "TIMESTAMP" }` |
| CLOB | `{ "type": "CLOB" }` |
| BLOB | `{ "type": "BLOB" }` |

## 💡 Ejemplos Prácticos

### Ejemplo 1: Actualizar Estado de Proceso

```javascript
const response = await fetch('/api/procedures/call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    procedureName: 'WORKFLOW.UPDATE_PROCESS_STATUS',
    params: {
      process_id: 12345,
      new_status: 'COMPLETED',
      updated_by: 'user123',
      result_code: { dir: 'OUT', type: 'NUMBER' },
      result_message: { dir: 'OUT', type: 'STRING' }
    }
  })
});

const result = await response.json();
console.log('Resultado:', result.data.outBinds);
```

### Ejemplo 2: Calcular Impuestos

```javascript
const response = await fetch('/api/procedures/function', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    functionName: 'FDOESTIMULO.CALCULATE_TAX',
    params: {
      base_amount: 10000,
      tax_rate: 0.21,
      region_code: 'AR'
    },
    returnType: { type: 'NUMBER' }
  })
});

const result = await response.json();
console.log('Impuesto calculado:', result.data.returnValue);
```

### Ejemplo 3: Obtener Reportes con Cursor

```javascript
const response = await fetch('/api/procedures/cursor', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    procedureName: 'FDOESTIMULO.GET_MONTHLY_REPORT',
    params: {
      year: 2024,
      month: 12
    }
  })
});

const result = await response.json();
console.log('Reportes:', result.data.rows);
console.log('Total de registros:', result.data.rowsAffected);
```

## 🔄 Ejemplos con JavaScript/Node.js

```javascript
class OracleProcedureClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async callProcedure(procedureName, params, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/procedures/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procedureName,
        params,
        options
      })
    });

    if (!response.ok) {
      throw new Error(`Error calling procedure: ${response.statusText}`);
    }

    return await response.json();
  }

  async callFunction(functionName, params, returnType = { type: 'STRING' }) {
    const response = await fetch(`${this.baseUrl}/api/procedures/function`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        functionName,
        params,
        returnType
      })
    });

    if (!response.ok) {
      throw new Error(`Error calling function: ${response.statusText}`);
    }

    return await response.json();
  }

  async getProcedureWithCursor(procedureName, params) {
    const response = await fetch(`${this.baseUrl}/api/procedures/cursor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procedureName,
        params
      })
    });

    if (!response.ok) {
      throw new Error(`Error calling procedure with cursor: ${response.statusText}`);
    }

    return await response.json();
  }

  async listProcedures(owner = null, type = 'ALL') {
    const params = new URLSearchParams();
    if (owner) params.append('owner', owner);
    if (type !== 'ALL') params.append('type', type);

    const response = await fetch(`${this.baseUrl}/api/procedures/list?${params}`);
    
    if (!response.ok) {
      throw new Error(`Error listing procedures: ${response.statusText}`);
    }

    return await response.json();
  }
}

// Uso del cliente
const client = new OracleProcedureClient('http://localhost:8000');

// Ejemplo de uso
async function examples() {
  try {
    // Llamar procedimiento
    const procResult = await client.callProcedure('WORKFLOW.UPDATE_STATUS', {
      id: 123,
      status: 'ACTIVE',
      result: { dir: 'OUT', type: 'STRING' }
    });
    
    console.log('Procedimiento ejecutado:', procResult);

    // Llamar función
    const funcResult = await client.callFunction('CALC_TAX', {
      amount: 1000
    }, { type: 'NUMBER' });
    
    console.log('Función ejecutada:', funcResult);

    // Listar procedimientos
    const procedures = await client.listProcedures('WORKFLOW');
    console.log('Procedimientos disponibles:', procedures);

  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

## 🐍 Ejemplo con Python

```python
import requests
import json

class OracleProcedureClient:
    def __init__(self, base_url):
        self.base_url = base_url

    def call_procedure(self, procedure_name, params, options=None):
        url = f"{self.base_url}/api/procedures/call"
        data = {
            "procedureName": procedure_name,
            "params": params,
            "options": options or {}
        }
        
        response = requests.post(url, json=data)
        response.raise_for_status()
        return response.json()

    def call_function(self, function_name, params, return_type=None):
        url = f"{self.base_url}/api/procedures/function"
        data = {
            "functionName": function_name,
            "params": params,
            "returnType": return_type or {"type": "STRING"}
        }
        
        response = requests.post(url, json=data)
        response.raise_for_status()
        return response.json()

    def get_procedure_with_cursor(self, procedure_name, params):
        url = f"{self.base_url}/api/procedures/cursor"
        data = {
            "procedureName": procedure_name,
            "params": params
        }
        
        response = requests.post(url, json=data)
        response.raise_for_status()
        return response.json()

    def list_procedures(self, owner=None, proc_type="ALL"):
        url = f"{self.base_url}/api/procedures/list"
        params = {}
        if owner:
            params["owner"] = owner
        if proc_type != "ALL":
            params["type"] = proc_type
            
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

# Ejemplo de uso
client = OracleProcedureClient("http://localhost:8000")

# Ejecutar procedimiento
result = client.call_procedure("WORKFLOW.UPDATE_STATUS", {
    "id": 123,
    "status": "ACTIVE",
    "result": {"dir": "OUT", "type": "STRING"}
})

print("Resultado del procedimiento:", result["data"]["outBinds"])

# Ejecutar función
func_result = client.call_function("CALC_TOTAL", {
    "amount": 1000,
    "tax_rate": 0.21
}, {"type": "NUMBER"})

print("Resultado de la función:", func_result["data"]["returnValue"])
```

## 🔧 Manejo de Errores

### Errores Comunes

1. **Procedimiento no encontrado**
```json
{
  "success": false,
  "message": "Error ejecutando procedimiento",
  "error": "ORA-00942: table or view does not exist"
}
```

2. **Parámetros incorrectos**
```json
{
  "success": false,
  "message": "Error ejecutando procedimiento",
  "error": "ORA-06550: wrong number or types of arguments"
}
```

3. **Error de permisos**
```json
{
  "success": false,
  "message": "Error ejecutando procedimiento", 
  "error": "ORA-01031: insufficient privileges"
}
```

### Buenas Prácticas

1. **Siempre validar parámetros** antes de enviar la solicitud
2. **Usar tipos de datos apropiados** para cada parámetro
3. **Manejar errores de manera adecuada** en el cliente
4. **Verificar permisos** del usuario antes de ejecutar procedimientos
5. **Usar transacciones** cuando sea necesario con `autoCommit: false`

## 📈 Monitoreo y Logs

El servidor registra automáticamente:
- Nombre del procedimiento/función ejecutado
- Parámetros enviados
- Tiempo de ejecución
- Resultados obtenidos
- Errores si ocurren

Los logs aparecen en la consola del servidor para facilitar el debugging.
