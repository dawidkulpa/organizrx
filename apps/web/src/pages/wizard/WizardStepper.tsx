import { cn } from '../../utils'
import { Check, Zap, UserPlus, Settings, CheckCircle2 } from 'lucide-react'

export const STEPS = [
  { label: 'Welcome', icon: Zap },
  { label: 'Admin', icon: UserPlus },
  { label: 'Settings', icon: Settings },
  { label: 'Finish', icon: CheckCircle2 },
] as const

export const TOTAL_STEPS = STEPS.length

interface WizardStepperProps {
  currentStep: number
}

export function WizardStepper({ currentStep }: WizardStepperProps) {
  return (
    <div className="relative flex items-center justify-between w-full px-4">
      <div className="absolute top-1/2 left-4 right-4 h-1 bg-muted -z-10 rounded-full" />
      <div
        className="absolute top-1/2 left-4 h-1 bg-primary -z-10 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${((currentStep - 1) / (TOTAL_STEPS - 1)) * (100 - 8 / TOTAL_STEPS)}%` }}
      />

      {STEPS.map((s, i) => {
        const stepNum = i + 1
        const Icon = s.icon
        return (
          <div key={stepNum} className="relative flex flex-col items-center group">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ring-4 ring-background',
                currentStep > stepNum
                  ? 'bg-primary text-primary-foreground'
                  : currentStep === stepNum
                    ? 'bg-primary text-primary-foreground scale-110'
                    : 'bg-muted text-muted-foreground'
              )}
            >
              {currentStep > stepNum ? <Check size={16} /> : <Icon size={16} />}
            </div>
            <span
              className={cn(
                'absolute top-12 text-xs font-medium transition-colors duration-300 whitespace-nowrap',
                currentStep >= stepNum ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {s.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
