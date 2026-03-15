import { User, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useRegister } from './use-register'
import { useEffect, useState } from 'react'

export default function Register() {
  const {
    code,
    verifying,
    codeValid,
    codeError,
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    inviteEmail,
    errors,
    submitting,
    registered,
    handleRegister,
  } = useRegister()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [countdown, setCountdown] = useState(3)

  useEffect(() => {
    if (!registered) return
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [registered])

  if (registered && countdown <= 0) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            OrganizrX
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Create your account</p>
        </div>

        {!code ? (
          <div className="mt-8 space-y-6 text-center">
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20 flex flex-col items-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-2" />
              <h3 className="text-sm font-medium text-destructive">No invite code provided</h3>
              <p className="text-sm text-destructive/80 mt-1">
                You need an invite link to register.
              </p>
            </div>
            <Link
              to="/login"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors block"
            >
              Return to Login
            </Link>
          </div>
        ) : verifying ? (
          <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verifying invite code...</p>
          </div>
        ) : !codeValid ? (
          <div className="mt-8 space-y-6 text-center">
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20 flex flex-col items-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-2" />
              <h3 className="text-sm font-medium text-destructive">Invalid invite code</h3>
              <p className="text-sm text-destructive/80 mt-1">
                {codeError || 'This invite code is invalid or has expired.'}
              </p>
            </div>
            <Link
              to="/login"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors block"
            >
              Return to Login
            </Link>
          </div>
        ) : registered ? (
          <div className="mt-8 space-y-6 text-center">
            <div className="rounded-md bg-green-500/10 p-4 border border-green-500/20 flex flex-col items-center">
              <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
              <h3 className="text-sm font-medium text-green-500">Account created successfully!</h3>
              <p className="text-sm text-green-500/80 mt-1">
                Redirecting to login in {countdown} seconds...
              </p>
            </div>
            <Link
              to="/login"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors block"
            >
              Go to Login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleRegister}>
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
                    disabled={submitting}
                  />
                </div>
                {errors.username && (
                  <p className="mt-1 text-xs text-destructive">{errors.username}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-muted-foreground mb-1"
                >
                  Email
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full rounded-md border border-input bg-muted py-2 pl-10 pr-3 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary sm:text-sm disabled:opacity-50"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting || !!inviteEmail}
                    readOnly={!!inviteEmail}
                  />
                </div>
                {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
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
                    autoComplete="new-password"
                    required
                    className="block w-full rounded-md border border-input bg-muted py-2 pl-10 pr-10 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={submitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-muted-foreground mb-1"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className="block w-full rounded-md border border-input bg-muted py-2 pl-10 pr-10 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary sm:text-sm"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={submitting}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={submitting}
                className="group relative flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create Account'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
