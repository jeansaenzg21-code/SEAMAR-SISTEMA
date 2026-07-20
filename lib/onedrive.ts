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
export async function listarDocumentos() {
  const token = await getAccessToken();

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${ONEDRIVE_FOLDERS.DOCUMENTOS}/children`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.json();
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

  const archivo = await response.json();

  const descarga = await fetch(archivo["@microsoft.graph.downloadUrl"]);
  const buffer = Buffer.from(await descarga.arrayBuffer());

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
  console.log(`[${debugId}] INICIO subirArchivoAOneDrive`);
  console.log(`[${debugId}] nombreArchivo original:`, nombreArchivo);
  console.log(`[${debugId}] nombreLimpio:`, nombreLimpio);
  console.log(`[${debugId}] folderId:`, folderId);
  console.log(`[${debugId}] buffer.length:`, buffer.length);
  console.log(`[${debugId}] USER:`, USER);
  console.log(`[${debugId}] token (primeros 20):`, token?.slice(0, 20) + "...");

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
    console.log(`[${debugId}] createUploadSession URL:`, createSessionUrl);

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
    console.log(`[${debugId}] createUploadSession RESPONSE: status=${sessionStatus} body=${JSON.stringify(sessionBody)}`);

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
      console.log(`[${debugId}] retry createUploadSession RESPONSE: status=${sessionStatus} body=${JSON.stringify(sessionBody)}`);
    }

    if (!sessionRes.ok) {
      throw new Error(`Error creando sesión de carga: status=${sessionStatus} body=${JSON.stringify(sessionBody)}`);
    }

    const { uploadUrl: url } = sessionBody;
    uploadUrl = url;
    console.log(`[${debugId}] uploadUrl (primeros 80):`, uploadUrl?.slice(0, 80) + "...");

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
        console.log(`[${debugId}] CHUNK ${chunkIndex} ERROR BODY:`, JSON.stringify(chunkBody, null, 2));
        throw new Error(`Error subiendo chunk ${chunkIndex} a OneDrive: status=${chunkStatus} body=${JSON.stringify(chunkBody)}`);
      }

      if (end === buffer.length) {
        archivoFinal = chunkBody;
        console.log(`[${debugId}] CHUNK ${chunkIndex} (último):`, JSON.stringify(archivoFinal, null, 2));
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