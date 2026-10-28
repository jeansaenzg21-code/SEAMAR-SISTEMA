-- Amplía columnas de texto de guías de remisión para tolerar valores largos
-- que la IA puede extraer (ej. varios números de serie concatenados con "//").
-- Motivo: Error ER_DATA_TOO_LONG for column 'serie' al guardar bienes.

USE seamar;

-- Bienes: serie, ref, nro_parte y lote pueden acumular múltiples valores.
ALTER TABLE guias_remision_oscar_bienes
  MODIFY COLUMN serie         text NULL,
  MODIFY COLUMN ref           text NULL,
  MODIFY COLUMN nro_parte     text NULL,
  MODIFY COLUMN lote          text NULL,
  MODIFY COLUMN codigo_bien   varchar(255) NULL;

-- Cabecera de la guía: serie/numero/motivo también pueden ser largos.
ALTER TABLE guias_remision_oscar
  MODIFY COLUMN serie            varchar(80) NULL,
  MODIFY COLUMN numero           varchar(80) NULL,
  MODIFY COLUMN motivo_traslado  varchar(255) NULL;
