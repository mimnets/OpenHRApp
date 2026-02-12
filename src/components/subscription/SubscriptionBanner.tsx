import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { AlertTriangle, Clock } from 'lucide-react';

interface SubscriptionBannerProps {
  onUpgradeClick?: () => void;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ onUpgradeClick }) => {
  const { subscription, isLoading } = useSubscription();

  console.log('[SubscriptionBanner] subscription:', subscription, 'isLoading:', isLoading);

  if (isLoading) return null;
  if (!subscription || subscription.isSuperAdmin) return null;

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
          </span>
        </div>
        <button
          onClick={onUpgradeClick}
          className="px-3 py-1 bg-primary text-white rounded text-xs font-medium hover:bg-primary-hover transition-colors"
        >
          Upgrade Now
        </button>
      </div>
    );
  }

  // Expired banner
  if (subscription.status === 'EXPIRED') {
    return (
      <div className="px-4 py-2 flex items-center justify-between text-sm bg-red-50 border-b border-red-200 text-red-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>Your trial has expired. You are in read-only mode.</span>
        </div>
        <button
          onClick={onUpgradeClick}
          className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
        >
          Upgrade to Continue
        </button>
      </div>
    );
  }

  return null;
};
