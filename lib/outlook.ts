import { getAccessToken } from "./graph";

const USER =
  process.env.OUTLOOK_USER || "";

export async function enviarCorreo(
  asunto: string,
  contenido: string,
  destinatario?: string
) {

  const token =
    await getAccessToken();

  await fetch(
    `https://graph.microsoft.com/v1.0/users/${USER}/sendMail`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${token}`,
        "Content-Type":
          "application/json"
      },

      body: JSON.stringify({

        message: {

          subject: asunto,

          body: {
            contentType: "HTML",
            content: contenido
          },

          toRecipients: [
            {
              emailAddress: {
                address:
                  destinatario || process.env.OUTLOOK_DEFAULT_RECIPIENT || ""
              }
            }
          ]

        }


      })

    }
  );

}