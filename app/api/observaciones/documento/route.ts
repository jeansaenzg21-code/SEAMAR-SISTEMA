import { NextResponse } from "next/server"
import { subirDocumentoAOneDrive } from "@/lib/onedrive"


export async function POST(req: Request) {

  try {

    const formData =
      await req.formData()


    const file =
      formData.get("file") as File


    const valorizacionId =
      formData.get("valorizacionId")


    if (!file) {

      return NextResponse.json(
        {
          error:"No existe archivo"
        },
        {
          status:400
        }
      )

    }


    const buffer =
      Buffer.from(
        await file.arrayBuffer()
      )


    const resultado =
      await subirDocumentoAOneDrive(
        `Observacion-${valorizacionId}-${file.name}`,
        buffer
      )


    return NextResponse.json({

      ok:true,

      nombre:
        resultado.nombre,

      url:
        resultado.webUrl

    })


  } catch(error){

    console.error(error)

    return NextResponse.json(
      {
        error:"Error subiendo archivo"
      },
      {
        status:500
      }
    )

  }

}