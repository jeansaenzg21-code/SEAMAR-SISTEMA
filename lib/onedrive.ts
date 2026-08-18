import { getAccessToken } from "./graph";
import { ONEDRIVE_FOLDERS } from "./onedrive-config";

const USER = process.env.ONEDRIVE_USER || "";


  
export async function listarOrdenesServicio() {
  const token = await getAccessToken();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${ONEDRIVE_FOLDERS.ORDENES_SERVICIO}/children`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.json();
}
export async function listarValorizaciones() {
  const token = await getAccessToken();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${ONEDRIVE_FOLDERS.VALORIZACIONES}/children`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.json();
}
// Registros de diagnóstico de paginación SOLO en modo desarrollo.
// Para desactivarlos: cambiar esta constante a false (o el entorno de
// producción la deja apagada porque NODE_ENV !== "development").
const LOG_PAGINACION_ONEDRIVE =
  process.env.NODE_ENV === "development";

export async function listarDocumentos() {
  const token = await getAccessToken();

  const urlBase = `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${ONEDRIVE_FOLDERS.DOCUMENTOS}/children`;

  // Microsoft Graph pagina los resultados de /children (200 ítems por página).
  // Se recorre @odata.nextLink hasta la última página y se acumulan TODOS los
  // archivos en una única colección antes de devolverlos.
  const todosLosItems: any[] = [];
  let siguienteUrl: string | null = urlBase;
  let pagina = 0;

  while (siguienteUrl) {
    pagina++;

    const response: Response = await fetch(siguienteUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const detalle = await response.text();
      throw new Error(
        `Error al listar documentos de OneDrive (página ${pagina}): ` +
          `status=${response.status} ${detalle.slice(0, 300)}`
      );
    }

    const data: any = await response.json();
    const items = data.value || [];

    todosLosItems.push(...items);

    if (LOG_PAGINACION_ONEDRIVE) {
      console.log(
        `[ONEDRIVE-PAGINACIÓN] Página ${pagina}: ${items.length} archivos`
      );
    }

    siguienteUrl = data["@odata.nextLink"] ?? null;
  }

  if (LOG_PAGINACION_ONEDRIVE) {
    console.log(
      `[ONEDRIVE-PAGINACIÓN] Total obtenido desde Graph: ${todosLosItems.length} archivos (${pagina} página(s))`
    );
  }

  return { value: todosLosItems };
}

export async function buscarOSPorNumero(numeroOS: string) {
  const data = await listarOrdenesServicio();
  const archivos = data.value || [];

  return archivos.find((archivo: any) => archivo.name.includes(numeroOS));
}

export async function listarArchivosOrdenServicio() {
  const data = await listarOrdenesServicio();
  return data.value || [];
}

export async function descargarArchivo(itemId: string) {
  const token = await getAccessToken();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${itemId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `No se encontró el archivo en OneDrive (status=${response.status}).`
    );
  }

  const archivo = await response.json();

  let buffer: Buffer;

  if (archivo["@microsoft.graph.downloadUrl"]) {
    const descarga = await fetch(archivo["@microsoft.graph.downloadUrl"]);
    buffer = Buffer.from(await descarga.arrayBuffer());
  } else {
    const contenido = await fetch(
      `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${itemId}/content`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!contenido.ok) {
      throw new Error(
        `No se pudo descargar el contenido del archivo (status=${contenido.status}).`
      );
    }

    buffer = Buffer.from(await contenido.arrayBuffer());
  }

  return {
    nombre: archivo.name,
    itemId: archivo.id,
    webUrl: archivo.webUrl,
    buffer,
  };
}

/**
 * Sube un archivo a OneDrive usando createUploadSession, anclado siempre
 * a un folderId (item-id-relative addressing). NUNCA usa root:/path
 * para evitar los 403 AccessDenied causados por encodeURIComponent
 * rompiendo las barras "/" de una ruta completa.
 *
 * Funciona tanto para archivos pequeños como grandes (soporta >4MB,
 * a diferencia de un PUT directo a :/content).
 */
