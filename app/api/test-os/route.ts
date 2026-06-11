import { NextResponse }
from "next/server";

import {
  listarArchivosOrdenServicio
}
from "@/lib/onedrive";

export async function GET() {

  const archivos =
    await listarArchivosOrdenServicio();

  return NextResponse.json(
    archivos
  );

}