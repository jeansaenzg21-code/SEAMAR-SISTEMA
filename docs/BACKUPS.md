# MÓDULO DE RESPALDO, RESTAURACIÓN Y ARCHIVO HISTÓRICO — SEAMAR V2

Sistema completo de backup de la base de datos MySQL de SEAMAR, restauración
con punto de recuperación, retención automática y archivo histórico por
periodo contable. Solo el rol **ADMINISTRADOR** puede operar la interfaz web.

---

## 1. Cómo funciona

- Cada respaldo es un dump **real** de la base de datos generado con
  `mysqldump` (`--single-transaction --routines --triggers --events`).
- La contraseña de MySQL viaja por la variable de entorno `MYSQL_PWD`
  (nunca por la línea de comandos) y no queda en `ps`.
- Cada respaldo se registra en la tabla `backups` y pasa por 3 controles:
  1. Código de salida de `mysqldump` = 0.
  2. El archivo existe, no está vacío y su encabezado corresponde a un dump SQL.
  3. Checksum **SHA-256** calculado por streaming sobre el archivo.
- Un **lock** impide que ocurran dos operaciones simultáneas de
  backup/restauración (incluye detección de locks vencidos por tiempo o PID
  muerto).
- Toda acción relevante queda en `actividad_sistema` y las eliminaciones por
  retención en `backup_eliminaciones` (100 % trazables).

## 2. Tablas creadas (`db/migracion-backups.sql`)

| Tabla                  | Propósito                                                        |
| ---------------------- | ---------------------------------------------------------------- |
| `backups`              | Registro de cada respaldo (tipo, archivo, estado, checksum…).    |
| `backup_eliminaciones` | Historial de respaldos eliminados (retención o manual).          |
| `periodos`             | Estado por año+mes: ABIERTO / CERRADO / ARCHIVADO + backup_id.   |

Estados de un respaldo: `EN_PROCESO` → `COMPLETADO` | `ERROR`, y `RESTAURADO`
cuando se usó para restaurar la base.

## 3. Variables de entorno (`.env.local` / `.env`)

```
# Ya existentes (obligatorias):
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=...
DB_NAME=seamar

# Nuevas (opcionales, con valores por defecto razonables):
BACKUP_DIR=
BACKUP_MYSQLDUMP_PATH=
BACKUP_MYSQL_PATH=
BACKUP_RETENTION_DAILY_DAYS=7
BACKUP_RETENTION_WEEKLY_COUNT=4
BACKUP_RETENTION_MONTHLY_COUNT=6
BACKUP_MAX_LOCK_MINUTES=45
```

- `BACKUP_DIR`: directorio de respaldos (por defecto `./backups`). Crea las
  subcarpetas `daily/`, `weekly/`, `monthly/`, `manual/`, `archive/` y
  `prerestore/`. Está fuera de `public/` y en `.gitignore`.
- `BACKUP_MYSQLDUMP_PATH` / `BACKUP_MYSQL_PATH`: si `mysqldump`/`mysql` no
  están en el PATH del servidor, indica la ruta completa (p. ej.
  `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe`).

## 4. Nombres de archivos

```
SEAMAR_DB_2026-08-27_233000.sql          # respaldo normal
SEAMAR_PRE_RESTORE_2026-08-27_231500.sql # respaldo previo a una restauración
```

## 5. Retención (política por defecto)

| Tipo      | Conserva | Explicación                                    |
| --------- | -------- | ---------------------------------------------- |
| Diario    | 7        | Semana de respaldos diarios.                   |
| Semanal   | 4        | Los domingos (respaldos semanales).            |
| Mensual   | 6        | El último día de cada mes (cierre mensual).    |

- `daily/weekly/monthly` se crean automáticamente por el programador.
- Al aplicar retención se borran los excedentes más antiguos; el borrado queda
  registrado en `backup_eliminaciones` y en `actividad_sistema`.
- Los respaldos `manual`, `prerestore` y `archivo` **nunca** se tocan por la
  retención.

## 6. Programador automático

`scripts/backup-scheduler.ts` decide el tipo según la fecha:
- Último día del mes → `monthly`.
- Domingo → `weekly`.
- Resto → `daily`.

Se recomienda **cron del servidor** (no `setInterval`):

```
# Linux (todas las noches a las 23:30)
30 23 * * * cd /ruta/a/SEAMAR-SISTEMA && npx tsx scripts/backup-scheduler.ts >> backups/scheduler.log 2>&1
```

O bien PM2 (ya incluido en `ecosystem.config.js`, app `backup-scheduler`,
reinicia vía `cron_restart: "30 23 * * *"`):

