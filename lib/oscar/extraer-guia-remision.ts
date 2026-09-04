import OpenAI from "openai";
import crypto from "crypto";
import { OSCAR_GUIA_REMISION_PROMPT } from "@/lib/ai/oscar-guia-remision-prompt";
import type {
  BienGuiaRemision,
  GuiaRemisionDatos,
  OrigenGuiaRemision,
  ResultadoExtraccionMultiGuia,
} from "./guias-remision-types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// =============================================================================
// Constantes
// =============================================================================

const DPI_RENDERIZADO = 300;
const CALIDAD_JPEG = 95;
const MODELO = process.env.OPENAI_MODEL || "gpt-4o";

// =============================================================================
// Renderizado de PDF → imágenes por página
// =============================================================================

let _pdfjsLoaded = false;

async function renderPdfPaginas(buffer: Buffer): Promise<{
  imagenes: Buffer[];
  textos: string[];
}> {
  const [
    { createCanvas, DOMMatrix: Dm },
    pdfjsLib,
  ] = await Promise.all([
    import("@napi-rs/canvas"),
    import("pdfjs-dist/legacy/build/pdf.mjs"),
  ]);

  if (!_pdfjsLoaded) {
    (globalThis as any).DOMMatrix = Dm;
    _pdfjsLoaded = true;
  }

  const pathMod = await import("path");
  const wasmDir =
    pathMod
      .join(process.cwd(), "node_modules", "pdfjs-dist", "wasm")
      .replace(/\\/g, "/") + "/";

  const data = new Uint8Array(buffer);
  const doc = await (pdfjsLib as any).getDocument({
    data,
    wasmUrl: wasmDir,
  }).promise;

  const numPages: number = doc.numPages;
  console.log(`[GUIAS-REMISION] PDF con ${numPages} página(s), DPI: ${DPI_RENDERIZADO}`);

  const imagenes: Buffer[] = [];
  const textos: string[] = [];

  for (let p = 1; p <= numPages; p++) {
    const page = await doc.getPage(p);

    // ========================================================================
    // Extraer el texto de la página (PDF de texto extraíble) como apoyo para
    // campos precisos (RUC, serie, número, etc.) que la imagen puede perder.
    // ========================================================================
    let textoPagina = "";
    try {
      const content = await page.getTextContent();
      const items = (content?.items || []) as any[];
      const lineas = new Map<
        number,
        Array<{ x: number; str: string }>
      >();
      for (const it of items) {
        if (typeof it?.str !== "string" || !it.str) continue;
        const y = Math.round(it.transform?.[5] ?? 0);
        const x = it.transform?.[4] ?? 0;
        if (!lineas.has(y)) lineas.set(y, []);
        lineas.get(y)!.push({ x, str: it.str });
      }
      const filas = Array.from(lineas.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, fila]) =>
          fila
            .sort((a, b) => a.x - b.x)
            .map((f) => f.str)
            .join(" ")
        );
      textoPagina = filas.join("\n");
    } catch {
      textoPagina = "";
    }

    const viewport = page.getViewport({ scale: DPI_RENDERIZADO / 72 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Detectar si la página está en landscape (horizontal)
    const esLandscape = viewport.width > viewport.height;
    console.log(
      `[GUIAS-REMISION] Página ${p}: ${viewport.width}x${viewport.height}px, landscape=${esLandscape}`
    );

    if (esLandscape) {
      // Rotar 90° en sentido horario para que el texto quede vertical
      const canvasRot = createCanvas(viewport.height, viewport.width);
      const ctxRot = canvasRot.getContext("2d");
      ctxRot.translate(viewport.height / 2, viewport.width / 2);
      ctxRot.rotate((-90 * Math.PI) / 180); // negativo = horario
      ctxRot.drawImage(canvas, -viewport.width / 2, -viewport.height / 2);
      imagenes.push(
        canvasRot.toBuffer("image/jpeg", CALIDAD_JPEG)
      );
      console.log(`[GUIAS-REMISION] Página ${p} rotada 90° → ${viewport.height}x${viewport.width}`);
    } else {
      imagenes.push(canvas.toBuffer("image/jpeg", CALIDAD_JPEG));
    }

    textos.push(textoPagina);
    if (textoPagina) {
      console.log(`[GUIAS-REMISION] Página ${p}: texto extraído (${textoPagina.length} caracteres)`);
    } else {
      console.log(`[GUIAS-REMISION] Página ${p}: SIN texto extraíble (documento escaneado)`);
    }
  }

  return { imagenes, textos };
}

