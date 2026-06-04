import { AppShell } from "@/components/app-shell"
import { ClientDetailContent } from "@/components/client-detail-content"

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  return (
    <AppShell>
      <ClientDetailContent clientId={id} />
    </AppShell>
  )
}