export async function subirArchivoAOneDrive(
  nombreArchivo: string,
  buffer: Buffer,
  folderId: string,
  token: string
) {
  const nombreLimpio = nombreArchivo.replace(/[<>:"/\\|?*]/g, "-");

  const debugId = `UPLOAD_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  console.log(`[${debugId}] INICIO subirArchivoAOneDrive | nombre=${nombreLimpio} | size=${buffer.length}`);

  let uploadUrl: string | null = null;
  let uploadCompleted = false;
  let nombreEfectivo = nombreLimpio;

  const cancelarSesion = async () => {
    if (uploadUrl) {
      try {
        const res = await fetch(uploadUrl, { method: "DELETE" });
        console.log(`[${debugId}] CLEANUP: DELETE uploadUrl → ${res.status}`);
      } catch (e) {
        console.log(`[${debugId}] CLEANUP: Error cancelando sesión:`, e);
      }
    }
  };

  try {
    // 1. Crear sesión de carga
    const createSessionUrl = `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${folderId}:/${encodeURIComponent(nombreEfectivo)}:/createUploadSession`;

    let sessionRes = await fetch(createSessionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item: {
          "@microsoft.graph.conflictBehavior": "replace"
        }
      }),
    });

    // Log respuesta createUploadSession
    let sessionStatus = sessionRes.status;
    let sessionBody: any = null;
    try {
      sessionBody = await sessionRes.clone().json();
    } catch {
      sessionBody = await sessionRes.clone().text();
    }
    console.log(`[${debugId}] createUploadSession status=${sessionStatus}`);

    // Si el archivo ya tiene una upload session activa (409 nameAlreadyExists),
    // usar un nombre temporal para no bloquear la subida
    if (sessionRes.status === 409) {
      nombreEfectivo = `${nombreLimpio}_${Date.now()}`;
      console.log(`[${debugId}] 409 nameAlreadyExists → reintentando con nombre temporal: ${nombreEfectivo}`);

      const retryUrl = `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${folderId}:/${encodeURIComponent(nombreEfectivo)}:/createUploadSession`;
      sessionRes = await fetch(retryUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          item: {
            "@microsoft.graph.conflictBehavior": "replace"
          }
        }),
      });

      sessionStatus = sessionRes.status;
      try {
        sessionBody = await sessionRes.clone().json();
      } catch {
        sessionBody = await sessionRes.clone().text();
      }
      console.log(`[${debugId}] retry createUploadSession status=${sessionStatus}`);
    }

    if (!sessionRes.ok) {
      throw new Error(`Error creando sesión de carga: status=${sessionStatus} body=${JSON.stringify(sessionBody)}`);
    }

    const { uploadUrl: url } = sessionBody;
    uploadUrl = url;
    console.log(`[${debugId}] uploadUrl obtenida correctamente`);

    // 2. Subir en chunks (5 MB cada uno)
    const chunkSize = 5 * 1024 * 1024;
    let archivoFinal: any = null;
    let chunkIndex = 0;

    for (let start = 0; start < buffer.length; start += chunkSize) {
      const end = Math.min(start + chunkSize, buffer.length);
      const chunk = buffer.subarray(start, end);
      chunkIndex++;

      const contentRange = `bytes ${start}-${end - 1}/${buffer.length}`;
      const contentLength = String(chunk.length);
      console.log(`[${debugId}] CHUNK ${chunkIndex}: PUT bytes ${start}-${end - 1}/${buffer.length} (size=${chunk.length})`);

      const res = await fetch(uploadUrl!, {
        method: "PUT",
        headers: {
          "Content-Length": contentLength,
          "Content-Range": contentRange,
        },
        body: chunk as unknown as BodyInit,
      });

      const chunkStatus = res.status;
      let chunkBody: any = null;
      try {
        chunkBody = await res.clone().json();
      } catch {
        chunkBody = await res.clone().text();
      }
      console.log(`[${debugId}] CHUNK ${chunkIndex} RESPONSE: status=${chunkStatus} ${res.statusText}`);

      if (chunkStatus !== 200 && chunkStatus !== 201 && chunkStatus !== 202) {
        console.error(`[${debugId}] CHUNK ${chunkIndex} ERROR: status=${chunkStatus}`);
        throw new Error(`Error subiendo chunk ${chunkIndex} a OneDrive: status=${chunkStatus}`);
      }

      if (end === buffer.length) {
        archivoFinal = chunkBody;
        console.log(`[${debugId}] CHUNK ${chunkIndex} (ultimo) completado`);
      }
    }

    if (!archivoFinal) {
      throw new Error("La subida a OneDrive terminó sin respuesta final de Graph.");
    }

    uploadCompleted = true;
    console.log(`[${debugId}] SUBIDA EXITOSA: name=${archivoFinal.name} id=${archivoFinal.id}`);

    return {
      nombre: archivoFinal.name,
      itemId: archivoFinal.id,
      webUrl: archivoFinal.webUrl,
    };
  } catch (error) {
    await cancelarSesion();
    throw error;
  } finally {
    if (!uploadCompleted) {
      await cancelarSesion();
    }
  }
}

export async function subirContratoAOneDrive(
  nombreArchivo: string,
  buffer: Buffer,
  token: string
) {
  return subirArchivoAOneDrive(
    nombreArchivo,
    buffer,
    ONEDRIVE_FOLDERS.CONTRATOS,
    token
  );
}

export async function subirDocumentoRespaldoAOneDrive(
  nombreArchivo: string,
  buffer: Buffer,
  token: string
) {
  return subirArchivoAOneDrive(
    nombreArchivo,
    buffer,
    ONEDRIVE_FOLDERS.DOCUMENTOS_RESPALDO,
    token
  );
}

const NOMBRE_CARPETA_FACTURAS_OSCAR = "Repositorio";
const NOMBRE_CARPETA_PADRE_FACTURAS_OSCAR = "SistemaSeamar";
let carpetaFacturasOscarCache: string | null = null;

async function obtenerTokenGraph() {
  return getAccessToken();
}

async function buscarOCrearCarpeta(
  token: string,
  parentId: string,
  nombre: string
): Promise<string> {
  const buscar = await fetch(
    `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${parentId}/children`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (buscar.ok) {
    const data: any = await buscar.json();
    const existente = (data.value || []).find(
      (item: any) => item.name === nombre && item.folder
    );
    if (existente) {
      return existente.id;
    }
  }

  const crear = await fetch(
    `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${parentId}/children`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nombre,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }),
    }
  );

  if (!crear.ok) {
    throw new Error(
      `No se pudo crear la carpeta "${nombre}" en OneDrive: status=${crear.status}`
    );
  }

  const data: any = await crear.json();
  return data.id;
}

export async function asegurarCarpetaFacturasOscar(): Promise<string> {
  if (ONEDRIVE_FOLDERS.FACTURAS_OSCAR) {
    return ONEDRIVE_FOLDERS.FACTURAS_OSCAR;
  }

  if (carpetaFacturasOscarCache) {
    return carpetaFacturasOscarCache;
  }

  const token = await obtenerTokenGraph();

  const padre = await buscarOCrearCarpeta(
    token,
    "root",
    NOMBRE_CARPETA_PADRE_FACTURAS_OSCAR
  );
  const repositorio = await buscarOCrearCarpeta(
    token,
    padre,
    NOMBRE_CARPETA_FACTURAS_OSCAR
  );

  carpetaFacturasOscarCache = repositorio;
  return repositorio;
}

export async function subirFacturaOscarAOneDrive(
  nombreArchivo: string,
  buffer: Buffer
) {
  const token = await obtenerTokenGraph();
  const folderId = await asegurarCarpetaFacturasOscar();
  return subirArchivoAOneDrive(nombreArchivo, buffer, folderId, token);
}

export async function descargarArchivoPorItemId(itemId: string) {
  return descargarArchivo(itemId);
}

export async function eliminarArchivo(itemId: string) {
  const token = await getAccessToken();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${itemId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(
      `Error al eliminar archivo de OneDrive: status=${response.status}`
    );
  }

  return true;
}

export async function generarEnlacePreview(itemId: string): Promise<string> {
  const token = await getAccessToken();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${itemId}/preview`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    }
  );

  if (!response.ok) {
    throw new Error(`Error al generar preview: ${response.status}`);
  }

  const data = await response.json();
  return data.getUrl;
}