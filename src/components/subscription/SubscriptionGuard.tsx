import React from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { AlertTriangle } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  action?: 'write' | 'read';
  fallback?: React.ReactNode;
  showMessage?: boolean;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  action = 'write',
  fallback,
  showMessage = true
}) => {
  const { subscription, canPerformAction } = useSubscription();

  if (canPerformAction(action)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showMessage) {
    return null;
  }

  const getMessage = () => {
    if (subscription?.status === 'EXPIRED') {
      return 'Your trial has expired. Upgrade to continue using this feature.';
    }
    if (subscription?.status === 'SUSPENDED') {
      return 'Your account is suspended. Contact support for assistance.';
    }
    return 'This feature is not available with your current subscription.';
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{getMessage()}</span>
    </div>
  );
};

// Hook for checking permissions in event handlers
export const useSubscriptionCheck = () => {
  const { subscription, canPerformAction } = useSubscription();

  const checkAndAlert = (action: 'write' | 'read' = 'write'): boolean => {
    if (canPerformAction(action)) {
      return true;
    }

    if (subscription?.status === 'EXPIRED') {
      alert('Your trial has expired. Please upgrade to continue using this feature.');
    } else if (subscription?.status === 'SUSPENDED') {
      alert('Your account is suspended. Please contact support.');
    }

    return false;
  };

  return { checkAndAlert, canPerformAction, subscription };
};
