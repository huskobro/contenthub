import { cn } from "../../lib/cn";

export interface WizardStep {
  id: string;
  label: string;
}

interface WizardShellProps {
  title: string;
  steps: WizardStep[];
  currentStep: number;
  children: React.ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  isLastStep?: boolean;
  testId?: string;
}

export function WizardShell({
  title,
  steps,
  currentStep,
  children,
  onBack,
  onNext,
  onCancel,
  nextLabel,
  backLabel = "Geri",
  nextDisabled = false,
  isLastStep = false,
  testId = "wizard",
}: WizardShellProps) {
  return (
    <div className="max-w-[640px]" data-testid={testId}>
      {/* Header */}
      <h2 className="m-0 mb-1 text-xl font-semibold" data-testid={`${testId}-title`}>
        {title}
      </h2>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-4" data-testid={`${testId}-steps`}>
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
                i === currentStep
                  ? "bg-brand-100 text-brand-700"
                  : i < currentStep
                    ? "bg-success-light text-success-dark"
                    : "bg-neutral-100 text-neutral-400",
              )}
              data-testid={`${testId}-step-${step.id}`}
            >
              <span className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                i === currentStep
                  ? "bg-brand-500 text-white"
                  : i < currentStep
                    ? "bg-success text-white"
                    : "bg-neutral-200 text-neutral-400",
              )}>
                {i < currentStep ? "\u2713" : i + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                "w-4 h-px",
                i < currentStep ? "bg-success" : "bg-neutral-200",
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="mb-4" data-testid={`${testId}-content`}>
        {children}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
        <div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 text-sm text-neutral-500 bg-transparent border-none cursor-pointer hover:text-neutral-700"
              data-testid={`${testId}-cancel`}
            >
              Iptal
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {onBack && currentStep > 0 && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-1.5 text-sm text-neutral-600 bg-transparent border border-border rounded-sm cursor-pointer hover:bg-neutral-50"
              data-testid={`${testId}-back`}
            >
              {backLabel}
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className={cn(
                "px-5 py-1.5 text-sm font-medium text-white border-none rounded-sm",
                nextDisabled
                  ? "bg-neutral-300 cursor-not-allowed"
                  : "bg-brand-500 cursor-pointer hover:bg-brand-600 transition-colors",
              )}
              data-testid={`${testId}-next`}
            >
              {nextLabel ?? (isLastStep ? "Tamamla" : "Devam")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
