import { ClientSecretCredential } from "@azure/identity";

export const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!
);

export async function getAccessToken() {
  const token = await credential.getToken(
    "https://graph.microsoft.com/.default"
  );

  return token?.token;
}