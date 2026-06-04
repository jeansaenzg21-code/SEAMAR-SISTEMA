import { AppShell } from "@/components/app-shell"
import { ProjectDetailContent } from "@/components/project-detail-content"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  
  return (
    <AppShell>
      <ProjectDetailContent projectId={id} />
    </AppShell>
  )
}
