import { CheckCircle2 } from 'lucide-react'
import type { WizardData } from '../use-wizard'

interface CompleteStepProps {
  data: WizardData
}

export function CompleteStep({ data }: CompleteStepProps) {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle2 className="h-8 w-8 text-green-500" />
      </div>
      <h3 className="text-xl font-semibold">Ready to Go!</h3>
      <div className="text-left bg-muted/30 rounded-md p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Admin User</span>
          <span className="font-medium">{data.username}</span>
        </div>
        {data.email && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{data.email}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Site Title</span>
          <span className="font-medium">{data.siteTitle}</span>
        </div>
        {data.baseUrl && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Base URL</span>
            <span className="font-medium break-all text-right">{data.baseUrl}</span>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Click &quot;Complete Setup&quot; to create your admin account and finalize the
        configuration.
      </p>
    </div>
  )
}
