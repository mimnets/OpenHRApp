import React, { useEffect } from 'react';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import TestimonialsSection from '../components/landing/TestimonialsSection';
import FAQSection from '../components/landing/FAQSection';
import ContactSection from '../components/landing/ContactSection';
import CTASection from '../components/landing/CTASection';
import Footer from '../components/landing/Footer';
import ShowcaseSection from '../components/landing/ShowcaseSection';
import { PublicAdBanner } from '../components/ads';
import { updatePageMeta, setJsonLd } from '../utils/seo';

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLoginSuccess?: (user: any) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRegisterClick, onLoginSuccess }) => {
  useEffect(() => {
    // Enable smooth scrolling for the page
    document.documentElement.style.scrollBehavior = 'smooth';

    // Reset meta to defaults for the landing page
    updatePageMeta(
      'OpenHRApp - Open Source HR Management System | Free HRMS Software',
      'OpenHRApp is a free, open-source HR management system for organizations. Features include attendance tracking, leave management, employee directory, and local compliance tools.',
      'https://openhrapp.com/',
      'https://openhrapp.com/img/screenshot-wide.webp'
    );

    // Set combined JSON-LD for landing page
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
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            reviewCount: '5',
            bestRating: '5',
            worstRating: '1',
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
                text: 'Yes! OpenHRApp offers a free ad-supported plan for small teams. We also offer premium plans with additional features like advanced analytics, priority support, and no ads.',
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
    <div className="min-h-screen bg-[#f8fafc]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white focus:font-semibold focus:shadow-lg"
      >
        Skip to content
      </a>
      <Navbar onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} onLoginSuccess={onLoginSuccess} />
      <main id="main-content">
        <HeroSection onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} onLoginSuccess={onLoginSuccess} />
        <div className="py-4 flex justify-center"><PublicAdBanner slot="landing-hero" /></div>
        <FeaturesSection />
        <HowItWorksSection />
        <div className="py-4 flex justify-center"><PublicAdBanner slot="landing-mid" /></div>
        <TestimonialsSection />
        <ShowcaseSection />
        <FAQSection />
        <ContactSection />
        <CTASection onRegisterClick={onRegisterClick} />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
