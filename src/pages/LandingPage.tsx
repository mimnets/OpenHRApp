import React, { useEffect, Suspense } from 'react';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import PricingSection from '../components/landing/PricingSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import Footer from '../components/landing/Footer';
import { updatePageMeta, setJsonLd } from '../utils/seo';

const ShowcaseSection = React.lazy(() => import('../components/landing/ShowcaseSection'));
const FAQSection = React.lazy(() => import('../components/landing/FAQSection'));
const ContactSection = React.lazy(() => import('../components/landing/ContactSection'));
const CTASection = React.lazy(() => import('../components/landing/CTASection'));

const SectionSkeleton = () => (
  <div className="py-20 flex justify-center">
    <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
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
      'https://openhrapp.com/img/screenshot-wide.webp'
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
          image: 'https://openhrapp.com/img/screenshot-wide.webp',
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
                text: 'Yes — completely free. OpenHRApp is open-source software with no paywalls, no user limits, and no credit card required. The app is ad-supported, and you can remove ads by making a small donation to support the project.',
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
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white focus:font-semibold focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} onLoginSuccess={onLoginSuccess} />
      <main id="main-content">
        <HeroSection onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} onLoginSuccess={onLoginSuccess} />
        <TestimonialsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <Suspense fallback={<SectionSkeleton />}><PricingSection onRegisterClick={onRegisterClick} /></Suspense>
        <Suspense fallback={<SectionSkeleton />}><ShowcaseSection /></Suspense>
        <Suspense fallback={<SectionSkeleton />}><FAQSection /></Suspense>
        <Suspense fallback={<SectionSkeleton />}><ContactSection /></Suspense>
        <Suspense fallback={<SectionSkeleton />}><CTASection onRegisterClick={onRegisterClick} /></Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
