import { useState } from "react"

interface Documento {
  id?: string | number
  nombre?: string
  url?: string
  [key: string]: unknown
}

export function DocumentosPreview({ documentos }: { documentos?: Documento[] }) {
  const [preview, setPreview] = useState<{
    url: string
    nombre: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  if (!documentos?.length)
    return (
      <span className="text-sm text-muted-foreground">
        Sin documentos
      </span>
    )

  async function handleVer(doc: Documento) {
    setLoading(true)

    if (doc.id) {
      try {
        const res = await fetch("/api/documentos/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: doc.id }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.success && data.previewUrl) {
            setPreview({ url: data.previewUrl, nombre: doc.nombre || "Documento" })
            setLoading(false)
            return
          }
        }
      } catch {
        // Silently fall through to new tab fallback
      }
    }

    setLoading(false)
    window.open(doc.url, "_blank", "noopener,noreferrer")
  }

  return (
    <>
      <div className="space-y-2">
        {documentos.map((doc: any) => (
          <div
            key={doc.id || doc.url || doc.nombre}
            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
          >
            <span>{doc.nombre}</span>

            <div className="flex gap-3">
              <button
                className="text-blue-600 hover:underline disabled:opacity-50"
                onClick={() => handleVer(doc)}
                disabled={loading}
              >
                {loading ? "Cargando..." : "Ver"}
              </button>

              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:underline"
              >
                Descargar
              </a>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white w-[80%] h-[80%] rounded-lg p-4 relative flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium truncate">{preview.nombre}</span>
              <div className="flex items-center gap-3">
                <a
                  href={documentos.find((d: any) => d.nombre === preview.nombre)?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Abrir en nueva pestaña
                </a>
                <button
                  className="text-lg leading-none hover:text-gray-600"
                  onClick={() => setPreview(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            <iframe
              src={preview.url}
              className="w-full flex-1 rounded border"
              title={preview.nombre}
            />
          </div>
        </div>
      )}
    </>
  )
}
