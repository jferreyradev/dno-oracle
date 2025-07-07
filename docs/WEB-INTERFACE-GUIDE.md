# 🌐 Interfaz Web DNO-Oracle

Sistema de gestión de datos Oracle con interfaz web moderna y intuitiva.

## 🚀 Características Principales

### 📤 **Importación de Archivos CSV**
- **Drag & Drop**: Arrastra archivos CSV directamente a la interfaz
- **Validación automática**: Verifica la estructura y formato de los datos
- **Mapeo inteligente**: Mapeo automático de columnas CSV a tablas Oracle
- **Vista previa**: Revisa los datos antes de importar
- **Importación por lotes**: Procesa grandes volúmenes de datos eficientemente
- **Manejo de errores**: Continúa la importación aunque algunos registros fallen

### 🗂️ **Gestión de Tablas**
- **Vista de tablas**: Explora todas las tablas disponibles
- **Información detallada**: Consulta columnas, tipos de datos y estructura
- **Búsqueda rápida**: Encuentra tablas por nombre
- **Estadísticas**: Información sobre registros y rendimiento

### 🔍 **Consultas SQL Interactivas**
- **Editor SQL**: Editor con sintaxis highlighting
- **Ejecución directa**: Ejecuta consultas SELECT, INSERT, UPDATE, DELETE
- **Plan de ejecución**: Analiza el rendimiento de las consultas
- **Validación**: Verifica la sintaxis antes de ejecutar
- **Resultados tabulares**: Visualiza resultados en formato tabla

### ⚙️ **Procedimientos Almacenados**
- **Ejecución flexible**: Ejecuta procedimientos con parámetros
- **Información detallada**: Consulta definición y parámetros
- **Formato JSON**: Parámetros en formato JSON fácil de usar
- **Resultados estructurados**: Visualiza resultados de forma organizada

## 🎨 Interfaz Moderna

### **Diseño Responsivo**
- Compatible con dispositivos móviles
- Adaptable a diferentes tamaños de pantalla
- Navegación intuitiva con pestañas

### **Experiencia de Usuario**
- **Notificaciones Toast**: Feedback inmediato de las acciones
- **Indicadores de carga**: Loading spinners para operaciones largas
- **Estado de conexión**: Monitor del estado del servidor en tiempo real
- **Temas visuales**: Gradientes modernos y efectos glass

### **Características Técnicas**
- **SPA (Single Page Application)**: Navegación sin recargas
- **API REST**: Comunicación eficiente con el backend
- **Manejo de errores**: Gestión robusta de errores y excepciones
- **Cache inteligente**: Optimización de rendimiento

## 🛠️ Instalación y Uso

### **Requisitos Previos**
- Deno 1.36+ instalado
- Base de datos Oracle configurada
- Variables de entorno configuradas (`.env`)

### **Inicio Rápido**

1. **Clonar e instalar:**
```bash
git clone <repository>
cd dno-oracle
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus credenciales de Oracle
```

3. **Iniciar interfaz web:**
```powershell
# Opción 1: Script PowerShell (recomendado)
.\start-web-interface.ps1 -OpenBrowser

# Opción 2: Comando directo
deno run --allow-all api/server-enhanced.ts
```

4. **Acceder a la interfaz:**
```
http://localhost:8000
```

### **Scripts Disponibles**

```powershell
# Iniciar con navegador automático
.\start-web-interface.ps1 -OpenBrowser

# Usar puerto personalizado
.\start-web-interface.ps1 -Port 8080

# Ver ayuda
.\start-web-interface.ps1 -Help
```

## 📱 Guía de Uso

### **1. Importación de Archivos**

1. **Seleccionar archivo:**
   - Arrastra un archivo CSV a la zona de subida
   - O haz clic para seleccionar desde el explorador

2. **Configurar importación:**
   - Selecciona la tabla de destino
   - Configura opciones (omitir primera fila, validar solo, etc.)
   - Ajusta el tamaño de lote según el rendimiento

3. **Mapear columnas:**
   - Usa el mapeo automático para columnas con nombres similares
   - Ajusta manualmente las correspondencias
   - Omite columnas que no necesites importar

4. **Ejecutar importación:**
   - **Vista previa**: Revisa una muestra de los datos
   - **Validar**: Verifica la estructura sin importar
   - **Importar**: Ejecuta la importación completa

### **2. Gestión de Tablas**

1. **Explorar tablas:**
   - Usa la barra de búsqueda para filtrar
   - Haz clic en "Ver Datos" para consultar registros
   - Usa "Columnas" para ver la estructura

2. **Información detallada:**
   - Tipos de datos de cada columna
   - Restricciones y valores por defecto
   - Estadísticas de la tabla

### **3. Consultas SQL**

1. **Escribir consulta:**
   - Usa el editor SQL con sintaxis highlighting
   - Escribe consultas SELECT, INSERT, UPDATE, DELETE

