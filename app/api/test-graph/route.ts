import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/graph";

export async function GET() {
  try {
    const token = await getAccessToken();

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/users/trainee.soporte@paredescano.com",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}