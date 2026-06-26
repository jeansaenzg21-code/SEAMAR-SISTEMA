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
  if (!valor) return 0;

  const texto = valorComoTexto(valor)
    .replace("S/.", "")
    .replace("S/", "")
    .replace(",", ".")
    .trim();

  return Number(texto) || 0;
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
  titulo: string
) {
  const row = sheet.getRow(filaTitulo);

  for (let c = 1; c <= sheet.columnCount; c++) {
    const texto = valorComoTexto(
      row.getCell(c).value
    )
      .toLowerCase()
      .trim();

    if (texto.includes(titulo)) {
      return c;
    }
  }

  return null;
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
      sheet.name.toLowerCase().startsWith("valor")
    );

  for (const sheet of hojasValor) {
    const otTexto = valorComoTexto(
      sheet.getCell("B1").value
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

    const colDescripcion =
      buscarColumnaPorTitulo(sheet, filaTitulos, "descrip");

    const colPU =
      buscarColumnaPorTitulo(sheet, filaTitulos, "p.u") ||
      buscarColumnaPorTitulo(sheet, filaTitulos, "pu");

    const colTotal =
      buscarColumnaPorTitulo(sheet, filaTitulos, "total");

    if (!colDescripcion || !colPU || !colTotal) {
      continue;
    }

    const filaDatos =
      sheet.getRow(filaTitulos + 1);

    const descripcion =
      valorComoTexto(
        filaDatos.getCell(colDescripcion).value
      );

    const pu =
      valorComoNumero(
        filaDatos.getCell(colPU).value
      );

    const total =
      valorComoNumero(
        filaDatos.getCell(colTotal).value
      );

    const fechaInicio =
      buscarPrimeraFecha(sheet);

    if (!descripcion || !total) {
      continue;
    }

    valorizaciones.push({
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
      archivoOnedriveId: archivo.itemId,
      archivoUrl: archivo.webUrl,

      hojaExcel: sheet.name,
    });
  }

  return valorizaciones;
} 