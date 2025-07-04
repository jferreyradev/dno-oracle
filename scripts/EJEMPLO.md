# 📝 Ejemplo de Uso: Generador de Entidades Oracle

Este ejemplo muestra cómo usar el generador de configuración de entidades para una tabla Oracle típica.

## 🏗️ Tabla de Ejemplo

Supongamos que tienes una tabla `PRODUCTOS` con la siguiente estructura:

```sql
-- Tabla de productos
CREATE TABLE PRODUCTOS (
    ID_PRODUCTO NUMBER PRIMARY KEY,
    NOMBRE VARCHAR2(100) NOT NULL,
    DESCRIPCION VARCHAR2(500),
    PRECIO NUMBER(10,2) NOT NULL,
    STOCK NUMBER DEFAULT 0,
    CATEGORIA VARCHAR2(50),
    ACTIVO NUMBER(1) DEFAULT 1,
    FECHA_CREACION DATE DEFAULT SYSDATE,
    FECHA_ACTUALIZACION DATE,
    CONSTRAINT CHK_ACTIVO CHECK (ACTIVO IN (0,1))
);

-- Comentarios
COMMENT ON TABLE PRODUCTOS IS 'Catálogo de productos del sistema';
COMMENT ON COLUMN PRODUCTOS.ID_PRODUCTO IS 'Identificador único del producto';
COMMENT ON COLUMN PRODUCTOS.NOMBRE IS 'Nombre del producto';
COMMENT ON COLUMN PRODUCTOS.DESCRIPCION IS 'Descripción detallada del producto';
COMMENT ON COLUMN PRODUCTOS.PRECIO IS 'Precio unitario del producto';
COMMENT ON COLUMN PRODUCTOS.STOCK IS 'Cantidad disponible en inventario';
COMMENT ON COLUMN PRODUCTOS.CATEGORIA IS 'Categoría del producto';
COMMENT ON COLUMN PRODUCTOS.ACTIVO IS 'Indica si el producto está activo (1) o inactivo (0)';

-- Índices
CREATE INDEX IDX_PRODUCTOS_NOMBRE ON PRODUCTOS(NOMBRE);
CREATE INDEX IDX_PRODUCTOS_CATEGORIA ON PRODUCTOS(CATEGORIA);
CREATE INDEX IDX_PRODUCTOS_ACTIVO ON PRODUCTOS(ACTIVO);

-- Secuencia y trigger para auto-increment
CREATE SEQUENCE SEQ_PRODUCTOS START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER TRG_PRODUCTOS_ID
BEFORE INSERT ON PRODUCTOS
FOR EACH ROW
BEGIN
    IF :NEW.ID_PRODUCTO IS NULL THEN
        :NEW.ID_PRODUCTO := SEQ_PRODUCTOS.NEXTVAL;
    END IF;
END;
```

## 🚀 Uso del Generador

### Paso 1: Configurar el entorno

```bash
# Crear archivo .env con tu configuración
cp .env.example .env

# Editar .env con tus credenciales
USER=tu_usuario
PASSWORD=tu_password
CONNECTIONSTRING=localhost:1521/XE
LIB_ORA=C:/oracle/instantclient_19_8
```

### Paso 2: Generar la configuración

```powershell
# Generar configuración para la tabla PRODUCTOS
.\generate-entity.ps1 -Tabla "PRODUCTOS" -Entidad "productos"
```

### Paso 3: Resultado esperado

El generador producirá una configuración similar a esta:

