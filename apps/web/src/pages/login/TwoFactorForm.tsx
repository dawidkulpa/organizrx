import { useState } from 'react'
import { Key, Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../utils'
import { api } from '../../api/client'
import { useAuthStore } from '../../store'
import { useNavigate } from 'react-router-dom'

interface TwoFactorFormProps {
  tempToken: string
}

export function TwoFactorForm({ tempToken }: TwoFactorFormProps) {
  const navigate = useNavigate()
  const setToken = useAuthStore((state) => state.setToken)
  const setUser = useAuthStore((state) => state.setUser)

  const [isLoading, setIsLoading] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [totpCode, setTotpCode] = useState('')
  const [backupCode, setBackupCode] = useState('')

  const handle2faVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = useBackupCode ? backupCode : totpCode

    if (!code) {
      toast.error(`Please enter your ${useBackupCode ? 'backup' : 'TOTP'} code`)
      return
    }

    setIsLoading(true)
    try {
      const payload = {
        temp_token: tempToken,
        totp_code: useBackupCode ? undefined : code,
        backup_code: useBackupCode ? code : undefined,
      }

      const res = await api.auth.verify2fa(payload)
      const { accessToken, user } = res.data.data

      setToken(accessToken)
      setUser(user)

      toast.success('Two-factor authentication successful')
      navigate('/')
    } catch (err: unknown) {
      const message =
        err instanceof Error && 'response' in err
          ? ((err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message ?? 'Verification failed')
          : 'Verification failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {useBackupCode
              ? 'Enter one of your backup codes to continue.'
              : 'Enter the 6-digit code from your authenticator app.'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handle2faVerify}>
          <div>
            <label htmlFor="code" className="sr-only">
              {useBackupCode ? 'Backup Code' : 'TOTP Code'}
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <input
                id="code"
                name="code"
                type="text"
                required
                className={cn(
                  'block w-full rounded-md border border-input bg-muted py-2 pl-10 pr-3 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary sm:text-sm',
                  'tracking-widest text-center text-lg font-mono'
                )}
                placeholder={useBackupCode ? 'XXXXXXXX' : '000000'}
                value={useBackupCode ? backupCode : totpCode}
                onChange={(e) =>
                  useBackupCode ? setBackupCode(e.target.value) : setTotpCode(e.target.value)
                }
                maxLength={useBackupCode ? undefined : 6}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setUseBackupCode(!useBackupCode)
              setTotpCode('')
              setBackupCode('')
            }}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {useBackupCode ? 'Use Authenticator App' : 'Use Backup Code'}
          </button>
        </div>
      </div>
    </div>
  )
}
