import pool from "@/lib/mysql";
import type { ResultSetHeader } from "mysql2/promise";
import type {
  BienGuiaRemision,
  BienGuiaRemisionFila,
  FiltroCarpetaGuia,
  GuardarGuiaRemisionInput,
  GuiaRemisionCarpeta,
  GuiaRemisionCarpetaFila,
  GuiaRemisionDatos,
  GuiaRemisionFila,
  GuiaRemisionOscar,
  OpcionesListadoGuias,
  ResultadoListadoGuias,
} from "./guias-remision-types";

// =============================================================================
// Mapeos
// =============================================================================

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function fechaValida(fecha: string | null | undefined): string | null {
  if (!fecha) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  return null;
}

function mapearGuia(fila: GuiaRemisionFila): GuiaRemisionOscar {
  return {
    id: fila.id,
    usuarioId: fila.usuario_id,
    guia: {
      serie: fila.serie,
      numero: fila.numero,
      fechaInicioTraslado: fila.fecha_inicio_traslado,
      motivoTraslado: fila.motivo_traslado,
      destinatario: fila.destinatario,
      rucCliente: fila.ruc_cliente,
      direccion: fila.direccion,
    },
    bienes: [],
    conteoBienes: (fila as any).conteo_bienes ?? 0,
    estado: fila.estado,
    carpetaId: fila.carpeta_id,
    nombreArchivo: fila.nombre_archivo,
    onedriveItemId: fila.onedrive_item_id,
    onedriveWebUrl: fila.onedrive_web_url,
    hashArchivo: fila.hash_archivo,
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
  };
}

function mapearBien(fila: BienGuiaRemisionFila): BienGuiaRemision {
  return {
    codigoBien: fila.codigo_bien,
    descripcion: fila.descripcion,
    marca: fila.marca,
    modelo: fila.modelo,
    serie: fila.serie,
    ref: fila.ref,
    unidadMedida: fila.unidad_medida,
    cantidad: numero(fila.cantidad),
    accesorios: fila.accesorios,
    nroParte: fila.nro_parte,
    lote: fila.lote,
    expira: fila.expiracion,
  };
}

// =============================================================================
// Consulta
// =============================================================================

export async function cargarBienes(guiaId: number): Promise<BienGuiaRemision[]> {
  const [filas] = await pool.query<BienGuiaRemisionFila[]>(
    `
    SELECT id, guia_id, codigo_bien, descripcion, marca, modelo, serie, ref,
           unidad_medida, cantidad, accesorios, nro_parte, lote, expiracion, orden
    FROM guias_remision_oscar_bienes
    WHERE guia_id = ?
    ORDER BY orden ASC, id ASC
    `,
    [guiaId]
  );
  return filas.map(mapearBien);
}

