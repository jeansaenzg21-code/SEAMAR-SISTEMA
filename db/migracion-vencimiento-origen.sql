-- =============================================================================
-- ORIGEN DE LA FECHA DE VENCIMIENTO (CxC y CxP)
-- =============================================================================
-- vencimiento_origen indica de dónde proviene la fecha de vencimiento:
--   'FACTURA'  -> extraída directamente de la factura (NO se puede editar)
--   'SISTEMA'  -> asignada automáticamente: día de registro + 15 días (editable)
--   'MANUAL'   -> ingresada/actualizada por el usuario (editable)
--   NULL       -> registros anteriores sin origen conocido (editable)
--
-- Idempotente: solo agrega las columnas si no existen.
-- =============================================================================

SET @schema = DATABASE();

SET @col_cxc = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'cuentas_por_cobrar'
    AND COLUMN_NAME = 'vencimiento_origen'
);

SET @sql_cxc = IF(@col_cxc = 0,
  'ALTER TABLE cuentas_por_cobrar
     ADD COLUMN vencimiento_origen ENUM(''FACTURA'',''SISTEMA'',''MANUAL'') NULL DEFAULT NULL
     AFTER fecha_vencimiento',
  'SELECT 1'
);
PREPARE stmt_cxc FROM @sql_cxc;
EXECUTE stmt_cxc;
DEALLOCATE PREPARE stmt_cxc;

SET @col_cxp = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @schema
    AND TABLE_NAME = 'cuentas_por_pagar'
    AND COLUMN_NAME = 'vencimiento_origen'
);

SET @sql_cxp = IF(@col_cxp = 0,
  'ALTER TABLE cuentas_por_pagar
     ADD COLUMN vencimiento_origen ENUM(''FACTURA'',''SISTEMA'',''MANUAL'') NULL DEFAULT NULL
     AFTER fecha_vencimiento',
  'SELECT 1'
);
PREPARE stmt_cxp FROM @sql_cxp;
EXECUTE stmt_cxp;
DEALLOCATE PREPARE stmt_cxp;