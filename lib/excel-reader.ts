import * as XLSX from "xlsx";

function sheetToArray(sheet: XLSX.WorkSheet): any[][] {
  const ref = sheet["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const rows: any[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: any[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      row.push(sheet[addr]?.v);
    }
    rows.push(row);
  }
  return rows;
}

function valorComoTexto(valor: any) {
  if (!valor) return "";

  if (typeof valor === "object") {
    if ("text" in valor) return String(valor.text);
    if ("result" in valor) return String(valor.result);
    if ("richText" in valor) {
      return valor.richText.map((r: any) => r.text).join("");
    }
  }

  return String(valor);
}

function valorComoNumero(valor: any) {
  if (valor === null || valor === undefined || valor === "") return 0;

  if (typeof valor === "number") {
    return Number(valor.toFixed(2));
  }

  if (typeof valor === "object") {
    if ("result" in valor && typeof valor.result === "number") {
      return Number(valor.result.toFixed(2));
    }

    if ("value" in valor && typeof valor.value === "number") {
      return Number(valor.value.toFixed(2));
    }
  }

  let texto = valorComoTexto(valor)
    .replace("S/.", "")
    .replace("S/", "")
    .trim();

  if (texto.includes(",") && texto.includes(".")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (texto.includes(",")) {
    texto = texto.replace(",", ".");
  }

  const numero = Number(texto);

  return Number.isFinite(numero)
    ? Number(numero.toFixed(2))
    : 0;
}

function normalizarFecha(fecha: any) {
  if (!fecha) return null;

  if (fecha instanceof Date) {
    return fecha;
  }

  const texto = valorComoTexto(fecha).trim();

  const match = texto.match(/\d{1,2}\/\d{1,2}\/\d{4}/);

  if (!match) return null;

  const [dia, mes, anio] = match[0].split("/");

  return new Date(
    Number(anio),
    Number(mes) - 1,
    Number(dia)
  );
}

function buscarPrimeraFecha(data: any[][]) {
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;

    for (let c = 0; c < row.length; c++) {
      const fecha = normalizarFecha(row[c]);

      if (fecha) {
        return fecha;
      }
    }
  }

  return null;
}

function buscarFilaTitulos(data: any[][]) {
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;

    let tieneDescripcion = false;
    let tienePU = false;
    let tieneTotal = false;

    for (let c = 0; c < row.length; c++) {
      const texto = valorComoTexto(row[c])
        .toLowerCase()
        .trim();

      if (texto.includes("descripción") || texto.includes("descripcion")) {
        tieneDescripcion = true;
      }

      if (texto.includes("p.u") || texto.includes("pu")) {
        tienePU = true;
      }

      if (texto.includes("total")) {
        tieneTotal = true;
      }
    }

    if (tieneDescripcion && tienePU && tieneTotal) {
      return r;
    }
  }

  return -1;
}

function buscarColumnaPorTitulo(
  data: any[][],
  filaTitulo: number,
  tipo: "descripcion" | "pu" | "total"
) {
  const row = data[filaTitulo];
  if (!row) return null;

  for (let c = 0; c < row.length; c++) {
    const texto = valorComoTexto(row[c])
      .toLowerCase()
      .replace(/\s/g, "")
      .trim();

    if (
      tipo === "descripcion" &&
      (texto.includes("descripción") || texto.includes("descripcion"))
    ) {
      return c;
    }

    if (
      tipo === "pu" &&
      (texto === "p.u." || texto === "p.u" || texto === "pu")
    ) {
      return c;
    }

    if (
      tipo === "total" &&
      texto.includes("total") &&
      !texto.includes("subtotal")
    ) {
      return c;
    }
  }

  return null;
}

function buscarFilaDatosReal(
  data: any[][],
  filaTitulos: number,
  colDescripcion: number,
  colPU: number,
  colTotal: number
) {
  for (let r = filaTitulos + 1; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;

    const descripcion = valorComoTexto(
      row[colDescripcion]
    ).trim();

    const pu = valorComoNumero(
      row[colPU]
    );

    const total = valorComoNumero(
      row[colTotal]
    );

    if (!descripcion) continue;

    if (
      descripcion.toLowerCase().includes("repsol") ||
      descripcion.toLowerCase().includes("subtotal") ||
      descripcion.toLowerCase().includes("total")
    ) {
      continue;
    }

    if (pu > 0) {
  return row;
}
  }

  return null;
}