```json
{
  "productos": {
    "tableName": "PRODUCTOS",
    "primaryKey": "ID_PRODUCTO",
    "autoIncrement": true,
    "displayName": "Productos",
    "description": "Catálogo de productos del sistema",
    "fields": {
      "ID_PRODUCTO": {
        "type": "NUMBER",
        "required": true,
        "primaryKey": true,
        "autoIncrement": true,
        "displayName": "ID Producto",
        "description": "Identificador único del producto",
        "readonly": true
      },
      "NOMBRE": {
        "type": "VARCHAR2",
        "length": 100,
        "required": true,
        "displayName": "Nombre",
        "description": "Nombre del producto",
        "searchable": true
      },
      "DESCRIPCION": {
        "type": "VARCHAR2",
        "length": 500,
        "required": false,
        "displayName": "Descripción",
        "description": "Descripción detallada del producto",
        "searchable": true
      },
      "PRECIO": {
        "type": "NUMBER",
        "precision": 10,
        "scale": 2,
        "required": true,
        "displayName": "Precio",
        "description": "Precio unitario del producto"
      },
      "STOCK": {
        "type": "NUMBER",
        "required": false,
        "default": "0",
        "displayName": "Stock",
        "description": "Cantidad disponible en inventario"
      },
      "CATEGORIA": {
        "type": "VARCHAR2",
        "length": 50,
        "required": false,
        "displayName": "Categoría",
        "description": "Categoría del producto",
        "searchable": true
      },
      "ACTIVO": {
        "type": "NUMBER",
        "required": false,
        "default": "1",
        "displayName": "Activo",
        "description": "Indica si el producto está activo (1) o inactivo (0)"
      },
      "FECHA_CREACION": {
        "type": "DATE",
        "required": false,
        "readonly": true,
        "displayName": "Fecha Creación",
        "description": "Campo Fecha Creación"
      },
      "FECHA_ACTUALIZACION": {
        "type": "DATE",
        "required": false,
        "readonly": true,
        "displayName": "Fecha Actualización",
        "description": "Campo Fecha Actualización"
      }
    },
    "operations": {
      "create": true,
      "read": true,
      "update": true,
      "delete": true,
      "search": true,
      "paginate": true
    },
    "filters": {
      "active": {
        "field": "ACTIVO",
        "operator": "=",
        "value": 1,
        "displayName": "Solo activos"
      },
      "inactive": {
        "field": "ACTIVO",
        "operator": "=",
        "value": 0,
        "displayName": "Solo inactivos"
      }
    },
    "validations": {
      "NOMBRE": {
        "required": true,
        "maxLength": 100,
        "message": "Validación para Nombre"
      },
      "DESCRIPCION": {
        "maxLength": 500,
        "message": "Validación para Descripción"
      },
      "PRECIO": {
        "required": true,
        "message": "Validación para Precio"
      },
      "CATEGORIA": {
        "maxLength": 50,
        "message": "Validación para Categoría"
      },
      "ACTIVO": {
        "allowedValues": [0, 1],
        "message": "Validación para Activo"
      }
    },
    "customActions": {
      "toggle-activo": {
        "type": "UPDATE",
        "sql": "UPDATE PRODUCTOS SET ACTIVO = CASE WHEN ACTIVO = 1 THEN 0 ELSE 1 END WHERE ID_PRODUCTO = :id",
        "displayName": "Cambiar Activo",
        "description": "Cambia el estado de Activo"
      },
      "activate": {
        "type": "UPDATE",
        "sql": "UPDATE PRODUCTOS SET ACTIVO = 1 WHERE ID_PRODUCTO = :id",
        "displayName": "Activar",
        "description": "Activa el registro"
      },
      "deactivate": {
        "type": "UPDATE",
        "sql": "UPDATE PRODUCTOS SET ACTIVO = 0 WHERE ID_PRODUCTO = :id",
        "displayName": "Desactivar",
        "description": "Desactiva el registro"
      }
    }
  }
}
```

## 📋 Paso 4: Personalización

Una vez generada la configuración, puedes personalizarla:

### Agregar validaciones específicas

```json
"validations": {
  "NOMBRE": {
    "required": true,
    "maxLength": 100,
    "minLength": 3,
    "message": "El nombre debe tener entre 3 y 100 caracteres"
  },
  "PRECIO": {
    "required": true,
    "min": 0,
    "message": "El precio debe ser mayor a 0"
  },
  "STOCK": {
    "min": 0,
    "message": "El stock no puede ser negativo"
  }
}
```

