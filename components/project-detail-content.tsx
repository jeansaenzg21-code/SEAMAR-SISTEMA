"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  FileText,
  DollarSign,
  Users,
  Download,
  Upload,
  Plus,
  
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"


interface ProjectDetailProps {
  projectId: string
}



const statusConfig = {
  active: { label: "Active", variant: "default" as const },
  "on-hold": { label: "On Hold", variant: "secondary" as const },
  completed: { label: "Completed", variant: "outline" as const },
  "in-progress": { label: "In Progress", variant: "default" as const },
  pending: { label: "Pending", variant: "secondary" as const },
}


export function ProjectDetailContent({ projectId }: ProjectDetailProps) {
  const project = null
  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div className="flex items-center gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
  <h1 className="text-2xl font-bold">
    Detalle del Proyecto
  </h1>

  <p className="text-muted-foreground">
    Información del proyecto
  </p>
</div>
        <div className="flex items-center gap-2">
          
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          
          
        </div>
      </div>

      <Card>

  <CardHeader>
    <CardTitle>
      Información General
    </CardTitle>
  </CardHeader>

  <CardContent>

    <div className="grid gap-4 md:grid-cols-2">

      <div>
        <p className="text-sm text-muted-foreground">
          Nombre
        </p>

        <p className="font-medium">
          -
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Estado
        </p>

        <p className="font-medium">
          -
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Fecha Inicio
        </p>

        <p className="font-medium">
          -
        </p>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          Fecha Fin
        </p>

        <p className="font-medium">
          -
        </p>
      </div>

    </div>

  </CardContent>

</Card>

      
    </div>
  )
}