function mimeTipoImagen(nombreArchivo: string): string {
  const ext = nombreArchivo.toLowerCase().split(".").pop() || "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

// =============================================================================
// Normalización
// =============================================================================

function parsearJson(texto: string): any {
  let limpio = texto;
  limpio = limpio.replace(/```json/g, "");
  limpio = limpio.replace(/```/g, "");
  limpio = limpio.trim();
  const inicio = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (inicio !== -1 && fin !== -1 && fin > inicio) {
    limpio = limpio.slice(inicio, fin + 1);
  }
  return JSON.parse(limpio);
}

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  if (!t || t === "-" || t === "\u2014" || t === "N/A") return null;
  return t;
}

function numero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(String(valor).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizarNumero(valor: unknown): string | null {
  const t = texto(valor);
  if (!t) return null;
  const digitos = t.replace(/\D+/g, "");
  return digitos === "" ? null : digitos;
}

function normalizarFecha(valor: unknown): string | null {
  const t = texto(valor);
  if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const slash = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (slash) {
    const [, d, m, y] = slash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function mapearBien(bien: any): BienGuiaRemision {
  return {
    codigoBien: texto(bien?.codigoBien ?? bien?.codigo_bien),
    descripcion: texto(bien?.descripcion),
    marca: texto(bien?.marca),
    modelo: texto(bien?.modelo),
    serie: texto(bien?.serie),
    ref: texto(bien?.ref),
    unidadMedida: texto(bien?.unidadMedida ?? bien?.unidad_medida),
    cantidad: numero(bien?.cantidad),
    accesorios: texto(bien?.accesorios),
    nroParte: texto(bien?.nroParte ?? bien?.nro_parte ?? bien?.nro_parte_),
    lote: texto(bien?.lote),
  };
}

// Los códigos de bien puramente numéricos con guiones (formato "###-#######-##",
// ej. "115-056312-00", "120-004559-00") NO son un código de bien real, sino parte
// del nombre del bien. Se mueven al inicio de la descripción y se limpia codigoBien.
const RE_CODIGO_NUMERICO_CON_GUIONES = /^[\d-]+$/;

function ponerCodigoNumericoEnDescripcion(b: BienGuiaRemision): BienGuiaRemision {
  const cod = b.codigoBien?.trim();
  if (!cod) return b;
  if (!cod.includes("-")) return b;
  if (!RE_CODIGO_NUMERICO_CON_GUIONES.test(cod)) return b;

  const desc = b.descripcion?.trim();
  b.descripcion = desc ? `${cod} ${desc}` : cod;
  b.codigoBien = null;
  return b;
}

// =============================================================================
// Inferencia de marca cuando la IA la deja vacía
// =============================================================================

const MARCA_VARIANTES: Record<string, string> = {
  system: "System",
  siemens: "Siemens",
  philips: "Philips",
  hitachi: "Hitachi",
  toshiba: "Toshiba",
  mindray: "Mindray",
  fujifilm: "Fujifilm",
  fujilim: "Fujifilm",
  sonoscape: "Sonoscape",
  chison: "Chison",
  edan: "Edan",
  hologic: "Hologic",
  samsung: "Samsung",
  toco: "TOCO",
  ge: "GE",
};

const PALABRAS_GENERICAS = new Set([
  "equipo", "equipos", "sistema", "sistemas", "modalidad", "modulo",
  "unidad", "marca", "sd", "ecografo", "ecografos", "ultrasonido",
  "ultrasonografo", "resonancia", "aparato", "dispositivo", "modelo",
  "bien", "articulo", "item", "descripcion", "electronico", "electrico",
  "digital", "portatil", "antiguo", "del", "de", "la", "el", "con",
  "serie", "s/n", "rs", "ref", "monitor", "video", "procesador",
  "camara", "endoscopio", "endoscopia", "accesorio", "accesorios",
  "completo", "completos",
]);

function titular(textoA: string): string {
  return textoA.charAt(0).toUpperCase() + textoA.slice(1);
}

function inferirMarca(descripcion: string | null): string | null {
  if (!descripcion) return null;
  const d = descripcion
    .toLowerCase()
    .replace(/[.,;:+"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!d) return null;

  const normalizar = (t: string): string => MARCA_VARIANTES[t] ?? titular(t);
  const valida = (t: string): boolean =>
    Boolean(t) && !PALABRAS_GENERICAS.has(t);

  const m = d.match(/\bmarcas?\s+([a-z0-9]+)/);
  if (m && valida(m[1])) return normalizar(m[1]);

  for (const clave of Object.keys(MARCA_VARIANTES)) {
    const re = new RegExp(`\\b${clave.replace(/\./g, "\\.")}\\b`);
    if (re.test(d)) return MARCA_VARIANTES[clave];
  }

  const mod = d.match(/\b([a-z0-9]+)\s*(?:mod\.?|modelo)\b/);
  if (mod && valida(mod[1])) return normalizar(mod[1]);

  return null;
}

function esMarcaImplicitaEnDescripcion(desc: string | null): string | null {
  if (!desc) return null;
  const d = desc.toUpperCase();
  for (const [key, val] of Object.entries(MARCA_VARIANTES)) {
    if (d.includes(key.toUpperCase())) return val;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Inferencia de MODELO desde la descripción, cuando no viene con etiqueta.
//
// Patrón "código de modelo": token alfanumérico que MEZCLA letras y dígitos
// (ej. BGP-FW-S1, NPZ-W-S1, HB300L). Un token puramente numérico (ej.
// 115-056312-00) NO se considera modelo y se conserva en la descripción.
//
// Dos posiciones:
//   1) al INICIO: "BGP-FW-S1 OPAGUE LINE ; INFUSION SET." → modelo=BGP-FW-S1
//      "NPZ-W-S1 SPANISH, ..." → modelo=NPZ-W-S1
//   2) al FINAL (antes de un paréntesis/comas o fin): "Fuente de luz para
//      endoscopio HB300L (CE, LED)" → modelo=HB300L
// ---------------------------------------------------------------------------
const RE_CODE_MODELO =
  /(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9][A-Za-z0-9.\-]*[A-Za-z0-9]/;

function esCodeModelo(token: string): boolean {
  return RE_CODE_MODELO.test(token);
}

function limpiarFragmento(fragmento: string): string {
  return fragmento
    .replace(/^[\s,;:.\-]+/, "")
    .replace(/[\s,;:.\-]+$/, "")
    .replace(/;+/g, ";")
    .trim();
}

function inferirModelo(b: BienGuiaRemision): BienGuiaRemision {
  if (b.modelo || !b.descripcion) return b;
  const d = b.descripcion.trim();
  if (!d) return b;

  // 1) Código de modelo al INICIO: primer token seguido de más texto.
  const inicial = d.match(/^([A-Za-z0-9][A-Za-z0-9.\-]*[A-Za-z0-9])\s+(.+)$/);
  if (inicial && esCodeModelo(inicial[1])) {
    const resto = limpiarFragmento(inicial[2]);
    if (resto) {
      b.modelo = inicial[1];
      b.descripcion = resto;
      return b;
    }
  }

  // 2) Código de modelo al FINAL: token corto (con dígitos) justo antes de un
  //    paréntesis de apertura o al final de la cadena.
  const mFinal = d.match(
    /^(.+?)\s+([A-Za-z0-9][A-Za-z0-9.\-]*[A-Za-z0-9])(?=(?:\s*\([^)]*\)\s*)?$)\)?/
  );
  if (mFinal && esCodeModelo(mFinal[2]) && mFinal[2].length <= 10) {
    const base = limpiarFragmento(mFinal[1]);
    const palabraAnterior = (base.match(/([A-Za-zÁÉÍÓÚÑ]+)$/) || [])[1]?.toLowerCase();
    const esPreposicion = ["de", "del", "la", "el", "las", "los", "en", "al", "y", "e", "con", "para", "por", "su", "un", "una"].includes(palabraAnterior || "");
    if (!esPreposicion && base && base.length > 2) {
      b.modelo = mFinal[2];
      b.descripcion = base;
    }
  }

  return b;
}

// Orden de etiquetas para el parseo. `campo` indica a qué campo del bien va su
// valor. Las específicas (dos palabras) van antes para un match correcto.
type CampoBien =
  | "marca"
  | "modelo"
  | "serie"
  | "ref"
  | "accesorios"
  | "nroParte"
  | "lote";

const ETIQUETA_A_CAMPO: Array<{ patron: string; campo: CampoBien }> = [
  { patron: "NUMERO\\s+DE\\s+SERIE", campo: "serie" },
  { patron: "NRO\\s+DE\\s+SERIE", campo: "serie" },
  { patron: "NRO\\s+SERIE", campo: "serie" },
  { patron: "NUM\\s+SERIE", campo: "serie" },
  { patron: "MARCA", campo: "marca" },
  { patron: "MODELO", campo: "modelo" },
  { patron: "SERIE", campo: "serie" },
  { patron: "S/N", campo: "serie" },
  { patron: "N/S", campo: "serie" },
  { patron: "SN", campo: "serie" },
  // RS, R/S, RRSS son REFERENCIA, no serie.
  { patron: "R/S", campo: "ref" },
  { patron: "RRSS", campo: "ref" },
  { patron: "RS", campo: "ref" },
  { patron: "REFERENCIA", campo: "ref" },
  { patron: "REF", campo: "ref" },
  // ACCESORIOS se guarda en el campo "accesorios" (solo cuando existe).
  { patron: "ACCESORIOS", campo: "accesorios" },
  { patron: "ACCESORIO", campo: "accesorios" },
  // N° DE PARTE y LOTE (solo cuando existen).
  { patron: "Nº\\s*DE\\s*PARTE", campo: "nroParte" },
  { patron: "N°\\s*DE\\s*PARTE", campo: "nroParte" },
  { patron: "NRO\\s*DE\\s*PARTE", campo: "nroParte" },
  { patron: "N\\s*DE\\s*PARTE", campo: "nroParte" },
  { patron: "PARTE", campo: "nroParte" },
  { patron: "LOTE", campo: "lote" },
];

// Etiquetas cuyo valor NO pertenece a ningún campo del bien: se descartan de
// la descripción y no se guardan.
const ETIQUETAS_DESCARTADAS = [
  "PROCEDENCIA",
  "ORIGEN",
  "PAIS",
  "NACIONALIDAD",
  "OBSERVACIONES",
  "OBSERVACION",
  "NOTAS",
  "CONTENIDO",
];

// Si la descripción viene con etiquetas (ej. "INSUFLADOR ELECTRONICO DE CO2
// MARCA: MINDRAY MODELO: HS-50F SERIE: FA1-4A001791 PROCEDENCIA: CHINA
// RRSS: DB6261E ACCESORIOS: ..."), separa la descripción limpia y asigna los
// valores a marca/modelo/serie/ref. Las etiquetas descartadas (PROCEDENCIA,
// ACCESORIOS, etc.) se eliminan sin guardarse.
function parsearEtiquetasDescripcion(b: BienGuiaRemision): BienGuiaRemision {
  const original = b.descripcion?.trim();
  if (!original) return b;

  const todas: Array<{ patron: string; campo: CampoBien | null }> = [
    ...ETIQUETA_A_CAMPO,
    ...ETIQUETAS_DESCARTADAS.map((p) => ({ patron: p, campo: null })),
  ];

  // Encontrar la primera etiqueta (índice de inicio) en la cadena original.
  let primera: { index: number } | null = null;
  for (const e of todas) {
    const re = new RegExp(`(?:^|\\s)(?:${e.patron})\\s*:`, "i");
    const m = re.exec(original);
    if (m && (!primera || m.index < primera.index)) {
      primera = { index: m.index };
    }
  }
  if (!primera) return b;

  const inicio = primera.index;

  // Descripción limpia = texto anterior a la primera etiqueta.
  let descripcion = original.slice(0, inicio).trim();
  descripcion = descripcion.replace(/\s+:\s*$/, "").trim();
  if (descripcion) b.descripcion = descripcion;

  // Parsear etiquetas sobre la parte que comienza en la primera etiqueta.
  const resto = original.slice(inicio);
  const occ: Array<{ e: { patron: string; campo: CampoBien | null }; index: number; colon: number }> = [];
  for (const e of todas) {
    const re = new RegExp(`(?:^|\\s)(?:${e.patron})\\s*:`, "ig");
    let m: RegExpExecArray | null;
    while ((m = re.exec(resto)) !== null) {
      occ.push({ e, index: m.index, colon: m.index + m[0].indexOf(":") });
    }
  }
  occ.sort((a, b) => a.index - b.index);

  for (let i = 0; i < occ.length; i++) {
    const finValor = i + 1 < occ.length ? occ[i + 1].index : resto.length;
    const valor = resto.slice(occ[i].colon + 1, finValor).trim();

    const campo = occ[i].e.campo;
    if (campo && valor && !b[campo]) {
    const obj = b as unknown as Record<string, string | null>;
    obj[campo] = valor;
    }
  }

  return b;
}

// =============================================================================
// Envío a OpenAI Vision (una imagen por vez)
// =============================================================================

async function enviarPaginaAOpenAI(
  imagenBuffer: Buffer,
  numeroPagina: number,
  totalPaginas: number,
  mimeTipo: string,
  textoPagina: string
): Promise<any> {
  const hayTexto = textoPagina && textoPagina.trim().length > 0;
  const prompt = `${OSCAR_GUIA_REMISION_PROMPT}

CONTEXTO: Esta es la PÁGINA ${numeroPagina} de ${totalPaginas} de un archivo PDF que contiene guías de remisión.
Analiza ÚNICAMENTE lo que sea visible en ESTA imagen. No inventes información que no esté en esta página.
Si la imagen no contiene datos de una guía de remisión, devuelve { "pagina": null, "bienes": [] }.
Si es una página de continuación (solo tabla de bienes sin encabezado), devuelve { "pagina": null, "bienes": [...] }.${
    hayTexto
      ? `

## TEXTO EXTRAÍDO DEL PDF (AYUDA DE PRECISIÓN)

El siguiente es el TEXTO REAL extraído de esta página. Úsalo como ayuda ÚNICAMENTE para leer con exactitud números y campos que en la imagen sean difíciles de distinguir (en especial el RUC de 11 dígitos, la serie, el correlativo, fechas, destinatario y códigos). Trata este texto como la fuente autoritativa para los caracteres exactos; NO lo inventes ni lo modifiques.

${textoPagina}`
      : ""
  }`;

  const input = [
    {
      role: "user" as const,
      content: [
        {
          type: "input_text" as const,
          text: prompt,
        },
        {
          type: "input_image" as const,
          detail: "high" as const,
          image_url: `data:${mimeTipo};base64,${imagenBuffer.toString("base64")}`,
        },
      ],
    },
  ];

  console.log(`[GUIAS-REMISION] Enviando página ${numeroPagina}/${totalPaginas} a OpenAI (${MODELO})...`);

  const respuesta = await openai.responses.create({
    model: MODELO,
    input,
  });

  const textoRespuesta = respuesta?.output_text ?? "{}";
  return parsearJson(textoRespuesta);
}

// =============================================================================
// Normalización de resultado por página
// =============================================================================

function normalizarPagina(raw: any): {
  guia: GuiaRemisionDatos | null;
  bienes: BienGuiaRemision[];
} {
  const g = raw?.pagina && typeof raw.pagina === "object" ? raw.pagina : null;
  const bienesRaw = Array.isArray(raw?.bienes) ? raw.bienes : [];

  let guia: GuiaRemisionDatos | null = null;

  if (g && (g.serie || g.numero)) {
    const fechaInicio = normalizarFecha(
      g?.fechaInicioTraslado ?? g?.fecha_inicio_traslado
    );
    const fechaEmision = normalizarFecha(
      g?.fechaEmision ?? g?.fecha_emision
    );

    guia = {
      serie: texto(g?.serie)?.toUpperCase() ?? null,
      numero: normalizarNumero(g?.numero),
      fechaInicioTraslado: fechaInicio || fechaEmision,
      fechaEmision,
      motivoTraslado: texto(g?.motivoTraslado ?? g?.motivo_traslado),
      destinatario: texto(g?.destinatario),
      rucCliente: normalizarNumero(g?.rucCliente ?? g?.ruc_cliente),
      direccion: texto(g?.direccion),
    };
  }

  const bienes = bienesRaw
    .filter((b: any) => b && typeof b === "object")
    .map(mapearBien)
    .map((b: BienGuiaRemision) => {
      b = ponerCodigoNumericoEnDescripcion(b);
      b = parsearEtiquetasDescripcion(b);
      b = inferirModelo(b);
      if (!b.marca) b.marca = inferirMarca(b.descripcion);
      if (!b.marca) b.marca = esMarcaImplicitaEnDescripcion(b.descripcion);
      return b;
    })
    .filter(
      (b: BienGuiaRemision) =>
        b.descripcion || b.codigoBien || b.cantidad !== null
    );

  return { guia, bienes };
}

// =============================================================================
// Agrupación de páginas en guías
// =============================================================================

function agruparGuias(
  paginas: Array<{ guia: GuiaRemisionDatos | null; bienes: BienGuiaRemision[] }>
): Array<{ guia: GuiaRemisionDatos; bienes: BienGuiaRemision[] }> {
  const guias: Array<{ guia: GuiaRemisionDatos; bienes: BienGuiaRemision[] }> = [];
  let guiaActual: { guia: GuiaRemisionDatos; bienes: BienGuiaRemision[] } | null =
    null;

  for (const pagina of paginas) {
    if (pagina.guia) {
      // Esta página tiene encabezado de guía → nueva guía o continuación con datos
      const nuevaSerie = pagina.guia.serie;
      const nuevoNumero = pagina.guia.numero;

      if (guiaActual && guiaActual.guia.serie === nuevaSerie && guiaActual.guia.numero === nuevoNumero) {
        // Misma guía → fusionar datos (la página puede tener datos más completos)
        if (!guiaActual.guia.fechaInicioTraslado && pagina.guia.fechaInicioTraslado) {
          guiaActual.guia.fechaInicioTraslado = pagina.guia.fechaInicioTraslado;
        }
        if (!guiaActual.guia.motivoTraslado && pagina.guia.motivoTraslado) {
          guiaActual.guia.motivoTraslado = pagina.guia.motivoTraslado;
        }
        if (!guiaActual.guia.destinatario && pagina.guia.destinatario) {
          guiaActual.guia.destinatario = pagina.guia.destinatario;
        }
        if (!guiaActual.guia.rucCliente && pagina.guia.rucCliente) {
          guiaActual.guia.rucCliente = pagina.guia.rucCliente;
        }
        if (!guiaActual.guia.direccion && pagina.guia.direccion) {
          guiaActual.guia.direccion = pagina.guia.direccion;
        }
        // Fusionar bienes (evitar duplicados por descripción)
        const descsExistentes = new Set(
          guiaActual.bienes.map((b) => b.descripcion).filter(Boolean)
        );
        for (const bien of pagina.bienes) {
          if (bien.descripcion && !descsExistentes.has(bien.descripcion)) {
            guiaActual.bienes.push(bien);
          }
        }
      } else {
        // Nueva guía
        guiaActual = {
          guia: { ...pagina.guia },
          bienes: [...pagina.bienes],
        };
        guias.push(guiaActual);
      }
    } else if (guiaActual) {
      // Página de continuación (sin encabezado) → agregar bienes a la guía actual
      const descsExistentes = new Set(
        guiaActual.bienes.map((b) => b.descripcion).filter(Boolean)
      );
      for (const bien of pagina.bienes) {
        if (bien.descripcion && !descsExistentes.has(bien.descripcion)) {
          guiaActual.bienes.push(bien);
        }
      }
    }
    // Si no hay guiaActual y la página no tiene encabezado, se descarta
  }

  return guias;
}

// =============================================================================
// Extracción principal
// =============================================================================

export async function extraerGuiaRemisionOscar(
  buffer: Buffer,
  nombreArchivo: string,
  esImagen?: boolean
): Promise<ResultadoExtraccionMultiGuia> {
  const hashArchivo = crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");

  const origen: OrigenGuiaRemision = esImagen ? "IMAGEN" : "PDF";

  console.log(`[GUIAS-REMISION] Archivo: ${nombreArchivo}, tipo: ${origen}`);

  try {
    // Paso 1: Obtener imágenes (renderizar PDF o usar imagen directa)
    let imagenesBuffer: Buffer[];
    let textosPagina: string[];
    let mimeTipo: string;

    if (esImagen) {
      imagenesBuffer = [buffer];
      textosPagina = [""];
      mimeTipo = mimeTipoImagen(nombreArchivo);
      console.log(`[GUIAS-REMISION] Imagen directa: ${nombreArchivo}`);
    } else {
      const render = await renderPdfPaginas(buffer);
      imagenesBuffer = render.imagenes;
      textosPagina = render.textos;
      mimeTipo = "image/jpeg";
    }

    console.log(`[GUIAS-REMISION] Total de imágenes a procesar: ${imagenesBuffer.length}`);

    // Paso 2: Enviar cada página completa a OpenAI Vision individualmente
    const paginasRaw: any[] = [];

    for (let i = 0; i < imagenesBuffer.length; i++) {
      try {
        const raw = await enviarPaginaAOpenAI(
          imagenesBuffer[i],
          i + 1,
          imagenesBuffer.length,
          mimeTipo,
          textosPagina[i] ?? ""
        );

        const datos = normalizarPagina(raw);
        paginasRaw.push(datos);

        console.log(
          `[GUIAS-REMISION] Página ${i + 1}: guía=${
            datos.guia ? `${datos.guia.serie}-${datos.guia.numero}` : "(continuación)"
          }, bienes=${datos.bienes.length}`
        );
      } catch (error: any) {
        console.error(
          `[GUIAS-REMISION] Error procesando página ${i + 1}:`,
          error?.message || error
        );
        paginasRaw.push({ pagina: null, bienes: [] });
      }
    }

    // Paso 3: Agrupar páginas en guías
    const paginas = paginasRaw;
    const guias = agruparGuias(paginas);

    console.log(`[GUIAS-REMISION] Extracción completada: ${guias.length} guía(s) detectada(s)`);
    for (const g of guias) {
      console.log(
        `[GUIAS-REMISION]   → ${g.guia.serie}-${g.guia.numero}: ${g.bienes.length} bien(es), destinatario=${g.guia.destinatario || "(vacío)"}, RUC=${g.guia.rucCliente || "(vacío)"}`
      );
    }

    return {
      origen,
      hashArchivo,
      guias,
    };
  } catch (error: any) {
    console.error("[GUIAS-REMISION] Error en extracción:", error);
    const mensaje =
      error?.message ||
      "No se pudo analizar la Guía de Remisión. Verifica que el documento sea legible.";
    const err = new Error(mensaje);
    (err as any).orginalError = error;
    throw err;
  }
}
