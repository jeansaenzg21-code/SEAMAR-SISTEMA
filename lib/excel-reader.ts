import ExcelJS from "exceljs";

export async function leerExcel(buffer: any) {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer as any);

  let contenido = "";

  workbook.eachSheet((sheet) => {
    contenido += `\nHOJA: ${sheet.name}\n`;

    sheet.eachRow((row) => {
      const valores = row.values as any[];
      contenido += valores.join(" | ") + "\n";
    });
  });

  return contenido;
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

function buscarPrimeraFecha(sheet: ExcelJS.Worksheet) {
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    for (let c = 1; c <= sheet.columnCount; c++) {
      const fecha = normalizarFecha(
        row.getCell(c).value
      );

      if (fecha) {
        return fecha;
      }
    }
  }

  return null;
}

function buscarFilaTitulos(sheet: ExcelJS.Worksheet) {
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    let tieneDescripcion = false;
    let tienePU = false;
    let tieneTotal = false;

    for (let c = 1; c <= sheet.columnCount; c++) {
      const texto = valorComoTexto(
        row.getCell(c).value
      )
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

  return null;
}

function buscarColumnaPorTitulo(
  sheet: ExcelJS.Worksheet,
  filaTitulo: number,
  tipo: "descripcion" | "pu" | "total"
) {
  const row = sheet.getRow(filaTitulo);

  for (let c = 1; c <= sheet.columnCount; c++) {
    const texto = valorComoTexto(row.getCell(c).value)
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
  sheet: ExcelJS.Worksheet,
  filaTitulos: number,
  colDescripcion: number,
  colPU: number,
  colTotal: number
) {
  for (let r = filaTitulos + 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    const descripcion = valorComoTexto(
      row.getCell(colDescripcion).value
    ).trim();

    const pu = valorComoNumero(
      row.getCell(colPU).value
    );

    const total = valorComoNumero(
      row.getCell(colTotal).value
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

function buscarTotalFinalHoja(sheet: ExcelJS.Worksheet) {
  let totalFinal = 0;

  for (let r = 1; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);

    for (let c = 1; c <= sheet.columnCount; c++) {
      const texto = valorComoTexto(row.getCell(c).value)
        .toLowerCase()
        .replace(/\s/g, "")
        .trim();

      if (texto === "totals/." || texto === "total" || texto.includes("totals/")) {
        for (let rr = r + 1; rr <= sheet.rowCount; rr++) {
          const posibleTotal = valorComoNumero(
            sheet.getRow(rr).getCell(c).value
          );

          if (posibleTotal > totalFinal) {
            totalFinal = posibleTotal;
          }
        }

        for (let cc = c; cc <= sheet.columnCount; cc++) {
          const posibleTotal = valorComoNumero(
            row.getCell(cc).value
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
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(buffer as any);

  const valorizaciones: any[] = [];

    const hojasValor =
  workbook.worksheets.filter((sheet) =>
    /^valor\s*\d+/i.test(sheet.name.trim())
  );
  

hojasValor.sort((a, b) => {
  const numA = Number(a.name.replace(/\D/g, ""));
  const numB = Number(b.name.replace(/\D/g, ""));

  return numA - numB;
});

  for (const sheet of hojasValor) {
    const otTexto = valorComoTexto(
      sheet.getCell("B1").value
    );

    console.log(
  "Hojas Valor detectadas:",
  hojasValor.map((h) => h.name)
);

    const numeroOT =
      otTexto
        .replace("OT:", "")
        .replace("OT", "")
        .trim();

    const filaTitulos =
      buscarFilaTitulos(sheet);

    if (!filaTitulos) {
      continue;
    }




    const colDescripcion = 2; // B = Descripción
const colPU = 3;          // C = P.U

const colTotal =
  buscarColumnaPorTitulo(sheet, filaTitulos, "total") || 6;

    if (!colDescripcion || !colPU || !colTotal) {
      continue;
    }

    const filaDatos =
  buscarFilaDatosReal(
    sheet,
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
        filaDatos.getCell(colDescripcion).value
      );

    const pu =
      valorComoNumero(
        filaDatos.getCell(colPU).value
      );

    const totalFinalHoja =
  buscarTotalFinalHoja(sheet);

const total =
  totalFinalHoja > 0
    ? totalFinalHoja
    : valorComoNumero(filaDatos.getCell(colTotal).value);

    const fechaInicio =
      buscarPrimeraFecha(sheet);

       const numeroValor =
  sheet.name.match(/\d+/)?.[0];

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

      proveedor: "REPSOL COMERCIAL SAC",
cliente: "REPSOL COMERCIAL SAC",
ruc: "20503840121",

      descripcion,
      pu,
      monto: total,
      total,

      moneda: "PEN",

      fechaEjecucion: fechaInicio,
      fechaInicio,

      negocioOperacion: "REPSOL COMERCIAL SAC",
      numeroOrdenServicio: numeroOT,

      archivoNombre: archivo.nombre,
      archivoOnedriveId: archivo.itemId || archivo.id,
      archivoUrl: archivo.webUrl,

      hojaExcel: sheet.name,
    });
  }

  return valorizaciones;
} 