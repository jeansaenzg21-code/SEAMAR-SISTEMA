import { AppShell } from "@/components/app-shell"
import { ProviderDetailContent } from "@/components/provider-detail-content"

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  return (
    <AppShell>
      <ProviderDetailContent providerId={id} />
    </AppShell>
  )
}
