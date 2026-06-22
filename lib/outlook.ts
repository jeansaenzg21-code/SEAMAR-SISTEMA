import { getAccessToken } from "./graph";

const USER =
  "trainee.soporte@paredescano.com";

export async function enviarCorreo(
  asunto: string,
  contenido: string
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
                  "traine.nomina@paredescano.com"
              }
            }
          ]

        }


      })

    }
  );

}