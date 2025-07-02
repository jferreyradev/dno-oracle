-- Script para probar la tabla de logs creada
-- Verificar que todo funciona correctamente

-- 1. Verificar que las tablas existen
SELECT 'TABLAS EXISTENTES:' as info FROM dual;
SELECT table_name FROM user_tables WHERE table_name IN ('SYSTEM_LOGS', 'USERS') ORDER BY table_name;

-- 2. Contar registros en cada tabla
SELECT 'CONTEO DE REGISTROS:' as info FROM dual;
SELECT 'users' as tabla, COUNT(*) as total FROM users
UNION ALL
SELECT 'system_logs' as tabla, COUNT(*) as total FROM system_logs;

-- 3. Probar inserción de un nuevo log usando el procedimiento
SELECT 'PROBANDO PROCEDIMIENTO create_log:' as info FROM dual;

-- 4. Probar la vista de logs con usuarios
SELECT 'LOGS CON USUARIOS (últimos 5):' as info FROM dual;
SELECT 
    log_id,
    log_level,
    module,
    SUBSTR(message, 1, 30) as message_short,
    username,
    ip_address,
    response_status,
    execution_time_ms
FROM v_logs_with_user
WHERE ROWNUM <= 5
ORDER BY log_id DESC;

-- 5. Probar estadísticas por nivel
SELECT 'ESTADÍSTICAS POR NIVEL:' as info FROM dual;
SELECT 
    log_level,
    COUNT(*) as total,
    ROUND(AVG(execution_time_ms), 2) as promedio_ms,
    MIN(execution_time_ms) as min_ms,
    MAX(execution_time_ms) as max_ms
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

-- 6. Verificar que las secuencias funcionan
SELECT 'SECUENCIAS DISPONIBLES:' as info FROM dual;
SELECT sequence_name, last_number FROM user_sequences WHERE sequence_name IN ('SEQ_SYSTEM_LOGS', 'SEQ_USERS');

-- 7. Probar inserción manual de un log nuevo
INSERT INTO system_logs (
    log_id,
    log_level,
    module,
    message,
    user_id,
    ip_address,
    response_status,
    execution_time_ms
) VALUES (
    seq_system_logs.NEXTVAL,
    'INFO',
    'TEST',
    'Log de prueba creado desde script SQL',
    1,
    '127.0.0.1',
    200,
    25
);

COMMIT;

-- 8. Verificar que se insertó correctamente
SELECT 'LOG DE PRUEBA INSERTADO:' as info FROM dual;
SELECT 
    log_id,
    log_level,
    module,
    message,
    username,
    ip_address,
    TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI:SS') as created
FROM v_logs_with_user
WHERE module = 'TEST'
ORDER BY log_id DESC;
