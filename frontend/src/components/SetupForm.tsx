import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { CountryPicker } from '@/components/CountryPicker';
import { ObjectivePicker } from '@/components/ObjectivePicker';
import { Globe } from '@/components/Globe';
import type { SystemVars } from '@/lib/chatStore';

interface SetupFormProps {
  onSubmit: (vars: SystemVars) => void;
  onCancel?: () => void;
  defaultValues?: SystemVars;
}

const TOTAL_STEPS = 4;

export function SetupForm({ onSubmit, onCancel, defaultValues }: SetupFormProps) {
  const { t, locale } = useI18n();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  useEffect(() => {
    if (!onCancel) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const [origin, setOrigin] = useState(defaultValues?.origin_country ?? '');
  const [nationalities, setNationalities] = useState<string[]>(() => {
    const val = defaultValues?.nationality ?? '';
    return val ? val.split(', ').filter(Boolean) : [];
  });
  const [destination, setDestination] = useState(defaultValues?.destination_country ?? '');
  const [objective, setObjective] = useState(defaultValues?.objective ?? '');

  // Order: Nationality > Origin > Destination > Objective
  const steps = [
    {
      title: t('setup.step.nationalities'),
      description: t('setup.step.nationalities.description'),
    },
    {
      title: t('setup.step.origin'),
      description: t('setup.step.origin.description'),
    },
    {
      title: t('setup.step.destination'),
      description: undefined,
    },
    {
      title: t('setup.step.objective'),
      description: t('setup.step.objective.description'),
    },
  ];

  const isStepValid = () => {
    switch (step) {
      case 0:
        return nationalities.length > 0;
      case 1:
        return origin !== '';
      case 2:
        return destination !== '';
      case 3:
        return objective !== '' && objective !== 'setup.objective.other';
      default:
        return false;
    }
  };

  const goNext = () => {
    if (!isStepValid()) return;
    if (step === TOTAL_STEPS - 1) {
      onSubmit({
        origin_country: origin,
        nationality: nationalities.join(', '),
        destination_country: destination,
        objective,
        additional_info: '',
        locale,
      });
      return;
    }
    setDirection('forward');
    setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step === 0) return;
    setDirection('backward');
    setStep((s) => s - 1);
  };

  const showGlobe = step === 1 || step === 2;
  const currentStep = steps[step];

  return (
    <div className="text-foreground flex min-h-0 flex-1">
      {/* Left: form content */}
      <div className="flex min-w-0 flex-1 flex-col gap-6 px-12 py-10">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'bg-foreground scale-125'
                  : i < step
                    ? 'bg-foreground/50'
                    : 'bg-foreground/20'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div
          key={step}
          className={`flex min-h-0 flex-1 flex-col gap-4 ${direction === 'forward' ? 'animate-step-forward' : 'animate-step-backward'}`}
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold">{currentStep.title}</h2>
            {currentStep.description && (
              <p className="text-muted-foreground text-sm">{currentStep.description}</p>
            )}
          </div>

          {/* Input area — order: Nationality, Origin, Destination, Objective */}
          {step === 0 && (
            <CountryPicker
              value={nationalities}
              onChange={(v) => setNationalities(v as string[])}
              multiple
            />
          )}
          {step === 1 && <CountryPicker value={origin} onChange={(v) => setOrigin(v as string)} />}
          {step === 2 && (
            <CountryPicker
              value={destination}
              onChange={(v) => setDestination(v as string)}
              exclude={origin ? [origin] : []}
            />
          )}
          {step === 3 && <ObjectivePicker value={objective} onChange={setObjective} />}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={goBack}
              className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg px-4 py-2 text-sm transition-colors"
            >
              {t('setup.back')}
            </button>
          ) : onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg px-4 py-2 text-sm transition-colors"
            >
              {t('setup.cancel')}
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={!isStepValid()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-lg px-6 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-30"
          >
            {step === TOTAL_STEPS - 1 ? t('setup.start') : t('setup.next')}
          </button>
        </div>
      </div>

      {/* Right: Globe (steps 1-2, with fade animation) */}
      {step < 3 && (
        <div
          className={`relative hidden flex-1 transition-all duration-700 ease-in-out md:block ${
            showGlobe ? 'max-w-[50%] opacity-100' : 'max-w-0 opacity-0'
          }`}
        >
          <div
            className={`absolute inset-0 transition-transform duration-700 ease-in-out ${
              showGlobe ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'
            }`}
          >
            <Globe origin={origin} destination={destination} />
          </div>
        </div>
      )}
    </div>
  );
}
