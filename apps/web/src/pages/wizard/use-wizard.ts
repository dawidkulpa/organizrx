import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { api } from '../../api/client'
import { toast } from 'sonner'
import { TOTAL_STEPS } from './WizardStepper'

const baseUrlSchema = z.url('Must be a valid URL').or(z.literal(''))

export interface WizardData {
  // Admin
  username: string
  password: string
  confirmPassword: string
  email: string
  // Settings
  siteTitle: string
  baseUrl: string
  // DB (informational)
  dbDialect: 'sqlite' | 'mysql' | 'postgresql'
}

const initialData: WizardData = {
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  siteTitle: 'OrganizrX',
  baseUrl: '',
  dbDialect: 'sqlite',
}

export function useWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>(initialData)
  const [errors, setErrors] = useState<Partial<Record<keyof WizardData, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const update = <K extends keyof WizardData>(key: K, value: WizardData[K]) => {
    setData((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  // ── Step Validation ────────────────────────────────────────────
  const validateStep = (s: number): boolean => {
    const errs: Partial<Record<keyof WizardData, string>> = {}

    if (s === 3) {
      if (!data.username || data.username.length < 3) {
        errs.username = 'Username must be at least 3 characters'
      }
      if (!data.password || data.password.length < 8) {
        errs.password = 'Password must be at least 8 characters'
      }
      if (data.password !== data.confirmPassword) {
        errs.confirmPassword = 'Passwords do not match'
      }
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errs.email = 'Invalid email address'
      }
    }

    if (s === 4) {
      if (!data.siteTitle || data.siteTitle.length < 1) {
        errs.siteTitle = 'Site title is required'
      }

      if (!baseUrlSchema.safeParse(data.baseUrl).success) {
        errs.baseUrl = 'Must be a valid URL'
      }
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const nextStep = () => {
    if (!validateStep(step)) return
    if (step < TOTAL_STEPS) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const handleFinish = async () => {
    setIsSubmitting(true)
    try {
      await api.wizard.complete({
        username: data.username,
        password: data.password,
        email: data.email || undefined,
        siteTitle: data.siteTitle || undefined,
        baseUrl: data.baseUrl,
      })
      toast.success('Setup complete! Redirecting to login…')
      navigate('/login', { replace: true })
    } catch (err: unknown) {
      const message =
        err instanceof Error && 'response' in err
          ? ((err as { response?: { data?: { error?: { message?: string } } } }).response?.data
              ?.error?.message ?? 'Setup failed')
          : 'Setup failed'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    step,
    data,
    errors,
    isSubmitting,
    update,
    nextStep,
    prevStep,
    handleFinish,
  }
}
