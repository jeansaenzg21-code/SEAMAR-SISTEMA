import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createHash, randomUUID } from "crypto";
import { PythonShell } from "python-shell";
import pool from "@/lib/mysql";
import { actualizarDocumentoPorConciliacion } from "@/lib/conciliacion";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const archivo = formData.get("archivo") as File;

    if (!archivo) {
      return NextResponse.json(
        { success: false, error: "No se recibió archivo" },
        { status: 400 }
      );
    }

    const moneda = (formData.get("moneda") as string) || "PEN";

    const bytes = await archivo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const hash = createHash("sha256").update(buffer).digest("hex");

    const [existing]: any = await pool.query(
      "SELECT id, archivo_nombre FROM conciliaciones_bancarias WHERE archivo_hash = ? AND moneda = ? LIMIT 1",
      [hash, moneda]
    );

    if (existing.length > 0) {
      return NextResponse.json({
        duplicate: true,
        conciliacionId: existing[0].id,
        archivoNombre: existing[0].archivo_nombre,
      });
    }

    const rutaArchivo = join(tmpdir(), `bank_${randomUUID()}.xlsx`);
    await writeFile(rutaArchivo, buffer);

    let resultado;
    try {
      resultado = await PythonShell.run(
        "python/bank_reconciliation.py",
        {
          pythonPath: process.env.PYTHON_PATH,
          args: [
            rutaArchivo,
            process.env.DB_HOST || "localhost",
            process.env.DB_USER || "root",
            process.env.DB_PASSWORD || "MYSQL",
            process.env.DB_NAME || "seamar",
            moneda,
          ],
        }
      );
    } finally {
      await unlink(rutaArchivo).catch(() => {});
    }

    const json = JSON.parse(resultado.join(""));

    const connection = await pool.getConnection();

    console.log("DIAG CONNECTION PARAMS:", JSON.stringify({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password_length: process.env.DB_PASSWORD ? process.env.DB_PASSWORD.length : 0,
    }));

    const [dbInfo]: any = await connection.query("SELECT DATABASE() AS db, @@hostname AS host, @@port AS port");
    console.log("DIAG MYSQL CONNECTION INFO:", JSON.stringify(dbInfo));

    const [countsBefore]: any = await connection.query(`
      SELECT
        (SELECT COUNT(*) FROM conciliaciones_bancarias) AS conciliaciones,
        (SELECT COUNT(*) FROM conciliacion_movimientos) AS movimientos,
        (SELECT COUNT(*) FROM conciliacion_movimiento_coincidencias) AS coincidencias,
        (SELECT COUNT(*) FROM conciliacion_observaciones) AS observaciones
    `);
    console.log("DIAG TABLE COUNTS BEFORE INSERT:", JSON.stringify(countsBefore));

    console.log("BEGIN TRANSACTION");
    await connection.beginTransaction();

    let lastQuery = "NONE";
    try {
      lastQuery = "INSERT conciliaciones_bancarias";

      const [headerResult]: any = await connection.query(
        `INSERT INTO conciliaciones_bancarias
         (archivo_nombre, archivo_hash, moneda, total_movimientos, conciliados, observaciones, pendientes, usuario, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          archivo.name, hash, moneda,
          0, 0, 0, 0,
          "ADMIN", "PROCESADA",
        ]
      );

      console.log("RESULT INSERT conciliaciones_bancarias:", JSON.stringify(headerResult));

      const conciliacionId = headerResult.insertId;

      if (conciliacionId === undefined || conciliacionId === null || conciliacionId === 0) {
        throw new Error("insertId es " + conciliacionId + " — el registro NO fue creado en conciliaciones_bancarias");
      }

      lastQuery = "SELECT verificación conciliaciones_bancarias";
      const [verifyHeader]: any = await connection.query(
        "SELECT * FROM conciliaciones_bancarias WHERE id = ?",
        [conciliacionId]
      );

      console.log("VERIFICACION conciliaciones_bancarias post-INSERT:", JSON.stringify(verifyHeader));

      if (verifyHeader.length !== 1) {
        throw new Error(
          "VERIFICACION FALLIDA: SELECT FROM conciliaciones_bancarias WHERE id = " + conciliacionId +
          " devolvió " + verifyHeader.length + " filas (se esperaba 1). " +
          "El INSERT de cabecera no persistió el registro dentro de la transacción."
        );
      }

      const movimientos = Array.isArray(json.movimientos) ? json.movimientos : [];

      let totalMovInsertados = 0;
      let totalCoinInsertadas = 0;
      let totalObsInsertadas = 0;
      let totalConciliados = 0;
      let totalObservaciones = 0;
      let totalPendientes = 0;

      for (let i = 0; i < movimientos.length; i++) {
        const movimiento = movimientos[i];

        lastQuery = "INSERT conciliacion_movimientos (movimiento " + i + ")";

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
             conciliacionId,
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

        console.log("RESULT INSERT conciliacion_movimientos [" + i + "]: affectedRows=" + movResult.affectedRows + " insertId=" + movResult.insertId + " warningStatus=" + movResult.warningStatus);
        totalMovInsertados++;

        const movimientoId = movResult.insertId;

        if (movimientoId === undefined || movimientoId === null || movimientoId === 0) {
          throw new Error("insertId es " + movimientoId + " para conciliacion_movimientos [" + i + "]");
        }

        for (let j = 0; j < coincidencias.length; j++) {
          const coincidencia = coincidencias[j];

          lastQuery = "INSERT conciliacion_movimiento_coincidencias (movimiento " + i + " coincidencia " + j + ")";

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

          console.log("RESULT INSERT conciliacion_movimiento_coincidencias [" + i + "][" + j + "]: affectedRows=" + coinResult.affectedRows + " insertId=" + coinResult.insertId + " warningStatus=" + coinResult.warningStatus);
          totalCoinInsertadas++;
        }

        if (movimiento.estado === "pendiente" && coincidencias.length === 0) {
          lastQuery = "INSERT conciliacion_observaciones NO_ENCONTRADA (movimiento " + i + ")";

          const [obsResult]: any = await connection.query(
            `INSERT INTO conciliacion_observaciones
             (conciliacion_id, factura, tipo, observacion, estado, fecha_creacion)
             VALUES (?, ?, 'NO_ENCONTRADA', ?, 'PENDIENTE', NOW())`,
            [
              conciliacionId,
              movimiento.referencia ?? "-",
              "Movimiento del " + (movimiento.fecha ?? "fecha desconocida") + " por " + (movimiento.monto ?? 0) + " no encontró coincidencias en el sistema.",
            ]
          );

          console.log("RESULT INSERT conciliacion_observaciones NO_ENCONTRADA [" + i + "]: affectedRows=" + obsResult.affectedRows + " insertId=" + obsResult.insertId + " warningStatus=" + obsResult.warningStatus);
          totalObsInsertadas++;
        } else if (movimiento.estado === "observacion") {
          lastQuery = "INSERT conciliacion_observaciones OBSERVACION (movimiento " + i + ")";

          const [obsResult]: any = await connection.query(
            `INSERT INTO conciliacion_observaciones
             (conciliacion_id, factura, tipo, observacion, estado, fecha_creacion)
             VALUES (?, ?, 'NO_ENCONTRADA', ?, 'PENDIENTE', NOW())`,
            [
              conciliacionId,
              movimiento.referencia ?? "-",
              "Movimiento del " + (movimiento.fecha ?? "fecha desconocida") + " por " + (movimiento.monto ?? 0) + " tiene múltiples coincidencias exactas (" + coincidencias.length + "). Requiere revisión manual.",
            ]
          );

          console.log("RESULT INSERT conciliacion_observaciones OBSERVACION [" + i + "]: affectedRows=" + obsResult.affectedRows + " insertId=" + obsResult.insertId + " warningStatus=" + obsResult.warningStatus);
          totalObsInsertadas++;
        }

        if (movimiento.estado === "conciliado" && coincidencias.length === 1) {
          lastQuery = "actualizarDocumentoPorConciliacion (movimiento " + i + ")";
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

      console.log("VERIFICACION COUNT conciliacion_movimientos: ", JSON.stringify(
        (await connection.query(
          "SELECT COUNT(*) AS total FROM conciliacion_movimientos WHERE conciliacion_id = ?",
          [conciliacionId]
        ))[0]
      ));

      console.log("VERIFICACION COUNT conciliacion_movimiento_coincidencias: ", JSON.stringify(
        (await connection.query(
          "SELECT COUNT(*) AS total FROM conciliacion_movimiento_coincidencias WHERE movimiento_id IN (SELECT id FROM conciliacion_movimientos WHERE conciliacion_id = ?)",
          [conciliacionId]
        ))[0]
      ));

      console.log("VERIFICACION COUNT conciliacion_observaciones: ", JSON.stringify(
        (await connection.query(
          "SELECT COUNT(*) AS total FROM conciliacion_observaciones WHERE conciliacion_id = ?",
          [conciliacionId]
        ))[0]
      ));

      lastQuery = "UPDATE conciliaciones_bancarias";

      const [updateResult]: any = await connection.query(
        `UPDATE conciliaciones_bancarias
         SET total_movimientos = ?, conciliados = ?, observaciones = ?, pendientes = ?
         WHERE id = ?`,
        [
          movimientos.length,
          totalConciliados,
          totalObservaciones,
          totalPendientes,
          conciliacionId,
        ]
      );

      console.log("RESULT UPDATE conciliaciones_bancarias: affectedRows=" + updateResult.affectedRows + " warningStatus=" + updateResult.warningStatus);

      lastQuery = "Guardar archivo y UPDATE archivo_ruta";

      const dirUploads = join(process.cwd(), "uploads", "conciliaciones");
      if (!existsSync(dirUploads)) {
        mkdirSync(dirUploads, { recursive: true });
      }
      const rutaPerm = join(dirUploads, conciliacionId + ".xlsx");
      await writeFile(rutaPerm, buffer);

      const [rutaUpdateResult]: any = await connection.query(
        "UPDATE conciliaciones_bancarias SET archivo_ruta = ? WHERE id = ?",
        [rutaPerm, conciliacionId]
      );

      console.log("RESULT UPDATE archivo_ruta: affectedRows=" + rutaUpdateResult.affectedRows + " warningStatus=" + rutaUpdateResult.warningStatus);

      lastQuery = "COMMIT";

      await connection.commit();
      console.log("COMMIT EJECUTADO");

      console.log("=== DIAG POST-COMMIT ===");
      console.log(JSON.stringify(
        (await pool.query("SELECT DATABASE() AS database_name, @@hostname AS hostname, @@port AS port"))[0]
      ));
      console.log(JSON.stringify(
        (await pool.query("SHOW TABLE STATUS LIKE 'conciliaciones_bancarias'"))[0]
      ));
      console.log(JSON.stringify(
        (await pool.query("SELECT id, archivo_nombre, moneda FROM conciliaciones_bancarias ORDER BY id DESC"))[0]
      ));
      console.log(JSON.stringify(
        (await pool.query("SELECT id, conciliacion_id, estado, documento_id FROM conciliacion_movimientos ORDER BY id DESC LIMIT 10"))[0]
      ));
      console.log("=== CONNECTION CONFIG ===");
      console.log(JSON.stringify({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
      }));
      console.log("=== END DIAG ===");

      return NextResponse.json({
        ...json,
        conciliacionId,
      });
    } catch (txError: any) {
      console.log("EXCEPCION en consulta: " + lastQuery);
      console.log("MENSAJE: " + txError.message);
      console.log("STACK: " + (txError.stack || "no stack"));
      await connection.rollback();
      console.log("ROLLBACK EJECUTADO");
      throw txError;
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.log("EXCEPCION FUERA DE TRANSACCION: " + error.message);
    console.log("STACK: " + (error.stack || "no stack"));
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