function buscarTotalFinalHoja(data: any[][]) {
  let totalFinal = 0;

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;

    for (let c = 0; c < row.length; c++) {
      const texto = valorComoTexto(row[c])
        .toLowerCase()
        .replace(/\s/g, "")
        .trim();

      if (texto === "totals/." || texto === "total" || texto.includes("totals/")) {
        for (let rr = r + 1; rr < data.length; rr++) {
          const posibleTotal = valorComoNumero(
            data[rr]?.[c]
          );

          if (posibleTotal > totalFinal) {
            totalFinal = posibleTotal;
          }
        }

        for (let cc = c; cc < row.length; cc++) {
          const posibleTotal = valorComoNumero(
            row[cc]
          );

          if (posibleTotal > totalFinal) {
            totalFinal = posibleTotal;
          }
        }
      }
    }
  }

  return totalFinal;
}

export async function leerValorizacionesExcel(
  buffer: any,
  archivo: any
) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellStyles: false,
    cellFormula: false,
    cellNF: false,
  });

const hojasValor =
  workbook.SheetNames.filter((name) =>
    /^valor\s*\d+/i.test(name.trim())
  );

hojasValor.sort((a, b) => {
  const numA = Number(a.replace(/\D/g, ""));
  const numB = Number(b.replace(/\D/g, ""));

  return numA - numB;
});

const valorizaciones: any[] = [];

  for (const sheetName of hojasValor) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const data = sheetToArray(sheet);

    const otTexto = valorComoTexto(
      data[0]?.[1]
    );

    const numeroOT =
      otTexto
        .replace("OT:", "")
        .replace("OT", "")
        .trim();

    const filaTitulos =
      buscarFilaTitulos(data);

    if (filaTitulos < 0) {
      continue;
    }

    const colDescripcion = 1; // B = Descripción (0-indexed)
const colPU = 2;          // C = P.U (0-indexed)

const colTotal =
  buscarColumnaPorTitulo(data, filaTitulos, "total") ?? 5;

    if (colDescripcion == null || colPU == null || colTotal == null) {
      continue;
    }

    const filaDatos =
  buscarFilaDatosReal(
    data,
    filaTitulos,
    colDescripcion,
    colPU,
    colTotal
  );

if (!filaDatos) {
  continue;
}

    const descripcion =
      valorComoTexto(
        filaDatos[colDescripcion]
      );

    const pu =
      valorComoNumero(
        filaDatos[colPU]
      );

    const totalFinalHoja =
  buscarTotalFinalHoja(data);

const total =
  totalFinalHoja > 0
    ? totalFinalHoja
    : valorComoNumero(filaDatos[colTotal]);

    const fechaInicio =
      buscarPrimeraFecha(data);

       const numeroValor =
  sheetName.match(/\d+/)?.[0];

if (!numeroValor) {
  continue;
}

const anioValor =
  fechaInicio?.getFullYear() ??
  new Date().getFullYear();

const codigoValorizacion =
  `VAL-${anioValor}-${numeroValor}`;

    if (!descripcion) {
  continue;
}

    valorizaciones.push({
      codigo: codigoValorizacion,
      tipoDocumento: "valorizacion",

      proveedor: process.env.EXCEL_DEFAULT_PROVEEDOR || "REPSOL COMERCIAL SAC",
      cliente: process.env.EXCEL_DEFAULT_PROVEEDOR || "REPSOL COMERCIAL SAC",
      ruc: process.env.EXCEL_DEFAULT_RUC || "20503840121",

      descripcion,
      pu,
      monto: total,
      total,

      moneda: process.env.EXCEL_DEFAULT_MONEDA || "PEN",

      fechaEjecucion: fechaInicio,
      fechaInicio,

      negocioOperacion: process.env.EXCEL_DEFAULT_NEGOCIO || "REPSOL COMERCIAL SAC",
      numeroOrdenServicio: numeroOT,

      archivoNombre: archivo.nombre,
      archivoOnedriveId: archivo.itemId || archivo.id,
      archivoUrl: archivo.webUrl,

      hojaExcel: sheetName,
    });
  }
  return valorizaciones;
}
