import { NextResponse } from "next/server"

export async function POST(
  request: Request
) {
  try {
    const { ruc } = await request.json()

    const response = await fetch(
      `https://peruapi.com/api/ruc/${ruc}`,
      {
        headers: {
          "X-API-KEY":
            process.env.PERU_API_KEY || "",
        },
      }
    )

    const data = await response.json()

console.log("PERU API:", data)

return NextResponse.json(data)

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al consultar RUC",
      },
      {
        status: 500,
      }
    )
  }
}