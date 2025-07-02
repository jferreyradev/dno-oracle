-- Script para crear tabla de usuarios de ejemplo
-- Ejecutar en la base de datos Oracle para probar la API

-- Crear tabla de usuarios
CREATE TABLE users (
    user_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR2(50) NOT NULL UNIQUE,
    email VARCHAR2(100) NOT NULL UNIQUE,
    full_name VARCHAR2(100),
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_is_active CHECK (is_active IN (0, 1))
);

-- Crear índices
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;
/

-- Insertar datos de ejemplo
INSERT INTO users (username, email, full_name, is_active) VALUES
    ('admin', 'admin@example.com', 'Administrador', 1);
    
INSERT INTO users (username, email, full_name, is_active) VALUES
    ('usuario1', 'usuario1@example.com', 'Usuario Uno', 1);
    
INSERT INTO users (username, email, full_name, is_active) VALUES
    ('usuario2', 'usuario2@example.com', 'Usuario Dos', 1);
    
INSERT INTO users (username, email, full_name, is_active) VALUES
    ('inactive', 'inactive@example.com', 'Usuario Inactivo', 0);

COMMIT;

-- Verificar datos insertados
SELECT 
    user_id,
    username,
    email,
    full_name,
    CASE WHEN is_active = 1 THEN 'Activo' ELSE 'Inactivo' END as status,
    created_at
FROM users
ORDER BY user_id;

-- Mostrar información de la tabla
SELECT 
    column_name,
    data_type,
    nullable,
    data_default
FROM user_tab_columns 
WHERE table_name = 'USERS'
ORDER BY column_id;
