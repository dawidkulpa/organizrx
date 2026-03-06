import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import client from '../../api/client'
import { useAuthStore } from '../../store'

export function useLogin() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const setUser = useAuthStore((state) => state.setUser)
  const setToken = useAuthStore((state) => state.setToken)

  // Local state
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 2FA state
  const [requires2fa, setRequires2fa] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [useBackupCode, setUseBackupCode] = useState(false)

  // Settings state
  const [authSettings, setAuthSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await client.get('/settings/public')
        const data = res.data.data
        if (typeof data === 'object' && data !== null) {
          setAuthSettings(data as Record<string, string>)
        }
      } catch {
        // Graceful degradation
      }
    }
    fetchSettings()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error('Please enter username and password')
      return
    }

    setIsLoading(true)
    try {
      const result = await login(username, password, rememberMe)

      if (result.ok) {
        toast.success('Logged in successfully')
        navigate('/')
      } else if (result.requires2fa) {
        setRequires2fa(true)
        setTempToken(result.tempToken)
        toast.info('Two-factor authentication required')
      } else {
        toast.error(result.error)
      }
    } catch (err) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLdapLogin = async () => {
    if (!username || !password) {
      toast.error('Please enter username and password for LDAP login')
      return
    }

    setIsLoading(true)
    try {
      const res = await client.post('/auth/ldap/login', { username, password, rememberMe })
      const { data } = res.data

      if (data.requires_2fa) {
        setRequires2fa(true)
        setTempToken(data.temp_token)
        toast.info('Two-factor authentication required')
      } else {
        setToken(data.accessToken)
        setUser(data.user)
        toast.success('Logged in with LDAP successfully')
        navigate('/')
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error && 'response' in err
          ? ((err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message ?? 'LDAP Login failed')
          : 'LDAP Login failed'
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExternalLogin = (provider: string) => {
    window.location.href = `${import.meta.env.VITE_API_URL || '/api'}/auth/${provider}/login`
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    rememberMe,
    setRememberMe,
    isLoading,
    setIsLoading,
    showPassword,
    setShowPassword,
    requires2fa,
    tempToken,
    useBackupCode,
    setUseBackupCode,
    authSettings,
    handleLogin,
    handleLdapLogin,
    handleExternalLogin,
  }
}
