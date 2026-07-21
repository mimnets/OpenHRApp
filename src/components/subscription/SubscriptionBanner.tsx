import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { AlertTriangle, Clock, Beaker, LogOut } from 'lucide-react';

interface SubscriptionBannerProps {
  onUpgradeClick?: () => void;
  userRole?: string;
  onExitDemo?: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ onUpgradeClick, userRole, onExitDemo }) => {
  const { subscription, isLoading } = useSubscription();

  if (isLoading) return null;
  if (!subscription || subscription.isSuperAdmin) return null;

  // Demo mode banner — always visible on every page
  if (subscription.isDemo) {
    return (
      <div className="px-4 py-2.5 flex items-center justify-between text-sm bg-indigo-50 border-b border-indigo-200 text-indigo-700">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">
            🧪 Demo Mode — Data resets daily. No data saved.
          </span>
        </div>
        {onExitDemo && (
          <button
            onClick={onExitDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
          >
            <LogOut size={12} /> Exit Demo
          </button>
        )}
      </div>
    );
  }

  const canUpgrade = userRole === 'ADMIN' || userRole === 'HR';

  // Trial banner with countdown
  if (subscription.status === 'TRIAL' && subscription.daysRemaining !== undefined) {
    const isUrgent = subscription.daysRemaining <= 3;

    return (
      <div className={`px-4 py-2 flex items-center justify-between text-sm ${
        isUrgent
          ? 'bg-red-50 border-b border-red-200 text-red-700'
          : 'bg-amber-50 border-b border-amber-200 text-amber-700'
      }`}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>
            {subscription.daysRemaining === 0
              ? 'Your trial expires today!'
              : subscription.daysRemaining === 1
                ? 'Trial: 1 day remaining'
                : `Trial: ${subscription.daysRemaining} days remaining`
            }
            {!canUpgrade && ' — Contact your administrator to upgrade.'}
          </span>
        </div>
        {canUpgrade && (
          <button
            onClick={onUpgradeClick}
            className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary-hover transition-colors"
          >
            Upgrade Now
          </button>
        )}
      </div>
    );
  }

  // Expired banner
  if (subscription.status === 'EXPIRED') {
    return (
      <div className="px-4 py-2 flex items-center justify-between text-sm bg-red-50 border-b border-red-200 text-red-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>
            Your trial has expired. {canUpgrade ? 'You are in read-only mode.' : 'Read-only mode — Contact your administrator to upgrade.'}
          </span>
        </div>
        {canUpgrade && (
          <button
            onClick={onUpgradeClick}
            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
          >
            Upgrade to Continue
          </button>
        )}
      </div>
    );
  }

  return null;
};
