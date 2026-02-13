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

interface LandingPageProps {
  onLoginClick: () => void;
  onRegisterClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRegisterClick }) => {
  useEffect(() => {
    // Enable smooth scrolling for the page
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
      <HeroSection onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <FAQSection />
      <ContactSection />
      <CTASection onRegisterClick={onRegisterClick} />
      <Footer />
    </div>
  );
};

export default LandingPage;
