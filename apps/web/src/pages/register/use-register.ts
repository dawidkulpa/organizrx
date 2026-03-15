import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import { toast } from 'sonner'
import { AxiosError } from 'axios'

export function useRegister() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')

  const [verifying, setVerifying] = useState(true)
  const [codeValid, setCodeValid] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!code) {
      setVerifying(false)
      return
    }

    let mounted = true
    const verifyCode = async () => {
      try {
        setVerifying(true)
        const res = await api.invites.verify(code)
        if (!mounted) return

        setCodeValid(res.data.data.valid)
        if (res.data.data.email) {
          setInviteEmail(res.data.data.email)
          setEmail(res.data.data.email)
        }
      } catch (err) {
        if (!mounted) return
        const error = err as AxiosError<{ error?: { message: string } }>
        setCodeError(error.response?.data?.error?.message || 'Invalid or expired invite code')
        setCodeValid(false)
      } finally {
        if (mounted) setVerifying(false)
      }
    }

    verifyCode()
    return () => {
      mounted = false
    }
  }, [code])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}

    if (username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters'
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'Invalid email address'
    }

    if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    if (!code) return

    try {
      setSubmitting(true)
      await api.invites.redeem({
        code,
        username,
        password,
        email,
      })

      toast.success('Registration successful!')
      setRegistered(true)
    } catch (err) {
      const error = err as AxiosError<{ error?: { message: string } }>
      const msg = error.response?.data?.error?.message || 'Failed to register. Please try again.'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return {
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
  }
}
