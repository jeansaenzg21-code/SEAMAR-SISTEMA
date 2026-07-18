-- =============================================================================
-- Migración: Integración Conciliación Bancaria → CxC / CxP
-- =============================================================================
-- 1. Agrega columna fecha_cobro y conciliacion_id a cuentas_por_cobrar
-- 2. Agrega estado COBRADO al enum de cuentas_por_cobrar
-- 3. Agrega columna fecha_pago y conciliacion_id a cuentas_por_pagar
-- =============================================================================

ALTER TABLE cuentas_por_cobrar
  MODIFY COLUMN estado ENUM('PENDIENTE','FACTURADO','COBRADO') NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN fecha_cobro DATE DEFAULT NULL AFTER estado,
  ADD COLUMN conciliacion_id INT DEFAULT NULL AFTER fecha_cobro,
  ADD INDEX idx_cxc_conciliacion (conciliacion_id);

ALTER TABLE cuentas_por_pagar
  ADD COLUMN fecha_pago DATE DEFAULT NULL AFTER estado,
  ADD COLUMN conciliacion_id INT DEFAULT NULL AFTER fecha_pago,
  ADD INDEX idx_cxp_conciliacion (conciliacion_id);
