import { getAccessToken } from "./graph";
import { ONEDRIVE_FOLDERS } from "./onedrive-config";

const USER = "trainee.soporte@paredescano.com";


  
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
)
 {
  const nombreLimpio = nombreArchivo.replace(/[<>:"/\\|?*]/g, "-");

  // 1. Crear sesión de carga, anclada al folderId (NO a un path)

  console.log("Folder ID:", folderId);
console.log("Usuario:", USER);
const sessionRes = await fetch(
  `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${folderId}:/${encodeURIComponent(nombreLimpio)}:/createUploadSession`,
  {
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
  }
);
  if (!sessionRes.ok) {
  console.log("STATUS:", sessionRes.status);
  console.log("ERROR:", await sessionRes.text());

  throw new Error("Error creando sesión de carga");
}

  const { uploadUrl } = await sessionRes.json();

  // 2. Subir en chunks (múltiplos de 320 KB, excepto el último)
  const chunkSize = 5 * 1024 * 1024; // 5 MB
  let archivoFinal: any = null;

  for (let start = 0; start < buffer.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, buffer.length);
    const chunk = buffer.subarray(start, end);

    // Importante: el uploadUrl ya trae su propia autorización.
    // NO agregar el header Authorization aquí.
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${start}-${end - 1}/${buffer.length}`,
      },
      body: chunk as unknown as BodyInit,
    });

    if (!res.ok && res.status !== 202) {
      const error = await res.text();
      throw new Error(`Error subiendo chunk a OneDrive: ${error}`);
    }

    if (end === buffer.length) {
      archivoFinal = await res.json();
    }
  }

  if (!archivoFinal) {
    throw new Error(
      "La subida a OneDrive terminó sin respuesta final de Graph."
    );
  }

  return {
    nombre: archivoFinal.name,
    itemId: archivoFinal.id,
    webUrl: archivoFinal.webUrl,
  };
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