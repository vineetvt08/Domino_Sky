import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Plane, GitMerge, Users, Brain } from 'lucide-react';

interface HelpTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    title: '1. Airfield Closures & Ground Stops',
    icon: Plane,
    description:
      'Close any airport for a chosen time window (up to 3 simultaneous closures). Departing flights are held on the ground; inbound aircraft hold in the air until reopening.',
  },
  {
    title: '2. Aircraft Rotation Chains (The Domino Cascade)',
    icon: GitMerge,
    description:
      'A plane flies a chain of 4-5 flights across the day. When a plane arrives late in one city, its next departure starts late even in cities with clear blue skies.',
  },
  {
    title: '3. Connecting Passengers & Legal Crew Limits',
    icon: Users,
    description:
      'Late arrivals break passenger connections (< 45 min min connect time) and push flight crews past their legal 600-minute maximum duty day, forcing cancellations.',
  },
  {
    title: '4. AI Dispatcher & Number Verification',
    icon: Brain,
    description:
      'The engine computes exact recovery options (cancel a leg, swap in a spare aircraft at base). Gemini explains the operational tradeoffs, strictly verified against deterministic engine numbers.',
  },
];

export const HelpTourModal: React.FC<HelpTourModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep] ?? TOUR_STEPS[0]!;
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        className="cr-card w-full max-w-md p-6 bg-white shadow-2xl animate-in zoom-in-95 duration-150 space-y-5"
        role="dialog"
        aria-labelledby="tour-modal-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-status-closure bg-status-closure/10 px-2 py-0.5 rounded">
              Step {currentStep + 1} of {TOUR_STEPS.length}
            </span>
            <span className="text-xs text-ink-muted">Quick Tour</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-muted hover:text-ink rounded hover:bg-slate-100 transition-colors"
            aria-label="Close tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-status-closure/10 text-status-closure flex items-center justify-center shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 id="tour-modal-title" className="text-base font-bold text-ink">
              {step.title}
            </h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              {step.description}
            </p>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 py-1">
          {TOUR_STEPS.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep ? 'w-6 bg-status-closure' : 'w-2 bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* Step buttons */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 ${
              currentStep === 0
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-ink-muted hover:text-ink hover:bg-slate-100'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>

          {currentStep < TOUR_STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="px-4 py-1.5 bg-status-closure hover:bg-violet-700 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-ink hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
            >
              <span>Get Started</span>
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
