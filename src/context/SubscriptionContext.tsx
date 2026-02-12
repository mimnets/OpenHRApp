import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { SubscriptionStatus, SubscriptionInfo } from '../types';
import { pb } from '../services/pocketbase';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  refreshSubscription: () => Promise<void>;
  canPerformAction: (action: 'write' | 'read') => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// Refresh interval: 2 minutes (in milliseconds)
const REFRESH_INTERVAL = 2 * 60 * 1000;

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshSubscription = useCallback(async () => {
    if (!user || !pb?.authStore.isValid) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('[Subscription] Fetching subscription status...');
      const response = await pb.send('/api/openhr/subscription-status', {
        method: 'GET'
      });
      console.log('[Subscription] Response:', response);

      const subscriptionData = {
        status: response.status as SubscriptionStatus,
        trialEndDate: response.trialEndDate,
        daysRemaining: response.daysRemaining,
        isSuperAdmin: response.isSuperAdmin,
        isReadOnly: response.status === 'EXPIRED',
        isBlocked: response.status === 'SUSPENDED',
        showAds: response.showAds === true || response.status === 'AD_SUPPORTED'
      };
      console.log('[Subscription] Setting subscription:', subscriptionData);
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('[Subscription] Failed to fetch subscription status:', error);
      // If we can't verify, assume active to not block users
      setSubscription({
        status: 'ACTIVE',
        isSuperAdmin: false,
        isReadOnly: false,
        isBlocked: false,
        showAds: false
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch when user logs in
  useEffect(() => {
    if (user) {
      refreshSubscription();
    } else {
      setSubscription(null);
      setIsLoading(false);
    }
  }, [user, refreshSubscription]);

  // Set up periodic refresh to catch Super Admin changes
  useEffect(() => {
    if (user && !subscription?.isSuperAdmin) {
      // Clear any existing interval
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // Set up new interval for non-Super Admin users
      refreshIntervalRef.current = setInterval(() => {
        console.log('[Subscription] Periodic refresh...');
        refreshSubscription();
      }, REFRESH_INTERVAL);

      // Cleanup on unmount or user change
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
          refreshIntervalRef.current = null;
        }
      };
    }
  }, [user, subscription?.isSuperAdmin, refreshSubscription]);

  const canPerformAction = useCallback((action: 'write' | 'read'): boolean => {
    if (!subscription) return true; // Allow if not loaded yet
    if (subscription.isSuperAdmin) return true;
    if (subscription.isBlocked) return false;
    if (action === 'read') return true;
    if (action === 'write') return !subscription.isReadOnly;
    return false;
  }, [subscription]);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isLoading,
      refreshSubscription,
      canPerformAction
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};
