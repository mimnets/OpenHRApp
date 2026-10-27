import React, { useState, useEffect } from 'react';
import {
  Sparkles, Clock, Monitor, ArrowLeft, Mail,
  CheckCircle2, AlertCircle, Loader2, X
} from 'lucide-react';
import { upgradeService } from '../services/upgrade.service';
import { useSubscription } from '../context/SubscriptionContext';
import { UpgradeRequest } from '../types';
import { PRICING, yearlyPerMonth } from '../data/pricing';

interface UpgradeProps {
  onBack: () => void;
}

const EXTENSION_REASONS = [
  'Still evaluating features',
  'Waiting for budget approval',
  'Setting up organization data',
  'Training team members',
  'Non-profit organization',
  'Educational institution',
  'Other'
];

const Upgrade: React.FC<UpgradeProps> = ({ onBack }) => {
  const { subscription, refreshSubscription } = useSubscription();
  const [activeTab, setActiveTab] = useState<'plan' | 'extend' | 'ads'>('plan');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingRequest, setPendingRequest] = useState<UpgradeRequest | null>(null);

  // Extension form state
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionDays, setExtensionDays] = useState(14);
  const [customReason, setCustomReason] = useState('');

  // Check for pending request on load
  useEffect(() => {
    const checkPending = async () => {
      const pending = await upgradeService.getPendingRequest();
      setPendingRequest(pending);
    };
    checkPending();
  }, []);

  const handleExtensionSubmit = async () => {
    const reason = extensionReason === 'Other' ? customReason : extensionReason;
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Please select or enter a reason' });
      return;
    }

    setIsLoading(true);
    const result = await upgradeService.submitExtensionRequest({
      extensionReason: reason,
      extensionDays
    });

    setIsLoading(false);
    if (result.success) {
      setMessage({ type: 'success', text: 'Extension request submitted!' });
      const pending = await upgradeService.getPendingRequest();
      setPendingRequest(pending);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleAcceptAds = async () => {
    setIsLoading(true);
    const result = await upgradeService.acceptAdSupported();

    setIsLoading(false);
    if (result.success) {
      setMessage({ type: 'success', text: 'Ad-supported mode activated! Redirecting...' });
      await refreshSubscription();
      setTimeout(() => onBack(), 2000);
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  // If user already has active subscription, show message
  if (subscription?.status === 'ACTIVE') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-emerald-800 mb-2">You're All Set!</h2>
          <p className="text-emerald-600 mb-6">Your organization has full access to all features.</p>
          <button onClick={onBack} className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Upgrade Your Plan</h1>
          <p className="text-slate-500">Choose how you'd like to continue using OpenHRApp</p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-medium">{message.text}</span>
          <button onClick={() => setMessage(null)} className="ml-auto p-1 hover:bg-white/50 rounded">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Pending Request Notice */}
      {pendingRequest && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <Clock className="w-6 h-6 text-amber-600 mt-1" />
            <div>
              <h3 className="font-bold text-amber-800">Request Pending</h3>
              <p className="text-amber-700 text-sm mt-1">
                You have a pending {pendingRequest.requestType === 'DONATION' ? 'activation' : 'extension'} request submitted on{' '}
                {new Date(pendingRequest.created || '').toLocaleDateString()}.
                We'll notify you once it's processed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Intro Banner */}
      <div className="bg-gradient-to-br from-primary to-primary-hover rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="w-8 h-8" />
          <h2 className="text-xl font-bold">Every feature, free</h2>
        </div>
        <p className="text-white/90">
          OpenHRApp is free and open source. During the trial and on the free plan, the employee dashboard shows one small ad
          banner. The optional ad-free plan removes it and helps pay for the servers that keep OpenHRApp running.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'plan' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles size={18} /> Ad-free Plan
        </button>
        <button
          onClick={() => setActiveTab('extend')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'extend' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock size={18} /> Extend Trial
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'ads' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Monitor size={18} /> Free with Ads
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Ad-free Plan Tab */}
        {activeTab === 'plan' && (
          <div className="p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Ad-free Plan</h3>
              <p className="text-slate-500">
                All features, no ads, one flat price for your whole organization — however many employees you have.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border-2 border-primary bg-primary-light">
                <div className="text-2xl font-bold text-slate-900">${PRICING.yearly} <span className="text-base font-medium text-slate-500">/ year</span></div>
                <div className="text-sm text-slate-500">About {yearlyPerMonth()} a month</div>
              </div>
              <div className="p-5 rounded-xl border-2 border-slate-200">
                <div className="text-2xl font-bold text-slate-900">${PRICING.monthly} <span className="text-base font-medium text-slate-500">/ month</span></div>
                <div className="text-sm text-slate-500">Cancel anytime</div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 space-y-3 text-sm text-slate-600">
              <p className="font-bold text-slate-800">Online card payment is coming soon.</p>
              <p>
                To switch to the ad-free plan now, email{' '}
                <a href="mailto:support@openhrapp.com?subject=Ad-free%20plan" className="text-primary font-bold hover:underline">support@openhrapp.com</a>{' '}
                from your admin address with your organization name and whether you want monthly or yearly billing.
              </p>
              <p>Prices are in US dollars. Payments are refundable within {PRICING.refundDays} days.</p>
            </div>

            <a
              href="mailto:support@openhrapp.com?subject=Ad-free%20plan"
              className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
            >
              <Mail size={18} /> Email us to upgrade
            </a>
          </div>
        )}

        {/* Extension Tab */}
        {activeTab === 'extend' && (
          <div className="p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Request Trial Extension</h3>
              <p className="text-slate-500">
                Need more time? Request an extension and tell us why.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Why do you need more time? *</label>
                <select
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none"
                >
                  <option value="">Select a reason...</option>
                  {EXTENSION_REASONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              {extensionReason === 'Other' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600">Please specify *</label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Tell us more about your situation..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-light outline-none resize-none"
                    rows={3}
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Extension period</label>
                <div className="flex gap-3">
                  {[7, 14, 30].map(days => (
                    <button
                      key={days}
                      onClick={() => setExtensionDays(days)}
                      className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${
                        extensionDays === days
                          ? 'border-primary bg-primary-light text-primary'
                          : 'border-slate-200 text-slate-600 hover:border-primary-light'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleExtensionSubmit}
                disabled={isLoading || !extensionReason || (extensionReason === 'Other' && !customReason.trim())}
                className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading && <Loader2 size={18} className="animate-spin" />}
                Submit Extension Request
              </button>
            </div>
          </div>
        )}

        {/* Ad-Supported Tab */}
        {activeTab === 'ads' && (
          <div className="p-8 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Continue Free with Ads</h3>
              <p className="text-slate-500">
                Keep full access to every feature after your trial ends, at no cost. Your trial already shows the same
                small dashboard ad, so nothing changes for your team except that access no longer expires.
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-6 space-y-4">
              <h4 className="font-bold text-slate-800">What to expect:</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <span className="text-slate-600">Full access to all features - no restrictions</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <span className="text-slate-600">One small banner on the employee dashboard</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <span className="text-slate-600">No ads on attendance, camera or leave screens</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <span className="text-slate-600">Switch to the ad-free plan anytime</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              <strong>Note:</strong> By accepting, you agree to see advertisements. We never send employee records or
              organization details to ad networks. Ads load in an isolated frame that cannot read your data; like any website,
              the ad network sees the viewer's IP address and browser. See the Privacy Policy for details.
            </div>

            <button
              onClick={handleAcceptAds}
              disabled={isLoading}
              className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={18} className="animate-spin" />}
              Accept & Continue Free
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Upgrade;
