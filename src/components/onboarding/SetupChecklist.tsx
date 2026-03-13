
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, ArrowRight, HelpCircle, PartyPopper, RotateCcw, BookOpen } from 'lucide-react';
import { useSetupChecklist, SetupStep } from '../../hooks/onboarding/useSetupChecklist';

interface Props {
  user: any;
  onNavigate: (path: string, params?: any) => void;
}

const StepItem: React.FC<{
  step: SetupStep;
  status: 'completed' | 'current' | 'upcoming';
  isLast: boolean;
  onGo: () => void;
}> = ({ step, status, isLast, onGo }) => {
  const handleHelp = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`/how-to-use/${step.tutorialSlug}`, '_blank');
  };

  return (
    <div className="flex gap-3 items-start">
      {/* Timeline column */}
      <div className="flex flex-col items-center flex-shrink-0">
        {/* Number bubble */}
        {status === 'completed' ? (
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
            <CheckCircle2 size={16} className="text-white" />
          </div>
        ) : status === 'current' ? (
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary-light animate-pulse">
            <span className="text-xs font-bold text-white">{step.id}</span>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-full border-2 border-slate-200 flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-400">{step.id}</span>
          </div>
        )}
        {/* Connecting line */}
        {!isLast && (
          <div className={`w-0.5 flex-1 min-h-[16px] mt-1 ${status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
        )}
      </div>

      {/* Content column */}
      <div className={`flex-1 pb-3`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold leading-tight ${status === 'completed' ? 'text-emerald-700 line-through' : status === 'current' ? 'text-slate-900' : 'text-slate-400'}`}>
              {step.title}
            </p>
            {status === 'current' && (
              <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {status === 'completed' && (
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Done</span>
            )}
            {status === 'current' && (
              <button
                onClick={onGo}
                className="flex items-center gap-1 px-2.5 py-1 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-all active:scale-95"
              >
                Go <ArrowRight size={12} />
              </button>
            )}
            <button
              onClick={handleHelp}
              title="View Guide"
              className="p-1 rounded-full text-primary/40 hover:text-primary hover:bg-primary-light transition-all"
            >
              <HelpCircle size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SetupChecklist: React.FC<Props> = ({ user, onNavigate }) => {
  const {
    steps, isLoading, isDismissed, completedCount, totalCount, allComplete, dismiss, reEnable, isAdminOrHR
  } = useSetupChecklist(user.role);

  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!isAdminOrHR) return null;
  if (isLoading) return null;

  // When dismissed, show a compact "bring back" button on the dashboard
  if (isDismissed) {
    return (
      <button
        onClick={reEnable}
        className="w-full flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-dashed border-slate-200 hover:border-primary/30 hover:bg-primary-light/30 transition-all group"
      >
        <div className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
          <BookOpen size={16} className="text-primary" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold text-slate-600 group-hover:text-primary transition-colors">Show Setup Guide</p>
          <p className="text-[10px] text-slate-400">Reopen the step-by-step organization setup checklist</p>
        </div>
        <RotateCcw size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
      </button>
    );
  }

  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleGoToStep = (step: SetupStep) => {
    if (step.navigateTab) {
      onNavigate(step.navigateTo, { tab: step.navigateTab });
    } else {
      onNavigate(step.navigateTo);
    }
  };

  const getStepStatus = (step: SetupStep): 'completed' | 'current' | 'upcoming' => {
    if (step.completed) return 'completed';
    const firstIncomplete = steps.find(s => !s.completed);
    if (firstIncomplete && firstIncomplete.id === step.id) return 'current';
    return 'upcoming';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-500">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-light flex items-center justify-center">
            {allComplete ? (
              <PartyPopper size={18} className="text-primary" />
            ) : (
              <span className="text-sm font-bold text-primary">{completedCount}/{totalCount}</span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {allComplete ? 'Setup Complete!' : 'Set Up Your Organization'}
            </h3>
            <p className="text-xs text-slate-500">
              {allComplete ? 'Your organization is fully configured.' : 'Complete these steps to get your team started'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCollapsed ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronUp size={18} className="text-slate-400" />}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-5">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${allComplete ? 'bg-emerald-500' : 'bg-primary'}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      {!isCollapsed && (
        <div className="px-5 pt-4 pb-3">
          {allComplete ? (
            <div className="text-center py-4">
              <p className="text-sm text-emerald-700 font-medium mb-3">
                All {totalCount} steps completed. Your organization is ready to go!
              </p>
              <button
                onClick={dismiss}
                className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
              >
                Hide this checklist
              </button>
            </div>
          ) : (
            <>
              {steps.map((step, idx) => (
                <StepItem
                  key={step.id}
                  step={step}
                  status={getStepStatus(step)}
                  isLast={idx === steps.length - 1}
                  onGo={() => handleGoToStep(step)}
                />
              ))}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {completedCount} of {totalCount} complete
                </p>
                <button
                  onClick={dismiss}
                  className="text-[10px] text-slate-400 hover:text-slate-600 underline transition-colors"
                >
                  Don't show this again
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SetupChecklist;

// Re-enable button for use in Settings page
export const ReEnableSetupGuide: React.FC<{ userRole: string }> = ({ userRole }) => {
  const { isDismissed, reEnable, isAdminOrHR } = useSetupChecklist(userRole);

  if (!isAdminOrHR || !isDismissed) return null;

  return (
    <button
      onClick={reEnable}
      className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
    >
      <RotateCcw size={14} />
      Re-enable Setup Guide
    </button>
  );
};
