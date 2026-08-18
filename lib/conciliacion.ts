import type { PoolConnection } from "mysql2/promise";

export async function actualizarDocumentoPorConciliacion(
  connection: PoolConnection,
  origen: string,
  documentoId: number
): Promise<void> {
  if (origen === "CUENTA_POR_COBRAR") {
    await connection.query(
      `UPDATE cuentas_por_cobrar
       SET estado = 'COBRADO',
           saldo = 0
       WHERE id = ? AND estado != 'COBRADO'`,
      [documentoId]
    );
  } else if (origen === "CUENTA_POR_PAGAR") {
    await connection.query(
      `UPDATE cuentas_por_pagar
       SET estado = 'PAGADO',
           saldo = 0
       WHERE id = ? AND estado != 'PAGADO'`,
      [documentoId]
    );
  }
}
