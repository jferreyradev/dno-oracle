-- Script de prueba simple para verificar el parser SQL
-- Este archivo contiene statements básicos para diagnosticar problemas

-- Test 1: Query simple
SELECT 'Hola Mundo' as mensaje FROM dual;

-- Test 2: CREATE TABLE simple
CREATE TABLE test_table (
    id NUMBER PRIMARY KEY,
    name VARCHAR2(50) NOT NULL
);

-- Test 3: INSERT simple
INSERT INTO test_table (id, name) VALUES (1, 'Test');

-- Test 4: SELECT desde la tabla
SELECT * FROM test_table;

-- Test 5: DROP TABLE
DROP TABLE test_table;
