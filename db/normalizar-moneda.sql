-- ============================================================================
-- NORMALIZACIÓN DE MONEDA: SOLES / DOLARES
-- ============================================================================
-- Este script unifica la moneda en todo el sistema al estándar que usa la UI
-- y el dashboard: "SOLES" y "DOLARES".
--
--   * "PEN", "SOL", "SOLES", "SOLES PERUANOS", "NUEVOS SOLES", "S/", "S/."  -> SOLES
--   * "USD", "US$", "DOLAR", "DOLARES", "DOLAR AMERICANO", "US D"            -> DOLARES
--
-- Cómo ejecutarlo en el VPS (MySQL):
--   mysql -u USUARIO -p NOMBRE_BASE < normalizar-moneda.sql
--
-- Es seguro re-ejecutarlo: todas las sentencias verifican si la columna existe
-- antes de alterar o normalizar (usando information_schema y PREPARE/EXECUTE).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) GARANTIZAR columna moneda en "proyectos" (solo si falta)
-- ----------------------------------------------------------------------------
SET @existe = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'proyectos'
    AND COLUMN_NAME = 'moneda'
);
SET @sql = IF(
  @existe > 0,
  'SELECT 1',
  'ALTER TABLE proyectos ADD COLUMN moneda VARCHAR(10) NOT NULL DEFAULT ''SOLES'''
);
PREPARE stmt_proy FROM @sql;
EXECUTE stmt_proy;
DEALLOCATE PREPARE stmt_proy;

-- ----------------------------------------------------------------------------
-- 2) NORMALIZAR datos existentes (por tabla, solo si la columna existe)
-- ----------------------------------------------------------------------------

-- valorizaciones
SET @existe = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'valorizaciones'
    AND COLUMN_NAME = 'moneda'
);
SET @sql = IF(
  @existe > 0,
  'UPDATE valorizaciones SET moneda = CASE
     WHEN UPPER(TRIM(moneda)) IN (''USD'',''US$'',''US D'',''DOLAR'',''DOLARES'',''DOLAR AMERICANO'',''DÓLAR'',''DÓLARES'') THEN ''DOLARES''
     WHEN UPPER(TRIM(moneda)) IN (''PEN'',''SOL'',''SOLES'',''S/'',''S/.''') THEN ''SOLES''
     ELSE moneda END',
  'SELECT 1'
);
PREPARE stmt_v FROM @sql;
EXECUTE stmt_v;
DEALLOCATE PREPARE stmt_v;

-- cuentas_por_cobrar (CxC)
SET @existe = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cuentas_por_cobrar'
    AND COLUMN_NAME = 'moneda'
);
SET @sql = IF(
  @existe > 0,
  'UPDATE cuentas_por_cobrar SET moneda = CASE
     WHEN UPPER(TRIM(moneda)) IN (''USD'',''US$'',''US D'',''DOLAR'',''DOLARES'',''DOLAR AMERICANO'',''DÓLAR'',''DÓLARES'') THEN ''DOLARES''
     WHEN UPPER(TRIM(moneda)) IN (''PEN'',''SOL'',''SOLES'',''S/'',''S/.''') THEN ''SOLES''
     ELSE moneda END',
  'SELECT 1'
);
PREPARE stmt_cxc FROM @sql;
EXECUTE stmt_cxc;
DEALLOCATE PREPARE stmt_cxc;

-- cuentas_por_pagar (CxP)
SET @existe = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'cuentas_por_pagar'
    AND COLUMN_NAME = 'moneda'
);
SET @sql = IF(
  @existe > 0,
  'UPDATE cuentas_por_pagar SET moneda = CASE
     WHEN UPPER(TRIM(moneda)) IN (''USD'',''US$'',''US D'',''DOLAR'',''DOLARES'',''DOLAR AMERICANO'',''DÓLAR'',''DÓLARES'') THEN ''DOLARES''
     WHEN UPPER(TRIM(moneda)) IN (''PEN'',''SOL'',''SOLES'',''S/'',''S/.''') THEN ''SOLES''
     ELSE moneda END',
  'SELECT 1'
);
PREPARE stmt_cxp FROM @sql;
EXECUTE stmt_cxp;
DEALLOCATE PREPARE stmt_cxp;

-- proyectos
SET @existe = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'proyectos'
    AND COLUMN_NAME = 'moneda'
);
SET @sql = IF(
  @existe > 0,
  'UPDATE proyectos SET moneda = CASE
     WHEN UPPER(TRIM(moneda)) IN (''USD'',''US$'',''US D'',''DOLAR'',''DOLARES'',''DOLAR AMERICANO'',''DÓLAR'',''DÓLARES'') THEN ''DOLARES''
     WHEN UPPER(TRIM(moneda)) IN (''PEN'',''SOL'',''SOLES'',''S/'',''S/.''') THEN ''SOLES''
     ELSE moneda END',
  'SELECT 1'
);
PREPARE stmt_p FROM @sql;
EXECUTE stmt_p;
DEALLOCATE PREPARE stmt_p;

-- proyecto_servicios (si existe y tiene moneda)
SET @existe = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'proyecto_servicios'
    AND COLUMN_NAME = 'moneda'
);
SET @sql = IF(
  @existe > 0,
  'UPDATE proyecto_servicios SET moneda = CASE
     WHEN UPPER(TRIM(moneda)) IN (''USD'',''US$'',''US D'',''DOLAR'',''DOLARES'',''DOLAR AMERICANO'',''DÓLAR'',''DÓLARES'') THEN ''DOLARES''
     WHEN UPPER(TRIM(moneda)) IN (''PEN'',''SOL'',''SOLES'',''S/'',''S/.''') THEN ''SOLES''
     ELSE moneda END',
  'SELECT 1'
);
PREPARE stmt_ps FROM @sql;
EXECUTE stmt_ps;
DEALLOCATE PREPARE stmt_ps;

-- ----------------------------------------------------------------------------
-- Fin del script. Verificación sugerida:
--   SELECT moneda, COUNT(*) FROM valorizaciones GROUP BY moneda;
--   SELECT moneda, COUNT(*) FROM proyectos GROUP BY moneda;
-- ----------------------------------------------------------------------------