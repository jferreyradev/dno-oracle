-- Script para crear tabla de logs y datos de ejemplo (Compatible con Oracle 11g)
-- Ejecutar en la base de datos Oracle para probar la API

-- Crear secuencia para system_logs
CREATE SEQUENCE seq_system_logs
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- Crear tabla de logs de sistema (Oracle 11g compatible)
CREATE TABLE system_logs (
    log_id NUMBER NOT NULL PRIMARY KEY,
    log_level VARCHAR2(10) NOT NULL,
    module VARCHAR2(50) NOT NULL,
    message CLOB NOT NULL,
    user_id NUMBER,
    ip_address VARCHAR2(45),
    user_agent VARCHAR2(500),
    request_data CLOB,
    response_status NUMBER,
    execution_time_ms NUMBER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_date DATE DEFAULT TRUNC(SYSDATE),
    CONSTRAINT chk_log_level CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
    CONSTRAINT chk_response_status CHECK (response_status BETWEEN 100 AND 599)
);

-- Trigger para auto-incrementar log_id
CREATE OR REPLACE TRIGGER trg_system_logs_id
    BEFORE INSERT ON system_logs
    FOR EACH ROW
BEGIN
    IF :NEW.log_id IS NULL THEN
        SELECT seq_system_logs.NEXTVAL INTO :NEW.log_id FROM dual;
    END IF;
    -- Actualizar created_date basado en created_at si está especificado
    IF :NEW.created_at IS NOT NULL THEN
        :NEW.created_date := TRUNC(:NEW.created_at);
    END IF;
END;

-- Crear índices para optimizar consultas
CREATE INDEX idx_logs_level ON system_logs(log_level);
CREATE INDEX idx_logs_module ON system_logs(module);
CREATE INDEX idx_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_logs_created_date ON system_logs(created_date);
CREATE INDEX idx_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_logs_status ON system_logs(response_status);

-- Crear secuencia para users
CREATE SEQUENCE seq_users
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- Crear tabla de usuarios para referenciar en los logs (Oracle 11g compatible)
CREATE TABLE users (
    user_id NUMBER NOT NULL PRIMARY KEY,
    username VARCHAR2(50) NOT NULL UNIQUE,
    email VARCHAR2(100) NOT NULL UNIQUE,
    full_name VARCHAR2(100),
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_is_active CHECK (is_active IN (0, 1))
);

-- Crear índices para usuarios
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- Trigger para auto-incrementar user_id
CREATE OR REPLACE TRIGGER trg_users_id
    BEFORE INSERT ON users
    FOR EACH ROW
BEGIN
    IF :NEW.user_id IS NULL THEN
        SELECT seq_users.NEXTVAL INTO :NEW.user_id FROM dual;
    END IF;
END;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;

-- Insertar usuarios de ejemplo
INSERT INTO users (username, email, full_name, is_active) VALUES
    ('admin', 'admin@example.com', 'Administrador Sistema', 1);
    
INSERT INTO users (username, email, full_name, is_active) VALUES
    ('jferreyra', 'jferreyra@example.com', 'Juan Ferreyra', 1);
    
INSERT INTO users (username, email, full_name, is_active) VALUES
    ('testuser', 'test@example.com', 'Usuario de Prueba', 1);
    
INSERT INTO users (username, email, full_name, is_active) VALUES
    ('apiuser', 'api@example.com', 'Usuario API', 1);

INSERT INTO users (username, email, full_name, is_active) VALUES
    ('inactive', 'inactive@example.com', 'Usuario Inactivo', 0);

-- Insertar logs de ejemplo
INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms) VALUES
    ('INFO', 'AUTH', 'Usuario autenticado correctamente', 1, '192.168.1.100', 200, 45);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms) VALUES
    ('ERROR', 'DATABASE', 'Error de conexión a la base de datos', NULL, '192.168.1.101', 500, 1200);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms) VALUES
    ('WARN', 'API', 'Rate limit alcanzado para usuario', 2, '10.0.0.50', 429, 5);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms) VALUES
    ('INFO', 'QUERY', 'Consulta SQL ejecutada', 2, '192.168.1.100', 200, 234);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms) VALUES
    ('DEBUG', 'CACHE', 'Cache actualizado correctamente', NULL, '127.0.0.1', 200, 12);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms) VALUES
    ('FATAL', 'SYSTEM', 'Error crítico del sistema', NULL, '192.168.1.1', 500, 5000);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms) VALUES
    ('INFO', 'USER', 'Nuevo usuario registrado', 3, '203.0.113.45', 201, 89);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms) VALUES
    ('ERROR', 'VALIDATION', 'Datos de entrada inválidos', 4, '198.51.100.25', 400, 15);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms) VALUES
    ('INFO', 'BACKUP', 'Backup completado exitosamente', NULL, '10.0.0.1', 200, 45000);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms) VALUES
    ('WARN', 'DISK', 'Espacio en disco bajo (85% utilizado)', NULL, '127.0.0.1', 200, 8);

