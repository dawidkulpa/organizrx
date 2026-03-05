import { Zap } from 'lucide-react'

export function WelcomeStep() {
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Zap className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-xl font-semibold">Welcome to OrganizrX</h3>
      <p className="text-muted-foreground leading-relaxed">
        This wizard will guide you through the initial setup of your OrganizrX instance. You&apos;ll
        configure your database, create an admin account, and set up basic preferences.
      </p>
      <p className="text-sm text-muted-foreground">This process takes less than a minute.</p>
    </div>
  )
}
