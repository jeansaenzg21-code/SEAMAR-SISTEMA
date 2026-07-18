import type { PoolConnection } from "mysql2/promise";

export async function actualizarDocumentoPorConciliacion(
  connection: PoolConnection,
  origen: string,
  documentoId: number
): Promise<void> {
  if (origen === "CUENTA_POR_COBRAR") {
    const [result]: any = await connection.query(
      `UPDATE cuentas_por_cobrar
       SET estado = 'COBRADO',
           saldo = 0
       WHERE id = ? AND estado != 'COBRADO'`,
      [documentoId]
    );
    console.log("[DIAG-CONCILIACION] UPDATE cuentas_por_cobrar RESULT:", JSON.stringify(result));
  } else if (origen === "CUENTA_POR_PAGAR") {
    const [result]: any = await connection.query(
      `UPDATE cuentas_por_pagar
       SET estado = 'PAGADO',
           saldo = 0
       WHERE id = ? AND estado != 'PAGADO'`,
      [documentoId]
    );
    console.log("[DIAG-CONCILIACION] UPDATE cuentas_por_pagar RESULT:", JSON.stringify(result));
  } else {
    console.log("[DIAG-CONCILIACION] origen desconocido:", origen, "— no se actualizó ningún documento");
  }
}
