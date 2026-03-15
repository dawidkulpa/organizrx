import { Loader2 } from 'lucide-react'
import { WizardStepper, TOTAL_STEPS } from './WizardStepper'
import { useWizard } from './use-wizard'
import { WelcomeStep } from './steps/WelcomeStep'
import { AdminStep } from './steps/AdminStep'
import { SettingsStep } from './steps/SettingsStep'
import { CompleteStep } from './steps/CompleteStep'

export default function Wizard() {
  const { step, data, errors, isSubmitting, update, nextStep, prevStep, handleFinish } = useWizard()

  const renderStep = () => {
    switch (step) {
      case 1:
        return <WelcomeStep />
      case 2:
        return <AdminStep data={data} errors={errors} update={update} />
      case 3:
        return <SettingsStep data={data} errors={errors} update={update} />
      case 4:
        return <CompleteStep data={data} />
      default:
        return null
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl space-y-8">
        <h2 className="text-2xl font-bold tracking-tight text-center bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          OrganizrX Setup
        </h2>

        {/* Stepper */}
        <WizardStepper currentStep={step} />

        {/* Content */}
        <div className="bg-card border border-border rounded-lg p-8 shadow-sm min-h-[320px] flex flex-col justify-between">
          <div>{renderStep()}</div>

          <div className="flex justify-between mt-8 pt-4 border-t border-border">
            <button
              type="button"
              onClick={prevStep}
              disabled={step === 1 || isSubmitting}
              className="px-4 py-2 rounded-md font-medium text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>

            {step === TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="px-6 py-2 rounded-md font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up…
                  </>
                ) : (
                  'Complete Setup'
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 rounded-md font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow transition-all transform active:scale-95"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
