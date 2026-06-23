import { getAccessToken } from "./graph";
import { ONEDRIVE_FOLDERS } from "./onedrive-config";

const USER =
  "trainee.soporte@paredescano.com";

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

export async function buscarOSPorNumero(
  numeroOS: string
) {

  const data =
    await listarOrdenesServicio();

  const archivos =
    data.value || [];

  return archivos.find((archivo: any) =>
    archivo.name.includes(numeroOS)
  );

}
export async function listarArchivosOrdenServicio() {

  const data =
    await listarOrdenesServicio();

  return data.value || [];

}

export async function descargarArchivo(
  itemId: string
) {

  const token =
    await getAccessToken();

  const response =
    await fetch(
      `https://graph.microsoft.com/v1.0/users/${USER}/drive/items/${itemId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

  const archivo =
    await response.json();

  const descarga =
    await fetch(
      archivo["@microsoft.graph.downloadUrl"]
    );

  const buffer =
    Buffer.from(
      await descarga.arrayBuffer()
    );

  return {
    nombre: archivo.name,
    itemId: archivo.id,
    webUrl: archivo.webUrl,
    buffer,
  };

 
} export async function subirContratoAOneDrive(
  nombreArchivo: string,
  buffer: Buffer
) 



{
  const token =
    await getAccessToken()

  const ruta =
    `SistemaSeamar/Contratos/${nombreArchivo}`

  const response =
    await fetch(
      `https://graph.microsoft.com/v1.0/users/${USER}/drive/root:/Documents/${ruta}:/content`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type":
            "application/octet-stream",
        },
        body: buffer as unknown as BodyInit,
      }
    )

  if (!response.ok) {
    const error =
      await response.text()

    throw new Error(
      `Error al subir contrato a OneDrive: ${error}`
    )
  }

  const archivo =
    await response.json()

  return {
    nombre: archivo.name,
    itemId: archivo.id,
    webUrl: archivo.webUrl,
  }
}
export async function subirDocumentoAOneDrive(
  nombreArchivo: string,
  buffer: Buffer
) {
  const token = await getAccessToken()

  const nombreLimpio =
  nombreArchivo.replace(/[<>:"/\\|?*]/g, "-")

const ruta =
  `SistemaSeamar/Documentos/${nombreLimpio}`

  const response = await fetch(
  `https://graph.microsoft.com/v1.0/users/${USER}/drive/root:/Documents/${ruta}:/content`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
    },
    body: buffer as unknown as BodyInit,
  }
)

  if (!response.ok) {
    const error = await response.text()

    throw new Error(
      `Error al subir documento a OneDrive: ${error}`
    )
  }

  const archivo = await response.json()

  return {
    nombre: archivo.name,
    itemId: archivo.id,
    webUrl: archivo.webUrl,
  }
}