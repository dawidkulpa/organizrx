import { Database } from 'lucide-react'
import { cn } from '../../../utils'
import type { WizardData } from '../use-wizard'

interface DatabaseStepProps {
  data: WizardData
  update: <K extends keyof WizardData>(key: K, value: WizardData[K]) => void
}

export function DatabaseStep({ data, update }: DatabaseStepProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Database Configuration</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Select your database engine. SQLite is recommended for most users and requires no additional
        setup. MySQL and PostgreSQL require an existing database server.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {(['sqlite', 'mysql', 'postgresql'] as const).map((dialect) => (
          <button
            key={dialect}
            type="button"
            onClick={() => update('dbDialect', dialect)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-md border p-4 text-sm font-medium transition-all',
              data.dbDialect === dialect
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted'
            )}
          >
            <Database className="h-6 w-6" />
            {dialect === 'sqlite' ? 'SQLite' : dialect === 'mysql' ? 'MySQL' : 'PostgreSQL'}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Note: Database connection is configured via environment variables (DATABASE_URL). This
        selection is for reference — the actual connection is established at startup.
      </p>
    </div>
  )
}
