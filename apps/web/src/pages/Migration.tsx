import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../utils'
import { toast } from 'sonner'
import {
  Check,
  Database,
  Play,
  Loader2,
  Server,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'

const STEPS = [
  { label: 'Detection', icon: Database },
  { label: 'Backup', icon: Server },
  { label: 'Update', icon: Play },
  { label: 'Verify', icon: Loader2 },
  { label: 'Complete', icon: CheckCircle2 },
] as const

interface MigrationStatus {
  needsMigration: boolean
  alreadyMigrated: boolean
  configVersion: string | null
  missingColumns: string[]
}

export default function Migration() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [status, setStatus] = useState<MigrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<{
    step: string
    current: number
    total: number
  } | null>(null)
  const [stats, setStats] = useState<{
    columns: number
    transforms: number
    time: number
    backup: string | null
  } | null>(null)

  useEffect(() => {
    fetch('/api/migration/status')
      .then((r) => r.json())
      .then((d) => setStatus(d.data))
      .catch(() => toast.error('Status check failed'))
      .finally(() => setLoading(false))
  }, [])

  const startMigration = async () => {
    setStep(2)
    try {
      const res = await fetch('/api/migration/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!res.ok || !res.body) throw new Error('Start failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.type === 'progress') {
            setStep(3)
            setProgress(data)
          } else if (data.type === 'complete') {
            setStats({
              columns: data.columnsAdded?.length ?? 0,
              transforms: data.transformsApplied?.length ?? 0,
              time: data.durationMs,
              backup: data.backupPath,
            })
            setStep(4)
            setTimeout(() => setStep(5), 1500)
          } else if (data.type === 'error') {
            toast.error(data.error)
            setStep(1)
          }
        }
      }
    } catch {
      toast.error('Schema update failed')
      setStep(1)
    }
  }

  const renderContent = () => {
    if (loading)
      return (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
    if (step === 1)
      return (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Schema Update Check</h3>
          {status?.needsMigration ? (
            <div className="bg-muted/30 p-4 rounded-md text-left text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="text-warning font-medium flex items-center gap-1">
                  <AlertTriangle size={14} /> Update Needed
                </span>
              </div>
              {status.configVersion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Legacy Version</span>
                  <span>{status.configVersion}</span>
                </div>
              )}
              {status.missingColumns.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Missing Columns</span>
                  <span className="font-mono text-xs">{status.missingColumns.length}</span>
                </div>
              )}
            </div>
          ) : status?.alreadyMigrated ? (
            <div className="text-success bg-success/10 p-4 rounded-md flex items-center gap-2 justify-center">
              <CheckCircle2 size={16} /> Schema is up to date
            </div>
          ) : (
            <div className="text-success bg-success/10 p-4 rounded-md flex items-center gap-2 justify-center">
              <CheckCircle2 size={16} /> No update needed
            </div>
          )}
          <div className="flex justify-end pt-4">
            <button
              onClick={startMigration}
              disabled={!status?.needsMigration}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Start Update
            </button>
          </div>
        </div>
      )
    if (step === 2)
      return (
        <div className="space-y-6 text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h3 className="text-xl font-semibold">Creating Backup...</h3>
          <p className="text-muted-foreground text-sm">
            Please wait while we back up your database.
          </p>
        </div>
      )
    if (step === 3)
      return (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Loader2 className="animate-spin" /> Updating Schema...
          </h3>
          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{progress.step}</span>
                <span className="text-muted-foreground">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )
    if (step === 4)
      return (
        <div className="space-y-6 text-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <h3 className="text-xl font-semibold">Verifying...</h3>
          <p className="text-muted-foreground text-sm">Confirming schema changes...</p>
        </div>
      )
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
        <h3 className="text-xl font-semibold">Schema Update Complete!</h3>
        <div className="bg-muted/30 p-4 rounded-md text-left text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Columns Added</span>
            <span className="font-medium">{stats?.columns}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Transforms</span>
            <span className="font-medium">{stats?.transforms}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Time</span>
            <span className="font-medium">{stats?.time}ms</span>
          </div>
          {stats?.backup && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Backup</span>
              <span className="font-mono text-xs max-w-[200px] truncate" title={stats.backup}>
                {stats.backup}
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 flex items-center gap-2 transition-colors"
          >
            Go to Login <ArrowRight size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl space-y-8">
        <h2 className="text-2xl font-bold tracking-tight text-center bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          OrganizrX Schema Update
        </h2>
        <div className="relative flex items-center justify-between w-full px-4">
          <div className="absolute top-1/2 left-4 right-4 h-1 bg-muted -z-10 rounded-full" />
          <div
            className="absolute top-1/2 left-4 h-1 bg-primary -z-10 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((s, i) => {
            const stepNum = i + 1
            const isActive = step >= stepNum
            const isCurrent = step === stepNum
            return (
              <div key={stepNum} className="relative flex flex-col items-center group">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ring-4 ring-background',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                    isCurrent && 'scale-110'
                  )}
                >
                  {isActive && !isCurrent ? <Check size={16} /> : <s.icon size={16} />}
                </div>
                <span
                  className={cn(
                    'absolute top-12 text-xs font-medium transition-colors duration-300 whitespace-nowrap',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>
        <div className="bg-card border border-border rounded-lg p-8 shadow-sm min-h-[320px] flex flex-col justify-between">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