export async function listarGuiasRemision(
  usuarioId: number,
  opciones: OpcionesListadoGuias = {}
): Promise<ResultadoListadoGuias> {
  const porPagina = opciones.porPagina ?? 0;
  const pagina = Math.max(1, opciones.pagina ?? 1);
  const estado = opciones.estado || null;
  const q = opciones.busqueda?.trim() || null;
  const carpeta = opciones.carpeta;

  const where: string[] = ["g.usuario_id = ?"];
  const params: any[] = [usuarioId];

  if (estado) {
    where.push("g.estado = ?");
    params.push(estado);
  }
  if (q) {
    const like = `%${q}%`;
    where.push(
      `(g.serie LIKE ? OR g.numero LIKE ? OR g.destinatario LIKE ?
        OR g.ruc_cliente LIKE ? OR g.motivo_traslado LIKE ?)`
    );
    params.push(like, like, like, like, like);
  }
  if (carpeta === "SIN_CARPETA") {
    where.push("g.carpeta_id IS NULL");
  } else if (typeof carpeta === "number" && Number.isFinite(carpeta)) {
    where.push("g.carpeta_id = ?");
    params.push(carpeta);
  }

  const whereSql = where.join(" AND ");

  const [[{ total }]]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM guias_remision_oscar g WHERE ${whereSql}`,
    params
  );

  const limitSql = porPagina > 0 ? " LIMIT ? OFFSET ?" : "";
  const limitParams: any[] =
    porPagina > 0 ? [...params, porPagina, (pagina - 1) * porPagina] : params;

  const [filas] = await pool.query<GuiaRemisionFila[]>(
    `
    SELECT g.*,
      (SELECT COUNT(*) FROM guias_remision_oscar_bienes b WHERE b.guia_id = g.id) AS conteo_bienes
    FROM guias_remision_oscar g
    WHERE ${whereSql}
    ORDER BY g.id DESC
    ${limitSql}
    `,
    limitParams
  );

  const guias = filas.map(mapearGuia);
  const totalPaginas = porPagina > 0 ? Math.max(1, Math.ceil(total / porPagina)) : 1;
  return { guias, total, pagina, porPagina, totalPaginas };
}

export async function obtenerGuiaRemision(
  usuarioId: number,
  guiaId: number
): Promise<GuiaRemisionOscar | null> {
  const [filas] = await pool.query<GuiaRemisionFila[]>(
    `
    SELECT *
    FROM guias_remision_oscar
    WHERE usuario_id = ? AND id = ?
    LIMIT 1
    `,
    [usuarioId, guiaId]
  );

  if (filas.length === 0) return null;

  const guia = mapearGuia(filas[0]);
  guia.bienes = await cargarBienes(filas[0].id);
  return guia;
}

// =============================================================================
// Duplicados
// =============================================================================

export async function verificarGuiaDuplicada(
  usuarioId: number,
  serie: string | null,
  numero: string | null,
  excluirGuiaId?: number
): Promise<{ existe: boolean; guiaId: number | null }> {
  if (!serie || !numero) {
    return { existe: false, guiaId: null };
  }

  const params: any[] = [usuarioId, serie, numero];
  let excluir = "";
  if (excluirGuiaId) {
    excluir = " AND id <> ?";
    params.push(excluirGuiaId);
  }

  const [filas]: any = await pool.query(
    `
    SELECT id
    FROM guias_remision_oscar
    WHERE usuario_id = ?
      AND serie = ?
      AND numero = ?
      ${excluir}
    LIMIT 1
    `,
    params
  );

  if (filas.length === 0) return { existe: false, guiaId: null };
  return { existe: true, guiaId: filas[0].id };
}

export async function verificarHashGuia(
  usuarioId: number,
  hashArchivo: string
): Promise<{ existe: boolean; guiaId: number | null }> {
  if (!hashArchivo) return { existe: false, guiaId: null };

  const [filas]: any = await pool.query(
    `
    SELECT id
    FROM guias_remision_oscar
    WHERE usuario_id = ? AND hash_archivo = ?
    LIMIT 1
    `,
    [usuarioId, hashArchivo]
  );

  if (filas.length === 0) return { existe: false, guiaId: null };
  return { existe: true, guiaId: filas[0].id };
}

// =============================================================================
// Persistencia
// =============================================================================

export async function insertarGuiaRemision(
  usuarioId: number,
  input: GuardarGuiaRemisionInput
): Promise<number> {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.query<ResultSetHeader>(
      `
      INSERT INTO guias_remision_oscar (
        usuario_id,
        serie,
        numero,
        fecha_inicio_traslado,
        motivo_traslado,
        destinatario,
        ruc_cliente,
        direccion,
        nombre_archivo,
        onedrive_item_id,
        onedrive_web_url,
        hash_archivo,
        estado,
        carpeta_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        usuarioId,
        input.guia.serie,
        input.guia.numero,
        fechaValida(input.guia.fechaInicioTraslado),
        input.guia.motivoTraslado,
        input.guia.destinatario,
        input.guia.rucCliente,
        input.guia.direccion,
        input.nombreArchivo,
        input.onedriveItemId,
        input.onedriveWebUrl,
        input.hashArchivo,
        input.estado,
        input.carpetaId ?? null,
      ]
    );

    const guiaId = result.insertId;

    for (let i = 0; i < input.bienes.length; i++) {
      const bien = input.bienes[i];
      await connection.query(
        `
        INSERT INTO guias_remision_oscar_bienes (
          guia_id,
          codigo_bien,
          descripcion,
          marca,
          modelo,
          serie,
          ref,
          unidad_medida,
          cantidad,
          accesorios,
          nro_parte,
          lote,
          expiracion,
          orden
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          guiaId,
          bien?.codigoBien ?? null,
          bien?.descripcion ?? null,
          bien?.marca ?? null,
          bien?.modelo ?? null,
          bien?.serie ?? null,
          bien?.ref ?? null,
          bien?.unidadMedida ?? null,
          bien?.cantidad ?? null,
          bien?.accesorios ?? null,
          bien?.nroParte ?? null,
          bien?.lote ?? null,
          bien?.expira ? fechaValida(bien.expira) : null,
          i,
        ]
      );
    }

    await connection.commit();
    return guiaId;
  } catch (error: any) {
    try {
      await connection.rollback();
    } catch {}
    throw error;
  } finally {
    connection.release();
  }
}

export async function actualizarGuiaRemision(
  usuarioId: number,
  guiaId: number,
  input: GuardarGuiaRemisionInput
): Promise<void> {
  const existente = await obtenerGuiaRemision(usuarioId, guiaId);
  if (!existente) {
    throw new Error("Guía de Remisión no encontrada");
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
      UPDATE guias_remision_oscar
      SET serie = ?,
          numero = ?,
          fecha_inicio_traslado = ?,
          motivo_traslado = ?,
          destinatario = ?,
          ruc_cliente = ?,
          direccion = ?,
          nombre_archivo = ?,
          onedrive_item_id = ?,
          onedrive_web_url = ?,
          hash_archivo = ?,
          estado = ?,
          carpeta_id = ?
      WHERE usuario_id = ? AND id = ?
      `,
      [
        input.guia.serie,
        input.guia.numero,
        fechaValida(input.guia.fechaInicioTraslado),
        input.guia.motivoTraslado,
        input.guia.destinatario,
        input.guia.rucCliente,
        input.guia.direccion,
        input.nombreArchivo ?? existente.nombreArchivo,
        input.onedriveItemId ?? existente.onedriveItemId,
        input.onedriveWebUrl ?? existente.onedriveWebUrl,
        input.hashArchivo ?? existente.hashArchivo,
        input.estado,
        input.carpetaId === undefined ? (existente.carpetaId ?? null) : input.carpetaId,
        usuarioId,
        guiaId,
      ]
    );

    await connection.query(
      `DELETE FROM guias_remision_oscar_bienes WHERE guia_id = ?`,
      [guiaId]
    );

    for (let i = 0; i < input.bienes.length; i++) {
      const bien = input.bienes[i];
      await connection.query(
        `
        INSERT INTO guias_remision_oscar_bienes (
          guia_id,
          codigo_bien,
          descripcion,
          marca,
          modelo,
          serie,
          ref,
          unidad_medida,
          cantidad,
          accesorios,
          nro_parte,
          lote,
          expiracion,
          orden
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          guiaId,
          bien?.codigoBien ?? null,
          bien?.descripcion ?? null,
          bien?.marca ?? null,
          bien?.modelo ?? null,
          bien?.serie ?? null,
          bien?.ref ?? null,
          bien?.unidadMedida ?? null,
          bien?.cantidad ?? null,
          bien?.accesorios ?? null,
          bien?.nroParte ?? null,
          bien?.lote ?? null,
          bien?.expira ? fechaValida(bien.expira) : null,
          i,
        ]
      );
    }

    await connection.commit();
  } catch (error: any) {
    try {
      await connection.rollback();
    } catch {}
    throw error;
  } finally {
    connection.release();
  }
}

export async function eliminarGuiaRemision(
  usuarioId: number,
  guiaId: number
): Promise<void> {
  const existente = await obtenerGuiaRemision(usuarioId, guiaId);
  if (!existente) {
    throw new Error("Guía de Remisión no encontrada");
  }

  await pool.query(
    `DELETE FROM guias_remision_oscar WHERE usuario_id = ? AND id = ?`,
    [usuarioId, guiaId]
  );
}

// Utilidad para normalizar la serie/número antes de guardar/comparar.
export function normalizarSerieNumero(
  guia: GuiaRemisionDatos
): { serie: string | null; numero: string | null } {
  const serie = guia.serie?.trim().toUpperCase() || null;
  const numeroRaw = guia.numero?.trim() || null;
  const numeroDigitos = numeroRaw?.replace(/\D+/g, "") || null;
  return { serie, numero: numeroDigitos };
}

// =============================================================================
// Carpetas
// =============================================================================

export async function listarCarpetas(
  usuarioId: number
): Promise<GuiaRemisionCarpeta[]> {
  const [filas] = await pool.query<GuiaRemisionCarpetaFila[]>(
    `
    SELECT c.*,
      (SELECT COUNT(*) FROM guias_remision_oscar g WHERE g.carpeta_id = c.id) AS total_guias,
      (SELECT COUNT(*) FROM guias_remision_oscar g
        JOIN guias_remision_oscar_bienes b ON b.guia_id = g.id
        WHERE g.carpeta_id = c.id) AS total_bienes
    FROM guias_remision_oscar_carpetas c
    WHERE c.usuario_id = ?
    ORDER BY c.nombre ASC
    `,
    [usuarioId]
  );
  return filas.map((f) => ({
    id: f.id,
    usuarioId: f.usuario_id,
    nombre: f.nombre,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
    totalGuias: f.total_guias ?? 0,
    totalBienes: f.total_bienes ?? 0,
  }));
}

export async function crearCarpeta(
  usuarioId: number,
  nombre: string
): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO guias_remision_oscar_carpetas (usuario_id, nombre) VALUES (?, ?)`,
    [usuarioId, nombre]
  );
  return result.insertId;
}

export async function renombrarCarpeta(
  usuarioId: number,
  carpetaId: number,
  nombre: string
): Promise<void> {
  await pool.query(
    `UPDATE guias_remision_oscar_carpetas SET nombre = ? WHERE usuario_id = ? AND id = ?`,
    [nombre, usuarioId, carpetaId]
  );
}

export async function eliminarCarpeta(
  usuarioId: number,
  carpetaId: number
): Promise<void> {
  await pool.query(
    `UPDATE guias_remision_oscar SET carpeta_id = NULL WHERE usuario_id = ? AND carpeta_id = ?`,
    [usuarioId, carpetaId]
  );
  await pool.query(
    `DELETE FROM guias_remision_oscar_carpetas WHERE usuario_id = ? AND id = ?`,
    [usuarioId, carpetaId]
  );
}

export async function asignarGuiaCarpeta(
  usuarioId: number,
  guiaId: number,
  carpetaId: number | null
): Promise<void> {
  const existente = await obtenerGuiaRemision(usuarioId, guiaId);
  if (!existente) throw new Error("Guía de Remisión no encontrada");

  if (carpetaId !== null) {
    const [carpetas]: any = await pool.query(
      `SELECT id FROM guias_remision_oscar_carpetas WHERE usuario_id = ? AND id = ? LIMIT 1`,
      [usuarioId, carpetaId]
    );
    if (carpetas.length === 0) throw new Error("Carpeta no encontrada");
  }

  await pool.query(
    `UPDATE guias_remision_oscar SET carpeta_id = ? WHERE usuario_id = ? AND id = ?`,
    [carpetaId, usuarioId, guiaId]
  );
}