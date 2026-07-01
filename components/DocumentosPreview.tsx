import { useState } from "react"

export function DocumentosPreview({ documentos }: any) {
  const [preview, setPreview] = useState<any>(null)

 if (!documentos?.length)
  return (
    <span className="text-sm text-muted-foreground">
      Sin documentos
    </span>
  )

  return (
    <>
      <div className="space-y-2">
        {documentos.map((doc: any) => (
          <div
            key={doc.url || doc.nombre}
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
          >
            <span>{doc.nombre}</span>

            <div className="flex gap-3">
              <button
                className="text-blue-600"
                onClick={() => setPreview(doc)}
              >
                Ver
              </button>

              <a
                href={doc.url}
                target="_blank"
                className="text-muted-foreground"
              >
                Descargar
              </a>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white w-[80%] h-[80%] rounded-lg p-4 relative">
            <button
              className="absolute top-2 right-2"
              onClick={() => setPreview(null)}
            >
              ✕
            </button>

            <iframe
              src={preview.url}
              className="w-full h-full"
            />
          </div>
        </div>
      )}
    </>
  )
}