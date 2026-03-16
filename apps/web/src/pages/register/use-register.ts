import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'
import { queryKeys } from '../../api/query-keys'
import { toast } from 'sonner'
import { AxiosError } from 'axios'

export function useRegister() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')

  const verifyQuery = useQuery({
    queryKey: queryKeys.invites.verify(code ?? ''),
    queryFn: () => api.invites.verify(code!),
    enabled: !!code,
  })

  const verifying = verifyQuery.isLoading && !!code
  const codeValid = verifyQuery.data?.data?.data?.valid ?? false
  const codeError = verifyQuery.isError
    ? ((verifyQuery.error as AxiosError<{ error?: { message: string } }>)?.response?.data?.error
        ?.message ?? 'Invalid or expired invite code')
    : null

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteEmail, setInviteEmail] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [registered, setRegistered] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const emailFromInvite = verifyQuery.data?.data?.data?.email
    if (emailFromInvite) {
      setInviteEmail(emailFromInvite)
      setEmail(emailFromInvite)
    }
  }, [verifyQuery.data])

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
