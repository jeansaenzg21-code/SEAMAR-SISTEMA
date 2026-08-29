import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { PythonShell } from "python-shell";
import pool from "@/lib/mysql";
import { actualizarDocumentoPorConciliacion } from "@/lib/conciliacion";
import { resolvePythonPath } from "@/lib/python";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;

    const [rows]: any = await pool.query(
      "SELECT moneda FROM conciliaciones_bancarias WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: "Conciliación no encontrada" },
        { status: 404 }
      );
    }

    const moneda = rows[0].moneda || "PEN";

    const [movimientosDB]: any = await pool.query(
      `SELECT fecha, referencia, descripcion, monto, tipo
       FROM conciliacion_movimientos
       WHERE conciliacion_id = ?
       ORDER BY id`,
      [id]
    );

    if (movimientosDB.length === 0) {
      return NextResponse.json(
        { success: false, error: "No hay movimientos registrados para esta conciliación." },
        { status: 404 }
      );
    }

    const movimientosJson = movimientosDB.map((m: any) => {
      const fecha = m.fecha instanceof Date
        ? m.fecha.toISOString().slice(0, 10)
        : String(m.fecha ?? "").slice(0, 10);
      const monto = Number(m.monto) || 0;
      return {
        Fecha: fecha,
        "Descripción operación": m.descripcion ?? "",
        "Referencia2": m.referencia ?? "",
        Monto: m.tipo === "credito" ? monto : -monto,
      };
    });

    const rutaMovimientosJson = join(tmpdir(), `mov_${randomUUID()}.json`);
    await writeFile(rutaMovimientosJson, JSON.stringify(movimientosJson));

    let resultado;
    try {
      resultado = await PythonShell.run(
        "python/bank_reconciliation.py",
        {
          pythonPath: resolvePythonPath(),
          args: [
            "",
            process.env.DB_HOST || "localhost",
            process.env.DB_USER || "root",
            process.env.DB_PASSWORD || "MYSQL",
            process.env.DB_NAME || "seamar",
            moneda,
            rutaMovimientosJson,
          ],
        }
      );
    } finally {
      await unlink(rutaMovimientosJson).catch(() => {});
    }

    const json = JSON.parse(resultado.join(""));

    const connection = await pool.getConnection();

    console.log("[REEJ] Conexion obtenida, iniciando reejecucion...");
    await connection.beginTransaction();

    let lastQuery = "NONE";
    try {
      lastQuery = "DELETE coincidencias";

      await connection.query(
        `DELETE cmc FROM conciliacion_movimiento_coincidencias cmc
         JOIN conciliacion_movimientos cm ON cmc.movimiento_id = cm.id
         WHERE cm.conciliacion_id = ?`,
        [id]
      );

      lastQuery = "DELETE observaciones";
      await connection.query(
        "DELETE FROM conciliacion_observaciones WHERE conciliacion_id = ?",
        [id]
      );

      lastQuery = "DELETE movimientos";
      await connection.query(
        "DELETE FROM conciliacion_movimientos WHERE conciliacion_id = ?",
        [id]
      );

      console.log("[REEJ] Datos anteriores eliminados");

      const movimientos = Array.isArray(json.movimientos) ? json.movimientos : [];

      let totalMovInsertados = 0;
      let totalCoinInsertadas = 0;
      let totalObsInsertadas = 0;
      let totalConciliados = 0;
      let totalObservaciones = 0;
      let totalPendientes = 0;

      for (let i = 0; i < movimientos.length; i++) {
        const movimiento = movimientos[i];

        lastQuery = "[REEJ] INSERT conciliacion_movimientos (movimiento " + i + ")";

        const origen = movimiento.tipo === "credito" ? "CUENTA_POR_COBRAR" : "CUENTA_POR_PAGAR";

        let documentoId = null;
        const coincidencias = Array.isArray(movimiento.coincidencias) ? movimiento.coincidencias : [];
        if (movimiento.estado === "conciliado" && coincidencias.length === 1) {
          documentoId = Number(coincidencias[0].id);
        }

        const [movResult]: any = await connection.query(
          `INSERT INTO conciliacion_movimientos
           (conciliacion_id, fecha, referencia, descripcion, monto, moneda, tipo, estado, origen, documento_id, conciliado_manual, fecha_registro)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            id,
            movimiento.fecha ?? null,
            movimiento.referencia ?? null,
            movimiento.descripcion ?? null,
            movimiento.monto ?? 0,
            movimiento.moneda ?? null,
            movimiento.tipo ?? null,
            movimiento.estado ?? "pendiente",
            origen,
            documentoId,
            0,
          ]
        );

        totalMovInsertados++;

        const movimientoId = movResult.insertId;

        if (movimientoId === undefined || movimientoId === null || movimientoId === 0) {
          throw new Error("[REEJ] insertId es " + movimientoId + " para conciliacion_movimientos [" + i + "]");
        }

        movimiento["id"] = String(movimientoId);

        for (let j = 0; j < coincidencias.length; j++) {
          const coincidencia = coincidencias[j];

          lastQuery = "[REEJ] INSERT conciliacion_movimiento_coincidencias (movimiento " + i + " coincidencia " + j + ")";

          const [coinResult]: any = await connection.query(
            `INSERT INTO conciliacion_movimiento_coincidencias
             (movimiento_id, documento_id, origen, score, tipo, fecha_registro)
             VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              movimientoId,
              Number(coincidencia.id),
              coincidencia.origen ?? origen,
              null,
              null,
            ]
          );

          totalCoinInsertadas++;
        }

        if (movimiento.estado === "pendiente" && coincidencias.length === 0) {
          lastQuery = "[REEJ] INSERT conciliacion_observaciones NO_ENCONTRADA (movimiento " + i + ")";

          const [obsResult]: any = await connection.query(
            `INSERT INTO conciliacion_observaciones
             (conciliacion_id, factura, tipo, observacion, estado, fecha_creacion)
             VALUES (?, ?, 'NO_ENCONTRADA', ?, 'PENDIENTE', NOW())`,
            [
              id,
              movimiento.referencia ?? "-",
              "Movimiento del " + (movimiento.fecha ?? "fecha desconocida") + " por " + (movimiento.monto ?? 0) + " no encontró coincidencias en el sistema.",
            ]
          );

          totalObsInsertadas++;
        } else if (movimiento.estado === "observacion") {
          lastQuery = "[REEJ] INSERT conciliacion_observaciones OBSERVACION (movimiento " + i + ")";

          const [obsResult]: any = await connection.query(
            `INSERT INTO conciliacion_observaciones
             (conciliacion_id, factura, tipo, observacion, estado, fecha_creacion)
             VALUES (?, ?, 'NO_ENCONTRADA', ?, 'PENDIENTE', NOW())`,
            [
              id,
              movimiento.referencia ?? "-",
              "Movimiento del " + (movimiento.fecha ?? "fecha desconocida") + " por " + (movimiento.monto ?? 0) + " tiene múltiples coincidencias exactas (" + coincidencias.length + "). Requiere revisión manual.",
            ]
          );

          totalObsInsertadas++;
        }

        if (movimiento.estado === "conciliado" && coincidencias.length === 1) {
          lastQuery = "[REEJ] actualizarDocumentoPorConciliacion (movimiento " + i + ")";
          await actualizarDocumentoPorConciliacion(
            connection,
            coincidencias[0].origen,
            Number(coincidencias[0].id)
          );
        }

        if (movimiento.estado === "conciliado") totalConciliados++;
        else if (movimiento.estado === "observacion") totalObservaciones++;
        else totalPendientes++;
      }

      console.log("[REEJ] VERIFICACION COUNT conciliacion_movimientos: ", JSON.stringify(
        (await connection.query(
          "SELECT COUNT(*) AS total FROM conciliacion_movimientos WHERE conciliacion_id = ?",
          [id]
        ))[0]
      ));

      console.log("[REEJ] VERIFICACION COUNT coincidencias: ", JSON.stringify(
        (await connection.query(
          "SELECT COUNT(*) AS total FROM conciliacion_movimiento_coincidencias WHERE movimiento_id IN (SELECT id FROM conciliacion_movimientos WHERE conciliacion_id = ?)",
          [id]
        ))[0]
      ));

      console.log("[REEJ] VERIFICACION COUNT observaciones: ", JSON.stringify(
        (await connection.query(
          "SELECT COUNT(*) AS total FROM conciliacion_observaciones WHERE conciliacion_id = ?",
          [id]
        ))[0]
      ));

      lastQuery = "[REEJ] UPDATE conciliaciones_bancarias";

      const [updateResult]: any = await connection.query(
        `UPDATE conciliaciones_bancarias
         SET total_movimientos = ?, conciliados = ?, observaciones = ?, pendientes = ?, fecha_proceso = NOW()
         WHERE id = ?`,
        [
          movimientos.length,
          totalConciliados,
          totalObservaciones,
          totalPendientes,
          id,
        ]
      );

      lastQuery = "[REEJ] COMMIT";
      await connection.commit();
      console.log("[REEJ] COMMIT EJECUTADO");

      const [postCommitRows]: any = await pool.query(
        "SELECT * FROM conciliaciones_bancarias WHERE id = ?",
        [id]
      );

      if (postCommitRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "La conciliación no se guardó en la base de datos (0 filas post-commit)." },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ...json,
        conciliacionId: id,
      });
    } catch (txError: any) {
      console.log("[REEJ] EXCEPCION en consulta: " + lastQuery);
      console.log("[REEJ] MENSAJE: " + txError.message);
      console.log("[REEJ] STACK: " + (txError.stack || "no stack"));
      await connection.rollback();
      console.log("[REEJ] ROLLBACK EJECUTADO");
      throw txError;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.log("[REEJ] EXCEPCION FUERA DE TRANSACCION: " + error.message);
    console.log("[REEJ] STACK: " + (error.stack || "no stack"));
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
