import { NextResponse } from "next/server";
import { writeFile, readFile, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { PythonShell } from "python-shell";
import pool from "@/lib/mysql";
import { actualizarDocumentoPorConciliacion } from "@/lib/conciliacion";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;

    const [rows]: any = await pool.query(
      "SELECT archivo_ruta, moneda FROM conciliaciones_bancarias WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: "Conciliación no encontrada" },
        { status: 404 }
      );
    }

    const rutaPerm = rows[0].archivo_ruta;
    const moneda = rows[0].moneda || "PEN";

    if (!rutaPerm || !existsSync(rutaPerm)) {
      return NextResponse.json(
        { success: false, error: "El archivo de extracto bancario ya no está disponible. Vuelve a subir el archivo." },
        { status: 404 }
      );
    }

    const buffer = await readFile(rutaPerm);
    const rutaTemp = join(tmpdir(), `bank_${randomUUID()}.xlsx`);
    await writeFile(rutaTemp, buffer);

    let resultado;
    try {
      resultado = await PythonShell.run(
        "python/bank_reconciliation.py",
        {
          pythonPath: process.env.PYTHON_PATH,
          args: [
            rutaTemp,
            process.env.DB_HOST || "localhost",
            process.env.DB_USER || "root",
            process.env.DB_PASSWORD || "MYSQL",
            process.env.DB_NAME || "seamar",
            moneda,
          ],
        }
      );
    } finally {
      await unlink(rutaTemp).catch(() => {});
    }

    const json = JSON.parse(resultado.join(""));

    const connection = await pool.getConnection();

    console.log("[REEJ] DIAG CONNECTION PARAMS:", JSON.stringify({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password_length: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0,
    }));

    const [dbInfo]: any = await connection.query("SELECT DATABASE() AS db, @@hostname AS host, @@port AS port");
    console.log("[REEJ] DIAG MYSQL CONNECTION INFO:", JSON.stringify(dbInfo));

    const [countsBefore]: any = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM conciliaciones_bancarias) AS conciliaciones,
        (SELECT COUNT(*) FROM conciliacion_movimientos) AS movimientos,
        (SELECT COUNT(*) FROM conciliacion_movimiento_coincidencias) AS coincidencias,
        (SELECT COUNT(*) FROM conciliacion_observaciones) AS observaciones
    `);
    console.log("[REEJ] DIAG TABLE COUNTS BEFORE INSERT:", JSON.stringify(countsBefore));

    console.log("[REEJ] BEGIN TRANSACTION");
    await connection.beginTransaction();

    let lastQuery = "NONE";
    try {
      lastQuery = "DELETE coincidencias";

      const [delCoinResult]: any = await connection.query(
        `DELETE cmc FROM conciliacion_movimiento_coincidencias cmc
         JOIN conciliacion_movimientos cm ON cmc.movimiento_id = cm.id
         WHERE cm.conciliacion_id = ?`,
        [id]
      );
      console.log("[REEJ] RESULT DELETE coincidencias: affectedRows=" + delCoinResult.affectedRows + " warningStatus=" + delCoinResult.warningStatus);

      lastQuery = "DELETE observaciones";
      const [delObsResult]: any = await connection.query(
        "DELETE FROM conciliacion_observaciones WHERE conciliacion_id = ?",
        [id]
      );
      console.log("[REEJ] RESULT DELETE observaciones: affectedRows=" + delObsResult.affectedRows + " warningStatus=" + delObsResult.warningStatus);

      lastQuery = "DELETE movimientos";
      const [delMovResult]: any = await connection.query(
        "DELETE FROM conciliacion_movimientos WHERE conciliacion_id = ?",
        [id]
      );
      console.log("[REEJ] RESULT DELETE movimientos: affectedRows=" + delMovResult.affectedRows + " warningStatus=" + delMovResult.warningStatus);

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

        console.log("[REEJ] RESULT INSERT conciliacion_movimientos [" + i + "]: affectedRows=" + movResult.affectedRows + " insertId=" + movResult.insertId + " warningStatus=" + movResult.warningStatus);
        totalMovInsertados++;

        const movimientoId = movResult.insertId;

        if (movimientoId === undefined || movimientoId === null || movimientoId === 0) {
          throw new Error("[REEJ] insertId es " + movimientoId + " para conciliacion_movimientos [" + i + "]");
        }

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

          console.log("[REEJ] RESULT INSERT coincidencias [" + i + "][" + j + "]: affectedRows=" + coinResult.affectedRows + " insertId=" + coinResult.insertId + " warningStatus=" + coinResult.warningStatus);
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

          console.log("[REEJ] RESULT INSERT observaciones NO_ENCONTRADA [" + i + "]: affectedRows=" + obsResult.affectedRows + " insertId=" + obsResult.insertId + " warningStatus=" + obsResult.warningStatus);
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

          console.log("[REEJ] RESULT INSERT observaciones OBSERVACION [" + i + "]: affectedRows=" + obsResult.affectedRows + " insertId=" + obsResult.insertId + " warningStatus=" + obsResult.warningStatus);
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

      console.log("[REEJ] RESULT UPDATE conciliaciones_bancarias: affectedRows=" + updateResult.affectedRows + " warningStatus=" + updateResult.warningStatus);

      lastQuery = "[REEJ] COMMIT";
      await connection.commit();
      console.log("[REEJ] COMMIT EJECUTADO");

      const [postCommitRows]: any = await pool.query(
        "SELECT * FROM conciliaciones_bancarias WHERE id = ?",
        [id]
      );

      console.log("[REEJ] VERIFICACION POST-COMMIT:", JSON.stringify(postCommitRows));

      if (postCommitRows.length === 0) {
        console.log("[REEJ] RESULTADO: El registro con id " + id + " NO EXISTE después del COMMIT.");
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