### Personalizar filtros

```json
"filters": {
  "active": {
    "field": "ACTIVO",
    "operator": "=",
    "value": 1,
    "displayName": "Solo activos"
  },
  "low-stock": {
    "field": "STOCK",
    "operator": "<=",
    "value": 10,
    "displayName": "Stock bajo"
  },
  "expensive": {
    "field": "PRECIO",
    "operator": ">=",
    "value": 100,
    "displayName": "Productos caros"
  }
}
```

### Agregar acciones personalizadas

```json
"customActions": {
  "replenish-stock": {
    "type": "UPDATE",
    "sql": "UPDATE PRODUCTOS SET STOCK = STOCK + :quantity WHERE ID_PRODUCTO = :id",
    "displayName": "Reponer Stock",
    "description": "Aumenta el stock del producto"
  },
  "apply-discount": {
    "type": "UPDATE",
    "sql": "UPDATE PRODUCTOS SET PRECIO = PRECIO * (1 - :discount/100) WHERE ID_PRODUCTO = :id",
    "displayName": "Aplicar Descuento",
    "description": "Aplica un descuento al precio"
  }
}
```

## 🔧 Paso 5: Integración

### Agregar automáticamente a entities.json

```powershell
# Agregar la configuración directamente al archivo entities.json
.\generate-entity.ps1 -Tabla "PRODUCTOS" -Entidad "productos" -Agregar
```

### Verificar la configuración

```bash
# Iniciar el servidor para probar
.\run-enhanced.ps1

# Verificar endpoints generados
curl http://localhost:8080/api/productos
curl http://localhost:8080/api/productos/1
```

## 🎯 Casos de Uso Avanzados

### Tablas con schemas específicos

```powershell
.\generate-entity.ps1 -Tabla "VENTAS.PRODUCTOS" -Entidad "productos_ventas"
```

### Tablas con muchas columnas

```powershell
# Guardar en archivo para revisión
.\generate-entity.ps1 -Tabla "TABLA_COMPLEJA" -Archivo "tabla-compleja.json"
```

### Múltiples tablas

```powershell
# Generar para varias tablas
.\generate-entity.ps1 -Tabla "PRODUCTOS" -Entidad "productos" -Agregar
.\generate-entity.ps1 -Tabla "CATEGORIAS" -Entidad "categorias" -Agregar
.\generate-entity.ps1 -Tabla "CLIENTES" -Entidad "clientes" -Agregar
```

## 🛠️ Troubleshooting

### Problema: "Tabla no encontrada"

```sql
-- Verificar que la tabla existe
SELECT * FROM USER_TABLES WHERE TABLE_NAME = 'PRODUCTOS';

-- Verificar permisos
SELECT * FROM USER_TAB_PRIVS WHERE TABLE_NAME = 'PRODUCTOS';
```

### Problema: "Conexión fallida"

```bash
# Verificar conexión
sqlplus usuario/password@conexion

# Verificar variables de entorno
echo $USER
echo $CONNECTIONSTRING
```

### Problema: "Oracle Client no encontrado"

```bash
# Verificar instalación
echo $LIB_ORA
ls -la $LIB_ORA
```

## 📈 Resultados Esperados

Después de usar el generador, tendrás:

✅ **Configuración completa** de la entidad
✅ **Validaciones automáticas** basadas en constraints
✅ **Filtros inteligentes** según los tipos de datos
✅ **Acciones personalizadas** para campos comunes
✅ **API REST completa** funcionando

## 🎉 ¡Listo!

Una vez completado, tu tabla estará completamente integrada en el sistema DNO-Oracle con una API REST funcional y todas las operaciones CRUD disponibles.

---

💡 **Consejo**: Siempre revisa la configuración generada antes de usarla en producción y ajústala según las necesidades específicas de tu aplicación.
