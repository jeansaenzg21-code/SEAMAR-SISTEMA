-- ============================================================================
-- SEAMAR V2 · MIGRACIÓN DE MÓDULO DE BACKUP, RESTAURACIÓN Y ARCHIVADO
-- ============================================================================
-- Crea las tablas necesarias para:
--   * backups            -> registra cada respaldo de BD generado (mysqldump)
--   * backup_eliminaciones -> trazabilidad de los respaldos borrados por retención
--   * periodos           -> cierre/archivado de periodos contables por año/mes
--
-- Cómo ejecutarlo en el VPS / servidor (MySQL):
--   mysql -u USUARIO -p NOMBRE_BASE < migracion-backups.sql
--
-- Es seguro re-ejecutarlo: todas las sentencias usan CREATE TABLE IF NOT EXISTS
-- y se guardan con información_schema antes de cualquier ALTER.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) BACKUPS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS backups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo ENUM('daily','weekly','monthly','manual','prerestore','archivo') NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  ruta VARCHAR(1000) NOT NULL,
  tamano BIGINT UNSIGNED DEFAULT NULL,
  checksum VARCHAR(64) DEFAULT NULL,
  estado ENUM('EN_PROCESO','COMPLETADO','ERROR','RESTAURADO') NOT NULL DEFAULT 'EN_PROCESO',
  fase VARCHAR(60) DEFAULT NULL,
  error TEXT DEFAULT NULL,
  motivo VARCHAR(255) DEFAULT NULL,
  usuario_id BIGINT UNSIGNED DEFAULT NULL,
  usuario_nombre VARCHAR(255) DEFAULT NULL,
  fecha_inicio DATETIME DEFAULT NULL,
  fecha_fin DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_backups_estado (estado),
  KEY idx_backups_tipo (tipo),
  KEY idx_backups_fecha (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2) ELIMINACIONES POR RETENCIÓN (trazabilidad de borrados automáticos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS backup_eliminaciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  backup_id BIGINT UNSIGNED DEFAULT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  tamano BIGINT UNSIGNED DEFAULT NULL,
  fecha_eliminacion DATETIME NOT NULL,
  motivo VARCHAR(255) NOT NULL,
  usuario_proceso VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_elim_fecha (fecha_eliminacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3) PERIODOS (cierre y archivado histórico por año/mes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS periodos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  anio INT NOT NULL,
  mes INT NOT NULL,
  estado ENUM('ABIERTO','CERRADO','ARCHIVADO') NOT NULL DEFAULT 'ABIERTO',
  fecha_cierre DATETIME DEFAULT NULL,
  usuario_cierre VARCHAR(255) DEFAULT NULL,
  backup_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_periodos_anio_mes (anio, mes)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;