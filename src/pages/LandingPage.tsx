import React, { useEffect, Suspense } from 'react';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import PricingSection from '../components/landing/PricingSection';
import ProofSection from '../components/landing/ProofSection';
import Footer from '../components/landing/Footer';
import { updatePageMeta, setJsonLd } from '../utils/seo';

const ShowcaseSection = React.lazy(() => import('../components/landing/ShowcaseSection'));
const FAQSection = React.lazy(() => import('../components/landing/FAQSection'));
const RoadmapSection = React.lazy(() => import('../components/landing/RoadmapSection'));
const CTASection = React.lazy(() => import('../components/landing/CTASection'));

const SectionSkeleton = () => (
  <div className="py-20 flex justify-center">
    <div className="w-8 h-8 border-2 border-dl-teal/20 border-t-dl-teal rounded-full animate-spin" />
  </div>
);

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLoginSuccess?: (user: any) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRegisterClick, onLoginSuccess }) => {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';

    updatePageMeta(
      'OpenHRApp — Free Open-Source HR Management Software',
      'OpenHRApp is a free, open-source HR platform with attendance tracking, leave management, and employee directory. Get started today — no credit card required, completely free forever.',
      'https://openhrapp.com/',
      'https://openhrapp.com/img/screenshot-wide.png'
    );

    setJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          name: 'OpenHRApp',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web, Android, iOS',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
          description: 'Free, open-source HR management system with attendance tracking, leave management, employee directory, and compliance tools.',
          url: 'https://openhrapp.com',
          image: 'https://openhrapp.com/img/screenshot-wide.png',
        },
        {
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'What is OpenHRApp?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'OpenHRApp is a modern, open-source HR management platform that helps organizations manage attendance, leave, and employee records in one place. It works as a Progressive Web App (PWA) on any device.',
              },
            },
            {
              '@type': 'Question',
              name: 'Is OpenHRApp really free?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes. Every feature is free for every organization, with no user limits and no credit card required. The free plan shows ads. If you prefer no ads, the optional ad-free plan is $3 a month or $24 a year per organization, which mainly covers server costs.',
              },
            },
            {
              '@type': 'Question',
              name: 'How does selfie-based attendance work?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Employees check in by taking a selfie through the app. The system captures the photo along with GPS coordinates and timestamp, ensuring authentic and verifiable attendance records.',
              },
            },
            {
              '@type': 'Question',
              name: 'How do employees apply for leave?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: 'Employees select their leave type, dates, and add an optional reason through the app. Managers receive a notification and can approve or reject with one click.',
              },
            },
          ],
        },
      ],
    });

    return () => {
      document.documentElement.style.scrollBehavior = '';
      setJsonLd(null);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-dl-sm focus:bg-dl-teal focus:text-dl-surface focus:font-semibold focus:shadow-dl-2"
      >
        Skip to content
      </a>
      <Navbar onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} onLoginSuccess={onLoginSuccess} />
      <main id="main-content" className="dl-bands" data-advertising="eligible">
        {/* Section order per plan Addendum 1, N5 (finding F-L2). The page previously ran
            Hero -> Testimonials -> Features, putting social proof before the visitor knew what
            the product did, and burying the Showcase — the actual screenshots, the strongest
            evidence the thing is real — in sixth place below the fold.

            Now: explain the product, show it, price it, then answer objections. The proof block
            sits immediately after the Showcase, where evidence belongs once there is something
            to be evidence *for*.

            ContactSection is deliberately NOT here. It now lives only at /contact (N1), which is
            the distinct page AdSense reviewers look for; duplicating the form inline gave the
            visitor two places to submit the same thing and gave the page a second <h2> competing
            with the CTA. The navbar and footer both link to /contact. */}
        <HeroSection onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} onLoginSuccess={onLoginSuccess} />
        <FeaturesSection />
        <HowItWorksSection />
        <Suspense fallback={<SectionSkeleton />}><ShowcaseSection /></Suspense>
        <ProofSection />
        <Suspense fallback={<SectionSkeleton />}><PricingSection onRegisterClick={onRegisterClick} /></Suspense>
        <Suspense fallback={<SectionSkeleton />}><FAQSection /></Suspense>
        <Suspense fallback={<SectionSkeleton />}><RoadmapSection /></Suspense>
        <Suspense fallback={<SectionSkeleton />}><CTASection onRegisterClick={onRegisterClick} /></Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
