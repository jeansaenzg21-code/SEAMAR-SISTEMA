import { NextResponse } from "next/server"
import { writeFile, unlink, mkdir } from "fs/promises"
import path from "path"
import pool from "@/lib/mysql"
import { registrarActividad } from "@/lib/actividad"
import { obtenerSesion } from "@/lib/session"

export async function GET() {
  try {
    const [rows]: any = await pool.query(
      "SELECT * FROM empresa LIMIT 1"
    )

    if (rows.length === 0) {
      return NextResponse.json(null)
    }

    return NextResponse.json(rows[0])
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al obtener datos de la empresa",
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData()

    const razon_social = formData.get("razon_social") as string | null
    const nombre_comercial = formData.get("nombre_comercial") as string | null
    const ruc = formData.get("ruc") as string | null
    const direccion = formData.get("direccion") as string | null
    const telefono = formData.get("telefono") as string | null
    const correo = formData.get("correo") as string | null
    const logoFile = formData.get("logo") as File | null

    const [existing]: any = await pool.query(
      "SELECT id, logo FROM empresa LIMIT 1"
    )

    let logoPath = existing[0]?.logo || null

    if (logoFile && logoFile.size > 0 && logoFile.name) {
      const uploadDir = path.join(process.cwd(), "public/uploads/logos")
      await mkdir(uploadDir, { recursive: true })

      // Eliminar logo anterior si existe
      if (logoPath) {
        const oldFilePath = path.join(process.cwd(), "public", logoPath.replace(/^\//, ""))
        try { await unlink(oldFilePath) } catch { /* archivo no existe */ }
      }

      const ext = path.extname(logoFile.name) || ".png"
      const fileName = `logo${ext}`
      const filePath = path.join(uploadDir, fileName)

      const bytes = await logoFile.arrayBuffer()
      await writeFile(filePath, Buffer.from(bytes))

      logoPath = `/uploads/logos/${fileName}`
    }

    if (existing.length === 0) {
      const [result]: any = await pool.query(
        `INSERT INTO empresa (
          razon_social, nombre_comercial, ruc, direccion, telefono, correo, logo, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVA')`,
        [razon_social, nombre_comercial, ruc, direccion, telefono, correo, logoPath]
      )

      const sesionCrear = await obtenerSesion()

      await registrarActividad({
        tipo: "configuracion",
        accion: "crear",
        titulo: "Registro inicial de la empresa",
        subtitulo: nombre_comercial || razon_social,
        usuarioNombre: sesionCrear?.nombre || null,
        referenciaId: result.insertId,
      })

      return NextResponse.json({
        success: true,
        message: "Datos de la empresa guardados correctamente",
        id: result.insertId,
      })
    }

    await pool.query(
      `UPDATE empresa SET
        razon_social = ?,
        nombre_comercial = ?,
        ruc = ?,
        direccion = ?,
        telefono = ?,
        correo = ?,
        logo = ?
      WHERE id = ?`,
      [razon_social, nombre_comercial, ruc, direccion, telefono, correo, logoPath, existing[0].id]
    )

    return NextResponse.json({
      success: true,
      message: "Datos de la empresa actualizados correctamente",
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message: "Error al guardar datos de la empresa",
      },
      { status: 500 }
    )
  }
}
