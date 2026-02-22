
import React, { useEffect } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogFooter from '../components/blog/BlogFooter';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    window.history.pushState(null, '', '/');
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <BlogNavbar onBack={handleBack} />

      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
            <Shield className="text-primary" size={28} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-3">Privacy Policy</h1>
          <p className="text-slate-500 text-sm">Last updated: February 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8">

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Introduction</h2>
              <p className="text-slate-600 leading-relaxed">
                Welcome to OpenHRApp ("we", "our", "us"). We are committed to protecting your personal information and your right to privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our HR management platform
                at <strong>openhrapp.com</strong> (the "Service").
              </p>
              <p className="text-slate-600 leading-relaxed mt-3">
                By using the Service, you agree to the collection and use of information in accordance with this policy.
                If you do not agree with the terms of this policy, please do not access the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Information We Collect</h2>
              <p className="text-slate-600 leading-relaxed mb-3">We collect information that you provide directly to us, including:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                <li><strong>Account Information:</strong> Name, email address, organization name, and role when you register.</li>
                <li><strong>Employee Data:</strong> Employee profiles, attendance records, leave applications, and related HR data entered by your organization.</li>
                <li><strong>Usage Data:</strong> Information about how you interact with the Service, including pages visited, features used, and actions taken.</li>
                <li><strong>Device Information:</strong> Browser type, operating system, device type, and IP address.</li>
                <li><strong>Location Data:</strong> Approximate location data used for attendance tracking features, only when explicitly enabled by your organization.</li>
                <li><strong>Camera Data:</strong> Camera images used for attendance verification, processed locally on your device and stored securely.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. Cookies and Analytics</h2>
              <p className="text-slate-600 leading-relaxed mb-3">
                We use cookies and similar tracking technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                <li><strong>Essential Cookies:</strong> Required for the Service to function properly (authentication, session management).</li>
                <li><strong>Analytics Cookies:</strong> We use Google Analytics to understand how visitors interact with our website. These cookies are only loaded after you provide consent through our cookie banner.</li>
                <li><strong>Vercel Analytics:</strong> We use Vercel Analytics for performance monitoring and usage insights.</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-3">
                You can choose to accept or decline analytics cookies through the consent banner shown on your first visit.
                You can change your preference at any time by clearing your browser's local storage for this site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. How We Use Your Information</h2>
              <p className="text-slate-600 leading-relaxed mb-3">We use the information we collect to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                <li>Provide, operate, and maintain the Service.</li>
                <li>Process attendance records, leave applications, and other HR functions.</li>
                <li>Send you account-related notifications and verification emails.</li>
                <li>Improve and optimize the Service through analytics.</li>
                <li>Detect and prevent fraud, abuse, and security issues.</li>
                <li>Comply with legal obligations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Data Storage and Security</h2>
              <p className="text-slate-600 leading-relaxed">
                Your data is stored securely using PocketBase as our backend database. We implement appropriate technical and
                organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Data Sharing and Disclosure</h2>
              <p className="text-slate-600 leading-relaxed mb-3">We do not sell your personal information. We may share your data only in these circumstances:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                <li><strong>Within Your Organization:</strong> HR administrators and managers within your organization can access relevant employee data as permitted by their role.</li>
                <li><strong>Service Providers:</strong> We use third-party services (hosting, analytics) that may process data on our behalf.</li>
                <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Your Rights</h2>
              <p className="text-slate-600 leading-relaxed mb-3">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal obligations.</li>
                <li><strong>Portability:</strong> Request a copy of your data in a structured, machine-readable format.</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for analytics tracking at any time via the cookie settings.</li>
              </ul>
              <p className="text-slate-600 leading-relaxed mt-3">
                Organization administrators can manage and export their organization's data through the Service's built-in tools.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Data Retention</h2>
              <p className="text-slate-600 leading-relaxed">
                We retain your personal information for as long as your account is active or as needed to provide you the Service.
                If you or your organization administrator requests account deletion, we will delete your data within 30 days,
                except where we are required to retain it for legal or compliance purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Children's Privacy</h2>
              <p className="text-slate-600 leading-relaxed">
                The Service is not intended for individuals under the age of 16. We do not knowingly collect personal information
                from children. If you become aware that a child has provided us with personal data, please contact us and we will
                take steps to delete such information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">10. Changes to This Policy</h2>
              <p className="text-slate-600 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated"
                date at the top of this page. We encourage you to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">11. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-slate-50 rounded-xl text-slate-600">
                <p><strong>OpenHRApp</strong></p>
                <p>Email: support@openhrapp.com</p>
                <p>Website: <a href="https://openhrapp.com" className="text-primary hover:underline">openhrapp.com</a></p>
              </div>
            </section>

          </div>

          {/* Back Link */}
          <div className="mt-8 text-center">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <ArrowLeft size={16} /> Back to Home
            </button>
          </div>
        </div>
      </div>

      <BlogFooter />
    </div>
  );
};

export default PrivacyPolicyPage;
