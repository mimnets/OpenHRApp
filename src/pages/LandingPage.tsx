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

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
  onLoginSuccess?: (user: any) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRegisterClick, onLoginSuccess }) => {
  useEffect(() => {
    // Enable smooth scrolling for the page
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} onLoginSuccess={onLoginSuccess} />
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
      <Footer />
    </div>
  );
};

export default LandingPage;