```bash
pm2 start ecosystem.config.js
```

## 7. Comandos CLI (independientes de la web)

```bash
npm run backup:manual            # respaldo manual
npm run backup:auto              # respaldo según fecha (daily/weekly/monthly)
npm run backup:retencion         # solo aplicar la política de retención
npm run backup:restore -- --id 12 --confirmar RESTAURAR
```

Los dos binarios de MySQL se buscan en el PATH; la autenticación usa las
variables `DB_*` de `.env.local`/`.env`.

## 8. APIs (todas ADMIN; el proxy ya bloquea a SUPERVISOR/OPERADOR/Óscar)

| Método | Ruta                                | Descripción                                        |
| ------ | ----------------------------------- | -------------------------------------------------- |
| GET    | `/api/backups`                      | Lista respaldos (filtros `tipo`, `estado`, `resumen=1`). |
| POST   | `/api/backups`                      | Crea respaldo (`tipo`, `motivo`).                  |
| GET    | `/api/backups/[id]`                 | Detalle de un respaldo.                            |
| DELETE | `/api/backups/[id]`                 | Elimina respaldo (archivo + registro + actividad). |
| GET    | `/api/backups/[id]/download`        | Descarga el `.sql` por streaming.                  |
| POST   | `/api/backups/[id]/validate`        | Recalcula checksum SHA-256 y valida el dump.       |
| POST   | `/api/backups/[id]/restore`         | Restaura (exige `{ confirmacion: "RESTAURAR" }`).  |
| POST   | `/api/backups/retencion`            | Aplica la política de retención.                   |
| GET    | `/api/periodos`                     | Lista periodos año/mes con su estado.              |
| POST   | `/api/periodos`                     | Cierra y archiva un periodo (`anio`, `mes`).       |
| PATCH  | `/api/periodos/[id]`                | Reabre un periodo (`{ estado: "ABIERTO" }`).       |

## 9. Desde la interfaz web

`Configuración → Seguridad y más`:
- **Respaldo y restauración**: crear backup (con motivo), aplicar retención,
  validar (checksum), descargar, restaurar y eliminar. El progreso de backups
  en curso (de cron/CLI) se consulta cada 3 segundos mientras esté en
  `EN_PROCESO`.
- **Archivo histórico**: cerrar y archivar un periodo (genera respaldo tipo
  `archivo` y lo asocia), visualizar estados (ABIERTO/CERRADO/ARCHIVADO) y
  reabrir un periodo si se necesita corregir.

## 10. Restauración, paso a paso (segura)

1. Seleccionar el respaldo → **Restaurar**.
2. El sistema **verifica el checksum SHA-256** (si no coincide, aborta).
3. Crea **obligatoriamente un backup previo** (`prerestore`) de la base actual.
4. Ejecuta la restauración vía `mysql` (el dump se envía por `stdin`, sin
   cargarlo en memoria).
5. Marca el respaldo como `RESTAURADO` y registra todo en `actividad_sistema`.

Si el paso 3 falla, la operación **no continúa** y la base queda intacta.

## 11. Pruebas y verificación de una instalación

```bash
# 1) Aplicar la migración (una sola vez):
mysql -u root -p seamar < db/migracion-backups.sql

# 2) Respaldos manual/automático:
npm run backup:manual
npm run backup:auto

# 3) Validar integridad vía CLI/UI y ver el archivo creado:
ls -lh backups/
npx tsx scripts/backup-db.ts --retencion

# 4) Prueba de restauración contra una BD duplicada de prueba (sin
#    tocar la de producción):
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS seamar_backup_test"
mysql -u root -p seamar_backup_test < backups/SEAMAR_DB_*.sql
mysql -u root -p -e "SELECT COUNT(*) FROM seamar_backup_test.cuentas_por_cobrar"
```

## 12. Limitaciones y notas

- Los respaldos se guardan en disco local del servidor (no en la nube). Para
  redundancia fuera de sitio, copia `BACKUP_DIR` a OneDrive (carpeta
  `ONEDRIVE_FOLDER_DOCUMENTOS_RESPALDO`) mediante sincronización externa.
- Un respaldo enorme puede tardar; el endpoint `POST /api/backups` es
  síncrono (adecuado en despliegues auto-hospedados). Para bases gigantes
  usa el CLI desde cron.
- Los archivos `.sql` no se comprimen (más simple y portable). Si el espacio
  es crítico, comprime fuera del sistema.
- La restauración reemplaza **toda** la base de datos (no es una
  recuperación puntual de una tabla).