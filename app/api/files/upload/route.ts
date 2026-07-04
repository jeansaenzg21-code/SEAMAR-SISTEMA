import { writeFile } from "fs/promises"
import path from "path"

export async function POST(req: Request) {
  const formData = await req.formData()

  const file = formData.get("file") as File
  const folder = formData.get("folder") as string

  if (!file) {
    return Response.json({ error: "No file" }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const uploadDir = path.join(process.cwd(), "public/uploads", folder || "general")

  const filePath = path.join(uploadDir, file.name)

  await writeFile(filePath, buffer)

  return Response.json({
    ok: true,
    url: `/uploads/${folder}/${file.name}`,
    name: file.name,
  })
}