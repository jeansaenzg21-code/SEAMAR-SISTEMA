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

}