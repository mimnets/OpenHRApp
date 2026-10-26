import React, { useEffect } from 'react';
import { ArrowLeft, Check, Tag } from 'lucide-react';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogFooter from '../components/blog/BlogFooter';
import { updatePageMeta, setJsonLd, navigateTo } from '../utils/seo';
import { PRICING, yearlyPerMonth } from '../data/pricing';

interface PricingPageProps {
  onBack: () => void;
  onRegisterClick: () => void;
}

const DESCRIPTION = `OpenHRApp pricing: every feature free with ads, or an ad-free plan for $${PRICING.monthly}/month or $${PRICING.yearly}/year per organization. No per-employee fees.`;

const INCLUDED = [
  'Selfie and GPS attendance, office and factory modes',
  'Leave requests, approvals and balances',
  'Employee directory, teams and shifts',
  'Reports and data export',
  'Performance reviews and announcements',
  'Unlimited employees — no per-user pricing',
];

const PricingPage: React.FC<PricingPageProps> = ({ onBack, onRegisterClick }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
    updatePageMeta('Pricing — OpenHRApp', DESCRIPTION, 'https://openhrapp.com/pricing');
    setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'OpenHRApp Ad-free plan',
      description: DESCRIPTION,
      url: 'https://openhrapp.com/pricing',
      offers: [
        { '@type': 'Offer', name: 'Monthly', price: PRICING.monthly.toFixed(2), priceCurrency: PRICING.currency },
        { '@type': 'Offer', name: 'Yearly', price: PRICING.yearly.toFixed(2), priceCurrency: PRICING.currency },
      ],
    });
    return () => { setJsonLd(null); };
  }, []);

  const handleBack = () => {
    window.history.pushState(null, '', '/');
    onBack();
  };

  const card = 'bg-dl-surface rounded-dl-lg border border-dl-hair shadow-dl-1 p-6 sm:p-8 flex flex-col';
  const link = 'text-dl-teal hover:underline font-semibold';

  return (
    <div className="min-h-screen bg-dl-ground flex flex-col">
      <BlogNavbar onBack={handleBack} />

      <div className="bg-dl-surface border-b border-dl-hair-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-dl-lg bg-dl-teal/10 mb-4">
            <Tag className="text-dl-teal" size={28} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-dl-ink mb-3">Simple, small pricing</h1>
          <p className="text-dl-muted max-w-2xl mx-auto">
            Every feature is free for every organization. If you would rather have no ads, the ad-free plan costs about what
            it takes to keep your workspace's servers running — one flat price per organization, however many employees you have.
          </p>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
          <div className="grid md:grid-cols-2 gap-6">
            <div className={card}>
              <h2 className="text-xl font-bold text-dl-ink">Free</h2>
              <p className="mt-2"><span className="text-4xl font-bold text-dl-ink">$0</span><span className="text-dl-muted"> / forever</span></p>
              <p className="text-dl-muted text-sm mt-2">All features, with ads. Your first {PRICING.adFreeTrialDays} days are ad-free.</p>
              <button onClick={onRegisterClick}
                className="mt-6 px-5 py-3 rounded-dl-md border border-dl-teal text-dl-teal font-bold text-sm hover:bg-dl-teal/10 transition-colors">
                Get started free
              </button>
            </div>

            <div className={`${card} border-dl-teal ring-2 ring-dl-teal/30`}>
              <h2 className="text-xl font-bold text-dl-ink">Ad-free</h2>
              <p className="mt-2">
                <span className="text-4xl font-bold text-dl-ink">${PRICING.yearly}</span><span className="text-dl-muted"> / year</span>
              </p>
              <p className="text-dl-muted text-sm mt-1">
                That is {yearlyPerMonth()} a month, or ${PRICING.monthly} billed monthly. Per organization, not per employee.
              </p>
              <p className="text-dl-muted text-sm mt-2">All features, no ads, and you help keep OpenHRApp running.</p>
              <button onClick={onRegisterClick}
                className="mt-6 px-5 py-3 rounded-dl-md bg-dl-teal text-dl-surface font-bold text-sm hover:opacity-90 transition-opacity">
                Start free, upgrade anytime
              </button>
            </div>
          </div>

          <div className={card}>
            <h2 className="text-lg font-bold text-dl-ink mb-4">Included in both plans</h2>
            <ul className="grid sm:grid-cols-2 gap-3">
              {INCLUDED.map((f) => (
                <li key={f} className="flex gap-2 text-sm text-dl-muted"><Check size={18} className="text-dl-teal shrink-0" /> {f}</li>
              ))}
            </ul>
          </div>

          <div className={`${card} space-y-4 text-sm text-dl-muted leading-relaxed`}>
            <h2 className="text-lg font-bold text-dl-ink">Billing questions</h2>
            <p><strong className="text-dl-ink">How do I upgrade?</strong> An organization admin can upgrade from inside the app under Upgrade. Prices are in US dollars; sales tax or VAT is added where required.</p>
            <p><strong className="text-dl-ink">Who processes payments?</strong> Our order process is conducted by our online reseller {PRICING.merchantOfRecord}, which is the Merchant of Record for all orders and handles billing, invoices and tax.</p>
            <p><strong className="text-dl-ink">Can I cancel?</strong> Yes, at any time. Your plan stays ad-free until the end of the period you paid for, then returns to the free plan. Your data is never deleted because you cancel.</p>
            <p><strong className="text-dl-ink">Refunds?</strong> Full refund within {PRICING.refundDays} days of a payment. See our <a href="/refund" className={link} onClick={(e) => { e.preventDefault(); navigateTo('/refund'); }}>Refund Policy</a> and <a href="/terms" className={link} onClick={(e) => { e.preventDefault(); navigateTo('/terms'); }}>Terms of Service</a>.</p>
          </div>

          <div className="text-center">
            <button onClick={handleBack} className="inline-flex items-center gap-2 text-sm font-semibold text-dl-teal hover:underline">
              <ArrowLeft size={16} /> Back to Home
            </button>
          </div>
        </div>
      </div>

      <BlogFooter />
    </div>
  );
};

export default PricingPage;
