import dynamic from "next/dynamic"
import { AppShell } from "@/components/app-shell"

const ProjectDetailContent = dynamic(
  () => import("@/components/project-detail-content").then(
    (m) => m.ProjectDetailContent
  ),
  {
    loading: () => (
      <div className="animate-pulse space-y-6 p-6">
        <div className="h-8 w-64 bg-muted rounded-lg" />
        <div className="grid gap-6 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-64 bg-muted rounded-lg" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
        <div className="h-[300px] bg-muted rounded-lg" />
      </div>
    ),
  }
)

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