-- Insertar más logs con fechas variadas
INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms, created_at) VALUES
    ('INFO', 'LOGIN', 'Usuario inició sesión', 1, '192.168.1.100', 200, 67, CURRENT_TIMESTAMP - INTERVAL '1' DAY);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms, created_at) VALUES
    ('ERROR', 'API', 'Endpoint no encontrado', NULL, '203.0.113.195', 404, 3, CURRENT_TIMESTAMP - INTERVAL '2' HOUR);

INSERT INTO system_logs (log_level, module, message, user_id, ip_address, response_status, execution_time_ms, created_at) VALUES
    ('INFO', 'PROCEDURE', 'Procedimiento almacenado ejecutado', 2, '192.168.1.100', 200, 456, CURRENT_TIMESTAMP - INTERVAL '30' MINUTE);

COMMIT;

-- Procedimiento almacenado para crear logs
CREATE OR REPLACE PROCEDURE create_log(
    p_level VARCHAR2,
    p_module VARCHAR2,
    p_message CLOB,
    p_user_id NUMBER DEFAULT NULL,
    p_ip_address VARCHAR2 DEFAULT NULL,
    p_response_status NUMBER DEFAULT NULL,
    p_execution_time NUMBER DEFAULT NULL
) AS
BEGIN
    INSERT INTO system_logs (
        log_level, 
        module, 
        message, 
        user_id, 
        ip_address, 
        response_status, 
        execution_time_ms
    ) VALUES (
        UPPER(p_level),
        p_module,
        p_message,
        p_user_id,
        p_ip_address,
        p_response_status,
        p_execution_time
    );
    COMMIT;
END create_log;

-- Función para obtener estadísticas de logs
CREATE OR REPLACE FUNCTION get_log_stats(p_date DATE DEFAULT TRUNC(SYSDATE))
RETURN SYS_REFCURSOR AS
    v_cursor SYS_REFCURSOR;
BEGIN
    OPEN v_cursor FOR
        SELECT 
            log_level,
            COUNT(*) as count,
            AVG(execution_time_ms) as avg_execution_time,
            MAX(execution_time_ms) as max_execution_time,
            MIN(created_at) as first_log,
            MAX(created_at) as last_log
        FROM system_logs
        WHERE created_date = p_date
        GROUP BY log_level
        ORDER BY 
            CASE log_level
                WHEN 'FATAL' THEN 1
                WHEN 'ERROR' THEN 2  
                WHEN 'WARN' THEN 3
                WHEN 'INFO' THEN 4
                WHEN 'DEBUG' THEN 5
            END;
    
    RETURN v_cursor;
END get_log_stats;

-- Vista para logs con información de usuario
CREATE OR REPLACE VIEW v_logs_with_user AS
SELECT 
    l.log_id,
    l.log_level,
    l.module,
    l.message,
    l.user_id,
    u.username,
    u.full_name as user_name,
    l.ip_address,
    l.response_status,
    l.execution_time_ms,
    l.created_at
FROM system_logs l
LEFT JOIN users u ON l.user_id = u.user_id;

-- Mostrar datos insertados
SELECT 'USUARIOS CREADOS:' as info FROM dual;
SELECT 
    user_id,
    username,
    email,
    full_name,
    CASE WHEN is_active = 1 THEN 'Activo' ELSE 'Inactivo' END as status,
    created_at
FROM users
ORDER BY user_id;

SELECT 'LOGS CREADOS:' as info FROM dual;
SELECT 
    log_id,
    log_level,
    module,
    SUBSTR(message, 1, 50) || CASE WHEN LENGTH(message) > 50 THEN '...' ELSE '' END as message,
    username,
    ip_address,
    response_status,
    execution_time_ms,
    TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI:SS') as created
FROM v_logs_with_user
ORDER BY log_id;

SELECT 'ESTADÍSTICAS POR NIVEL:' as info FROM dual;
SELECT 
    log_level,
    COUNT(*) as total,
    ROUND(AVG(execution_time_ms), 2) as avg_time_ms
FROM system_logs
GROUP BY log_level
ORDER BY 
    CASE log_level
        WHEN 'FATAL' THEN 1
        WHEN 'ERROR' THEN 2  
        WHEN 'WARN' THEN 3
        WHEN 'INFO' THEN 4
        WHEN 'DEBUG' THEN 5
    END;
