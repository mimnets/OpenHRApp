import React, { useEffect } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogFooter from '../components/blog/BlogFooter';
import { updatePageMeta, setJsonLd } from '../utils/seo';
import { PRICING } from '../data/pricing';

interface RefundPolicyPageProps {
  onBack: () => void;
}

const DESCRIPTION = `OpenHRApp refund policy: a full refund on request within ${PRICING.refundDays} days of any payment for the ad-free plan. Cancel anytime.`;

const RefundPolicyPage: React.FC<RefundPolicyPageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
    updatePageMeta('Refund Policy — OpenHRApp', DESCRIPTION, 'https://openhrapp.com/refund');
    setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Refund Policy — OpenHRApp',
      description: DESCRIPTION,
      url: 'https://openhrapp.com/refund',
      isPartOf: { '@type': 'WebSite', name: 'OpenHRApp', url: 'https://openhrapp.com' },
    });
    return () => { setJsonLd(null); };
  }, []);

  const handleBack = () => {
    window.history.pushState(null, '', '/');
    onBack();
  };

  const h2 = 'text-xl font-bold text-dl-ink mb-3';
  const p = 'text-dl-muted leading-relaxed';

  return (
    <div className="min-h-screen bg-dl-ground flex flex-col">
      <BlogNavbar onBack={handleBack} />

      <div className="bg-dl-surface border-b border-dl-hair-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-dl-lg bg-dl-teal/10 mb-4">
            <RotateCcw className="text-dl-teal" size={28} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-dl-ink mb-3">Refund Policy</h1>
          <p className="text-dl-muted text-sm">Last updated: October 2026</p>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-dl-surface rounded-dl-lg border border-dl-hair shadow-dl-1 p-6 sm:p-10 space-y-8">
            <section>
              <h2 className={h2}>1. {PRICING.refundDays}-day refund</h2>
              <p className={p}>
                If you are not happy with the OpenHRApp ad-free plan, you can ask for a full refund within {PRICING.refundDays} days
                of the payment. This applies to your first payment and to every renewal, monthly or yearly. You do not need to give
                a reason.
              </p>
            </section>

            <section>
              <h2 className={h2}>2. How to request a refund</h2>
              <p className={p}>
                Email <a href="mailto:support@openhrapp.com" className="text-dl-teal hover:underline">support@openhrapp.com</a> from
                your organization admin address, with your organization name and the date of the payment. You can also reply to the
                receipt email you received from {PRICING.merchantOfRecord}, or contact Paddle directly at{' '}
                <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="text-dl-teal hover:underline">paddle.net</a>.
              </p>
            </section>

            <section>
              <h2 className={h2}>3. How refunds are paid</h2>
              <p className={p}>
                Our order process is conducted by our online reseller {PRICING.merchantOfRecord}, which is the Merchant of Record for
                all orders. Approved refunds are issued by Paddle to the original payment method, usually within 5–10 business days
                depending on your bank. Once refunded, the organization returns to the free plan; no data is deleted.
              </p>
            </section>

            <section>
              <h2 className={h2}>4. After {PRICING.refundDays} days</h2>
              <p className={p}>
                Payments older than {PRICING.refundDays} days are not refunded, but you can cancel at any time to stop future renewals.
                Your organization stays ad-free until the end of the period already paid for. This does not affect any rights you have
                under consumer law in your country.
              </p>
            </section>

            <section>
              <h2 className={h2}>5. Free plan</h2>
              <p className={p}>
                The free plan has no charges, so there is nothing to refund. All features remain available on the free plan.
              </p>
            </section>

            <section>
              <h2 className={h2}>6. Contact</h2>
              <div className="mt-3 p-4 bg-dl-ground rounded-dl-md text-dl-muted">
                <p><strong>OpenHRApp</strong>, operated by Monirul Islam</p>
                <p>Email: support@openhrapp.com</p>
                <p>House-38, Road-05, Sector-03, Uttara, Dhaka-1230, Bangladesh</p>
              </div>
            </section>
          </div>

          <div className="mt-8 text-center">
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

export default RefundPolicyPage;
