import DocumentProcessor from '../../components/document-processor'
import { FinancialProvider } from '../../lib/context'
import { AppShell } from '../../components/app-shell'

export default function UploadPage() {
  return (
    <AppShell>
      <FinancialProvider>
        <DocumentProcessor />
      </FinancialProvider>
    </AppShell>
  )
}