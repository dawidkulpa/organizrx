import { User, Lock, Eye, EyeOff, Loader2, Server } from 'lucide-react'
import { useLogin } from './use-login'
import { TwoFactorForm } from './TwoFactorForm'
import { AuthProviders } from './AuthProviders'

export default function Login() {
  const {
    username,
    setUsername,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    showPassword,
    setShowPassword,
    requires2fa,
    tempToken,
    authSettings,
    handleLogin,
    handleLdapLogin,
    handleExternalLogin,
  } = useLogin()

  if (requires2fa) {
    return <TwoFactorForm tempToken={tempToken} />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            OrganizrX
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Username
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="block w-full rounded-md border border-input bg-muted py-2 pl-10 pr-3 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="block w-full rounded-md border border-input bg-muted py-2 pl-10 pr-10 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 rounded border-input bg-muted text-primary focus:ring-primary"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-muted-foreground">
                Remember me
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
            </button>

            {authSettings['ldapEnabled'] === 'true' && (
              <button
                type="button"
                onClick={handleLdapLogin}
                disabled={isLoading}
                className="group relative flex w-full justify-center rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-500 hover:bg-blue-500/20 disabled:opacity-50 transition-all"
              >
                <Server className="mr-2 h-4 w-4" />
                Sign in with LDAP
              </button>
            )}
          </div>
        </form>

        <AuthProviders
          authSettings={authSettings}
          isLoading={isLoading}
          handleExternalLogin={handleExternalLogin}
        />
      </div>
    </div>
  )
}
