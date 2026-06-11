import { NextResponse } from "next/server";

import { listarValorizaciones }
from "@/lib/onedrive";

export async function GET() {

  try {

    const archivos =
      await listarValorizaciones();

    return NextResponse.json({
      success: true,
      total: archivos.value?.length || 0,
      archivos: archivos.value || []
    });

  } catch (error) {

    console.error(error);

    return NextResponse.json(
      {
        success: false
      },
      {
        status: 500
      }
    );

  }

}