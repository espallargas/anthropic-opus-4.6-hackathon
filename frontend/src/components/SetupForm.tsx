import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { CountryPicker } from '@/components/CountryPicker';
import { ObjectivePicker } from '@/components/ObjectivePicker';
import { Globe } from '@/components/Globe';
import type { SystemVars } from '@/lib/chatStore';

interface SetupFormProps {
  onSubmit: (vars: SystemVars) => void;
  defaultValues?: SystemVars;
}

const TOTAL_STEPS = 4;

export function SetupForm({ onSubmit, defaultValues }: SetupFormProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

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
      case 3: {
        const otherLabel = t('setup.objective.other');
        if (objective === otherLabel || objective === '') return false;
        return true;
      }
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

  const showGlobe = step < 3;
  const currentStep = steps[step];

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        className={`flex w-full rounded-xl border border-white/10 bg-black/80 text-white backdrop-blur-md transition-all duration-500 ${
          showGlobe ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        {/* Left: form content */}
        <div className="flex min-w-0 flex-1 flex-col gap-6 p-8">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  i === step ? 'scale-125 bg-white' : i < step ? 'bg-white/50' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div
            key={step}
            className={`flex flex-col gap-4 ${direction === 'forward' ? 'animate-step-forward' : 'animate-step-backward'}`}
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold">{currentStep.title}</h2>
              {currentStep.description && (
                <p className="text-sm text-white/50">{currentStep.description}</p>
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
              <CountryPicker value={destination} onChange={(v) => setDestination(v as string)} />
            )}
            {step === 3 && <ObjectivePicker value={objective} onChange={setObjective} />}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="cursor-pointer rounded-lg px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
              >
                {t('setup.back')}
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={goNext}
              disabled={!isStepValid()}
              className="cursor-pointer rounded-lg bg-white px-6 py-2 text-sm font-medium text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              {step === TOTAL_STEPS - 1 ? t('setup.start') : t('setup.next')}
            </button>
          </div>
        </div>

        {/* Right: Globe (steps 0-2 only) */}
        {showGlobe && (
          <div className="relative hidden w-80 overflow-hidden rounded-r-xl md:block">
            <Globe origin={origin} destination={destination} />
          </div>
        )}
      </div>
    </div>
  );
}
