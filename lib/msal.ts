import { ConfidentialClientApplication } from "@azure/msal-node";

// Cliente MSAL para backend (Node.js)
const cca = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
  },
});

// Función para obtener Access Token de Microsoft Graph
export async function getAccessToken() {
  try {
    const result = await cca.acquireTokenByClientCredential({
      scopes: ["https://graph.microsoft.com/.default"],
    });

    if (!result?.accessToken) {
      throw new Error("No se pudo obtener access token de Microsoft Graph");
    }

    return result.accessToken;
  } catch (error) {
    console.error("Error obteniendo token MSAL:", error);
    throw error;
  }
}