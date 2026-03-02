import { useState } from 'react';
import { cn } from '../utils';
import { Check } from 'lucide-react';

export default function Wizard() {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-reveal">
      <h2 className="text-2xl font-bold tracking-tight text-center">Setup Wizard</h2>

      {/* Stepper */}
      <div className="relative flex items-center justify-between w-full">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 h-1 w-full bg-muted -z-10 rounded-full" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-primary -z-10 rounded-full transition-all duration-500 ease-out" 
          style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
        />

        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="relative flex flex-col items-center group">
            <div 
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ring-4 ring-background",
                step >= s 
                  ? "bg-primary text-primary-foreground scale-110" 
                  : "bg-muted text-muted-foreground border-2 border-transparent"
              )}
            >
              {step > s ? <Check size={16} /> : s}
            </div>
            <span className={cn(
              "absolute top-10 text-xs font-medium transition-colors duration-300 whitespace-nowrap",
              step >= s ? "text-primary" : "text-muted-foreground"
            )}>
              Step {s}
            </span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="bg-card border border-border rounded-lg p-8 shadow-sm min-h-[300px] flex flex-col justify-between">
        <div>
          <h3 className="text-xl font-semibold mb-4">Step {step}: Configuration</h3>
          <p className="text-muted-foreground mb-6">
            Please configure the settings for step {step}. This is a placeholder description.
          </p>
          <div className="space-y-4">
            <input 
              type="text" 
              className="w-full bg-muted/50 border border-border rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder={`Enter value for Step ${step}...`}
            />
            <div className="h-24 bg-muted/20 border border-dashed border-border rounded-md flex items-center justify-center text-muted-foreground text-sm">
              More complex form elements go here
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8 pt-4 border-t border-border">
          <button 
            onClick={prevStep}
            disabled={step === 1}
            className="px-4 py-2 rounded-md font-medium text-sm text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Back
          </button>
          <button 
            onClick={nextStep}
            disabled={step === totalSteps}
            className="px-4 py-2 rounded-md font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            {step === totalSteps ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
