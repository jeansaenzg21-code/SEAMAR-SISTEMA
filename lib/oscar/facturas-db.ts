import pool from "@/lib/mysql";
import type { ResultSetHeader } from "mysql2/promise";
import type {
  CabeceraFactura,
  EstadoOcr,
  FacturaOscar,
  FacturaOscarAgrupada,
  FacturaOscarFila,
  LineaFactura,
  OrigenFactura,
} from "./types";

function fechaValida(fecha: string | null | undefined): string | null {
  if (!fecha) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
  return null;
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function mapearFila(fila: FacturaOscarFila): FacturaOscarAgrupada {
  return {
    grupoId: fila.id,
    usuarioId: fila.usuario_id,
    cabecera: {
      rucEmisor: fila.ruc_emisor,
      razonSocialEmisor: fila.razon_social_emisor,
      rucCliente: fila.ruc_cliente,
      razonSocialCliente: fila.razon_social_cliente,
      numeroDocumento: fila.numero_documento,
      fechaEmision: fila.fecha_emision,
      fechaVencimiento: fila.fecha_vencimiento,
      moneda: fila.moneda,
      condicionPago: fila.condicion_pago,
      ordenCompra: fila.orden_compra,
      guiaRemision: fila.guia_remision,
      subtotal: fila.subtotal,
      igv: fila.igv,
      total: fila.total,
    },
    lineas: [],
    origen: fila.origen,
    estadoOcr: fila.estado_ocr,
    nombreArchivo: fila.nombre_archivo,
    onedriveItemId: fila.onedrive_item_id,
    onedriveWebUrl: fila.onedrive_web_url,
    observaciones: fila.observaciones,
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
  };
}

function claveGrupo(fila: FacturaOscarFila): string {
  return `${fila.ruc_emisor || ""}||${fila.numero_documento || ""}`;
}

export async function listarFacturasAgrupadas(
  usuarioId: number,
  moneda?: string | null
): Promise<FacturaOscarAgrupada[]> {
  const [filas] = await pool.query<FacturaOscarFila[]>(
    `
    SELECT *
    FROM facturas_oscar
    WHERE usuario_id = ?
      ${moneda ? "AND moneda = ?" : ""}
    ORDER BY id DESC
    `,
    moneda ? [usuarioId, moneda] : [usuarioId]
  );

  const grupos = new Map<string, FacturaOscarAgrupada>();
  const orden: string[] = [];

  for (const fila of filas) {
    const clave = claveGrupo(fila);
    let grupo = grupos.get(clave);

    if (!grupo) {
      grupo = mapearFila(fila);
      grupo.lineas = [];
      grupos.set(clave, grupo);
      orden.push(clave);
    }

    grupo.lineas.push({
      codigo: fila.codigo,
      cantidad: numero(fila.cantidad),
      unidad: fila.unidad,
      descripcion: fila.descripcion,
      valorUnitario: numero(fila.valor_unitario),
      descuento: numero(fila.descuento),
      valorVenta: numero(fila.valor_venta),
    });
  }

  return orden
    .map((clave) => grupos.get(clave)!)
    .sort((a, b) => b.grupoId - a.grupoId);
}

export async function obtenerGrupoPorLinea(
  usuarioId: number,
  lineaId: number
): Promise<FacturaOscarAgrupada | null> {
  const [filas] = await pool.query<FacturaOscarFila[]>(
    `
    SELECT *
    FROM facturas_oscar
    WHERE usuario_id = ?
      AND id = ?
    LIMIT 1
    `,
    [usuarioId, lineaId]
  );

  if (filas.length === 0) return null;

  const primera = filas[0];
  const clave = claveGrupo(primera);

  const [todas] = await pool.query<FacturaOscarFila[]>(
    `
    SELECT *
    FROM facturas_oscar
    WHERE usuario_id = ?
      AND COALESCE(ruc_emisor, '') = ?
      AND COALESCE(numero_documento, '') = ?
    ORDER BY id ASC
    `,
    [usuarioId, primera.ruc_emisor || "", primera.numero_documento || ""]
  );

  const grupo = mapearFila(primera);
  grupo.lineas = todas
    .filter((f) => clave === claveGrupo(f))
    .map((f) => ({
      codigo: f.codigo,
      cantidad: f.cantidad,
      unidad: f.unidad,
      descripcion: f.descripcion,
      valorUnitario: f.valor_unitario,
      descuento: f.descuento,
      valorVenta: f.valor_venta,
    }));

  return grupo;
}

export async function verificarDuplicado(
  usuarioId: number,
  rucEmisor: string | null,
  numeroDocumento: string | null,
  excluirLineaId?: number
): Promise<{ existe: boolean; grupoId: number | null }> {
  if (!rucEmisor || !numeroDocumento) {
    return { existe: false, grupoId: null };
  }

  const [filas]: any = await pool.query(
    `
    SELECT id
    FROM facturas_oscar
    WHERE usuario_id = ?
      AND ruc_emisor = ?
      AND numero_documento = ?
    LIMIT 1
    `,
    [usuarioId, rucEmisor, numeroDocumento]
  );

  if (filas.length === 0) return { existe: false, grupoId: null };

  if (excluirLineaId) {
    const [misma]: any = await pool.query(
      `
      SELECT id
      FROM facturas_oscar
      WHERE usuario_id = ?
        AND ruc_emisor = ?
        AND numero_documento = ?
        AND id = ?
      LIMIT 1
      `,
      [usuarioId, rucEmisor, numeroDocumento, excluirLineaId]
    );
    if (misma.length > 0) return { existe: false, grupoId: null };
  }

  return { existe: true, grupoId: filas[0].id };
}

export interface GuardarFacturaInput {
  cabecera: CabeceraFactura;
  lineas: LineaFactura[];
  origen: OrigenFactura | null;
  estadoOcr: EstadoOcr;
  nombreArchivo: string | null;
  onedriveItemId: string | null;
  onedriveWebUrl: string | null;
}

export async function insertarFactura(
  usuarioId: number,
  input: GuardarFacturaInput
): Promise<number> {
  const filas = input.lineas.length > 0 ? input.lineas : [null];

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let primerId = 0;

    for (const linea of filas) {
      const [result] = await connection.query<ResultSetHeader>(
        `
        INSERT INTO facturas_oscar (
          usuario_id,
          ruc_emisor,
          razon_social_emisor,
          ruc_cliente,
          razon_social_cliente,
          numero_documento,
          fecha_emision,
          fecha_vencimiento,
          moneda,
          condicion_pago,
          orden_compra,
          guia_remision,
          codigo,
          cantidad,
          unidad,
          descripcion,
          valor_unitario,
          descuento,
          valor_venta,
          subtotal,
          igv,
          total,
          nombre_archivo,
          onedrive_item_id,
          onedrive_web_url,
          origen,
          estado_ocr,
          observaciones
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          usuarioId,
          input.cabecera.rucEmisor,
          input.cabecera.razonSocialEmisor,
          input.cabecera.rucCliente,
          input.cabecera.razonSocialCliente,
          input.cabecera.numeroDocumento,
          fechaValida(input.cabecera.fechaEmision),
          fechaValida(input.cabecera.fechaVencimiento),
          input.cabecera.moneda,
          input.cabecera.condicionPago,
          input.cabecera.ordenCompra,
          input.cabecera.guiaRemision,
          linea?.codigo ?? null,
          linea?.cantidad ?? null,
          linea?.unidad ?? null,
          linea?.descripcion ?? null,
          linea?.valorUnitario ?? null,
          linea?.descuento ?? null,
          linea?.valorVenta ?? null,
          input.cabecera.subtotal,
          input.cabecera.igv,
          input.cabecera.total,
          input.nombreArchivo,
          input.onedriveItemId,
          input.onedriveWebUrl,
          input.origen,
          input.estadoOcr,
          null,
        ]
      );

      if (primerId === 0) primerId = result.insertId;
    }

    await connection.commit();
    return primerId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function actualizarFactura(
  usuarioId: number,
  lineaId: number,
  input: GuardarFacturaInput
): Promise<void> {
  const existente = await obtenerGrupoPorLinea(usuarioId, lineaId);
  if (!existente) {
    throw new Error("Factura no encontrada");
  }

  const clave = `${existente.cabecera.rucEmisor || ""}||${existente.cabecera.numeroDocumento || ""}`;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      `
      DELETE FROM facturas_oscar
      WHERE usuario_id = ?
        AND COALESCE(ruc_emisor, '') = ?
        AND COALESCE(numero_documento, '') = ?
      `,
      [usuarioId, existente.cabecera.rucEmisor || "", existente.cabecera.numeroDocumento || ""]
    );

    const filas = input.lineas.length > 0 ? input.lineas : [null];

    for (const linea of filas) {
      await connection.query(
        `
        INSERT INTO facturas_oscar (
          usuario_id,
          ruc_emisor,
          razon_social_emisor,
          ruc_cliente,
          razon_social_cliente,
          numero_documento,
          fecha_emision,
          fecha_vencimiento,
          moneda,
          condicion_pago,
          orden_compra,
          guia_remision,
          codigo,
          cantidad,
          unidad,
          descripcion,
          valor_unitario,
          descuento,
          valor_venta,
          subtotal,
          igv,
          total,
          nombre_archivo,
          onedrive_item_id,
          onedrive_web_url,
          origen,
          estado_ocr,
          observaciones
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          usuarioId,
          input.cabecera.rucEmisor,
          input.cabecera.razonSocialEmisor,
          input.cabecera.rucCliente,
          input.cabecera.razonSocialCliente,
          input.cabecera.numeroDocumento,
          fechaValida(input.cabecera.fechaEmision),
          fechaValida(input.cabecera.fechaVencimiento),
          input.cabecera.moneda,
          input.cabecera.condicionPago,
          input.cabecera.ordenCompra,
          input.cabecera.guiaRemision,
          linea?.codigo ?? null,
          linea?.cantidad ?? null,
          linea?.unidad ?? null,
          linea?.descripcion ?? null,
          linea?.valorUnitario ?? null,
          linea?.descuento ?? null,
          linea?.valorVenta ?? null,
          input.cabecera.subtotal,
          input.cabecera.igv,
          input.cabecera.total,
          input.nombreArchivo ?? existente.nombreArchivo,
          input.onedriveItemId ?? existente.onedriveItemId,
          input.onedriveWebUrl ?? existente.onedriveWebUrl,
          input.origen ?? existente.origen,
          input.estadoOcr,
          input.estadoOcr === "PENDIENTE" ? null : existente.observaciones,
        ]
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function eliminarFactura(
  usuarioId: number,
  lineaId: number
): Promise<void> {
  const existente = await obtenerGrupoPorLinea(usuarioId, lineaId);
  if (!existente) {
    throw new Error("Factura no encontrada");
  }

  await pool.query(
    `
    DELETE FROM facturas_oscar
    WHERE usuario_id = ?
      AND COALESCE(ruc_emisor, '') = ?
      AND COALESCE(numero_documento, '') = ?
    `,
    [usuarioId, existente.cabecera.rucEmisor || "", existente.cabecera.numeroDocumento || ""]
  );
}
