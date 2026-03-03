import { useState, useEffect } from 'react';
import { useAuthStore } from '../store';
import client, { api } from '../api/client';
import { cn } from '../utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, User, Key, Loader2, Eye, EyeOff, ExternalLink, Server } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken)
  // Local state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 2FA state
  const [requires2fa, setRequires2fa] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  
  // Settings state
  const [authSettings, setAuthSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Use the public settings endpoint (no auth required)
        const res = await client.get('/settings/public');
        const data = res.data.data;
        if (typeof data === 'object' && data !== null) {
          setAuthSettings(data as Record<string, string>);
        }
      } catch {
        // Graceful degradation — external auth buttons won't show
      }
    };
    fetchSettings();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(username, password, rememberMe);
      
      if (result.ok) {
        toast.success('Logged in successfully');
        navigate('/');
      } else if (result.requires2fa) {
        setRequires2fa(true);
        setTempToken(result.tempToken);
        toast.info('Two-factor authentication required');
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLdapLogin = async () => {
    if (!username || !password) {
      toast.error('Please enter username and password for LDAP login');
      return;
    }

    setIsLoading(true);
    try {
      const res = await client.post('/auth/ldap/login', { username, password, rememberMe });
      const { data } = res.data;

      if (data.requires_2fa) {
        setRequires2fa(true);
        setTempToken(data.temp_token);
        toast.info('Two-factor authentication required');
      } else {
        setToken(data.accessToken);
        setUser(data.user);
        toast.success('Logged in with LDAP successfully');
        navigate('/');
      }
    } catch (err: unknown) {
      const message = (err instanceof Error && 'response' in err) ? ((err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? 'LDAP Login failed') : 'LDAP Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handle2faVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = useBackupCode ? backupCode : totpCode;
    
    if (!code) {
      toast.error(`Please enter your ${useBackupCode ? 'backup' : 'TOTP'} code`);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        temp_token: tempToken,
        totp_code: useBackupCode ? undefined : code,
        backup_code: useBackupCode ? code : undefined
      };

      const res = await api.auth.verify2fa(payload);
      const { accessToken, user } = res.data.data;

      setToken(accessToken);
      setUser(user);
      
      toast.success('Two-factor authentication successful');
      navigate('/');
    } catch (err: unknown) {
      const message = (err instanceof Error && 'response' in err) ? ((err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ?? 'Verification failed') : 'Verification failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExternalLogin = (provider: string) => {
    window.location.href = `${import.meta.env.VITE_API_URL || '/api'}/auth/${provider}/login`;
  };

  if (requires2fa) {
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
                    "block w-full rounded-md border border-input bg-muted py-2 pl-10 pr-3 text-foreground placeholder-muted-foreground focus:border-primary focus:ring-primary sm:text-sm",
                    "tracking-widest text-center text-lg font-mono"
                  )}
                  placeholder={useBackupCode ? "XXXXXXXX" : "000000"}
                  value={useBackupCode ? backupCode : totpCode}
                  onChange={(e) => useBackupCode ? setBackupCode(e.target.value) : setTotpCode(e.target.value)}
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
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Verify'
                )}
              </button>
            </div>
          </form>
          
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(!useBackupCode);
                setTotpCode('');
                setBackupCode('');
              }}
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {useBackupCode ? 'Use Authenticator App' : 'Use Backup Code'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card p-8 rounded-lg shadow-lg border border-border animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            OrganizrX
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-muted-foreground mb-1">
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
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
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
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                'Sign in'
              )}
            </button>

            {authSettings['LDAP_ENABLED'] === 'true' && (
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

        {(authSettings['PLEX_ENABLED'] === 'true' || authSettings['OIDC_ENABLED'] === 'true') && (
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
        )}
      </div>
    </div>
  );
}