2. **Ejecutar:**
   - **Ejecutar**: Corre la consulta y muestra resultados
   - **Explicar**: Obtiene el plan de ejecución
   - **Validar**: Verifica la sintaxis sin ejecutar

3. **Resultados:**
   - Tabla navegable con todos los resultados
   - Información de tiempo de ejecución
   - Metadatos de las columnas

### **4. Procedimientos Almacenados**

1. **Especificar procedimiento:**
   - Nombre completo del procedimiento (SCHEMA.PROCEDURE)
   - Parámetros en formato JSON

2. **Ejemplo de parámetros:**
```json
{
  "param1": "valor1",
  "param2": 123,
  "param3": "2024-01-01"
}
```

3. **Ejecutar y revisar resultados:**
   - Valores de retorno
   - Parámetros de salida
   - Mensajes del procedimiento

## 🔧 Configuración Avanzada

### **Variables de Entorno**
```env
ORACLE_USER=tu_usuario
ORACLE_PASSWORD=tu_password
ORACLE_CONNECTION_STRING=localhost:1521/XE
```

### **Configuración de Entidades**
Edita `config/entities.json` para agregar nuevas tablas:

```json
{
  "entities": {
    "mi_tabla": {
      "tableName": "SCHEMA.MI_TABLA",
      "primaryKey": "ID",
      "columns": {
        "ID": { "type": "NUMBER", "required": true },
        "NOMBRE": { "type": "VARCHAR2", "length": 100 }
      }
    }
  }
}
```

## 🚨 Solución de Problemas

### **Problemas Comunes**

**Error de conexión a Oracle:**
- Verifica las credenciales en `.env`
- Asegúrate de que Oracle esté ejecutándose
- Revisa la cadena de conexión

**Puerto en uso:**
- Usa el script PowerShell que automáticamente libera el puerto
- O especifica un puerto diferente con `-Port`

**Archivos no encontrados:**
- Ejecuta el script desde el directorio raíz del proyecto
- Verifica que todas las carpetas estén presentes

### **Logs y Debugging**

El servidor muestra logs detallados en la consola:
- ✅ Operaciones exitosas
- ❌ Errores con detalles
- 📊 Estadísticas de rendimiento
- 🔍 Información de debugging

## 🎯 Casos de Uso

### **Migración de Datos**
1. Exporta datos desde Excel/CSV
2. Usa la interfaz para validar y mapear columnas
3. Ejecuta importación por lotes
4. Verifica resultados con consultas SQL

### **Administración de Base de Datos**
1. Explora tablas y estructuras
2. Ejecuta consultas de mantenimiento
3. Ejecuta procedimientos de administración
4. Monitorea rendimiento con estadísticas

### **Desarrollo y Testing**
1. Prueba consultas SQL rápidamente
2. Valida datos de prueba
3. Ejecuta procedimientos con diferentes parámetros
4. Analiza planes de ejecución

## 🌟 Características Técnicas

### **Backend (Deno + TypeScript)**
- **Framework**: Oak.js para el servidor HTTP
- **ORM**: Driver nativo de Oracle
- **Cache**: Sistema de cache en memoria
- **Validación**: Validación robusta de datos
- **Manejo de errores**: Gestión centralizada de excepciones

### **Frontend (HTML5 + CSS3 + JavaScript)**
- **Responsive Design**: Bootstrap-inspired grid system
- **Modern CSS**: CSS Grid, Flexbox, Variables
- **Vanilla JavaScript**: Sin dependencias externas
- **Fetch API**: Comunicación asíncrona con el backend
- **File API**: Manejo nativo de archivos

### **Seguridad**
- **CORS**: Configuración segura de CORS
- **Validación**: Validación tanto en cliente como servidor
- **Sanitización**: Limpieza de inputs SQL
- **Error Handling**: No exposición de información sensible

## 📚 API Endpoints

La interfaz web consume estos endpoints REST:

### **Importación**
- `POST /api/import/csv` - Importar archivo CSV
- `POST /api/import/validate` - Validar archivo
- `POST /api/import/headers` - Parsear headers
- `POST /api/import/mapping` - Generar mapeo automático
- `GET /api/import/columns/:table` - Obtener columnas de tabla

### **Consultas**
- `POST /api/query` - Ejecutar consulta SQL
- `POST /api/query/explain` - Obtener plan de ejecución
- `POST /api/query/validate` - Validar consulta

### **Procedimientos**
- `POST /api/procedures/execute` - Ejecutar procedimiento
- `GET /api/procedures/info/:name` - Información del procedimiento

### **Sistema**
- `GET /api/health` - Estado del servidor
- `GET /api/info` - Información del sistema
- `GET /api/cache/stats` - Estadísticas de cache

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork del repositorio
2. Crea una rama para tu feature
3. Implementa cambios con tests
4. Envía pull request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

---

**¡Disfruta usando DNO-Oracle! 🚀**
