import { ExternalLink } from 'lucide-react'

interface AuthProvidersProps {
  authSettings: Record<string, string>
  isLoading: boolean
  handleExternalLogin: (provider: string) => void
}

export function AuthProviders({
  authSettings,
  isLoading,
  handleExternalLogin,
}: AuthProvidersProps) {
  if (authSettings['PLEX_ENABLED'] !== 'true' && authSettings['OIDC_ENABLED'] !== 'true') {
    return null
  }

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {authSettings['PLEX_ENABLED'] === 'true' && (
          <button
            type="button"
            onClick={() => handleExternalLogin('plex')}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-[#e5a00d]/10 px-3 py-2 text-sm font-semibold text-[#e5a00d] hover:bg-[#e5a00d]/20 border border-[#e5a00d]/20 transition-all disabled:opacity-50"
          >
            <ExternalLink className="h-4 w-4" />
            Sign in with Plex
          </button>
        )}

        {authSettings['OIDC_ENABLED'] === 'true' && (
          <button
            type="button"
            onClick={() => handleExternalLogin('oidc')}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-md bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 transition-all disabled:opacity-50"
          >
            <ExternalLink className="h-4 w-4" />
            Sign in with SSO
          </button>
        )}
      </div>
    </>
  )
}
