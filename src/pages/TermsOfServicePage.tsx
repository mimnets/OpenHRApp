
import React, { useEffect } from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import BlogNavbar from '../components/blog/BlogNavbar';
import BlogFooter from '../components/blog/BlogFooter';
import { updatePageMeta } from '../utils/seo';

interface TermsOfServicePageProps {
  onBack: () => void;
}

const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
    updatePageMeta(
      'Terms of Service — OpenHRApp',
      'Read the Terms of Service for OpenHRApp. Understand your rights, responsibilities, and the rules governing use of our open-source HR management platform.',
      'https://openhrapp.com/terms'
    );
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
            <FileText className="text-primary" size={28} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 mb-3">Terms of Service</h1>
          <p className="text-slate-500 text-sm">Last updated: February 2026</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8">

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                By accessing or using OpenHRApp ("the Service") at <strong>openhrapp.com</strong>, you agree to be bound by these
                Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
                These Terms apply to all visitors, users, and others who access or use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">2. Description of Service</h2>
              <p className="text-slate-600 leading-relaxed">
                OpenHRApp is an open-source HR management platform that provides tools for attendance tracking, leave management,
                employee directory management, reporting, and other human resource functions. The Service is provided "as is" and
                "as available" for organizations and their authorized users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">3. User Accounts</h2>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                <li>You must register an organization account to use the Service. You are responsible for maintaining the confidentiality of your account credentials.</li>
                <li>You must provide accurate and complete information during registration and keep your account information up to date.</li>
                <li>You are responsible for all activities that occur under your account.</li>
                <li>Organization administrators are responsible for managing user access and permissions within their organization.</li>
                <li>You must notify us immediately of any unauthorized use of your account or any other security breach.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">4. Acceptable Use</h2>
              <p className="text-slate-600 leading-relaxed mb-3">You agree not to use the Service to:</p>
              <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                <li>Violate any applicable laws, regulations, or third-party rights.</li>
                <li>Upload or transmit viruses, malware, or other malicious code.</li>
                <li>Attempt to gain unauthorized access to the Service, other accounts, or related systems.</li>
                <li>Use the Service for any purpose other than legitimate HR management activities.</li>
                <li>Interfere with or disrupt the integrity or performance of the Service.</li>
                <li>Store or process sensitive personal data (such as medical records, financial data, or government IDs) beyond what is necessary for HR management purposes.</li>
                <li>Use the Service to send spam, unsolicited communications, or for phishing purposes.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">5. Organization Data</h2>
              <p className="text-slate-600 leading-relaxed">
                Your organization retains ownership of all data entered into the Service ("Organization Data"). We do not claim ownership
                over your Organization Data. You grant us a limited license to host, store, and process your Organization Data solely
                for the purpose of providing the Service. Organization administrators can export and delete their data at any time
                through the Service's built-in tools.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">6. Subscription and Billing</h2>
              <p className="text-slate-600 leading-relaxed">
                The Service offers both free and paid subscription plans. Paid plans provide additional features and higher usage limits.
                Payment terms, pricing, and plan details are displayed within the Service. We reserve the right to modify pricing with
                reasonable notice. If your subscription is suspended due to non-payment, you may lose access to certain features until
                payment is resolved.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">7. Open Source License</h2>
              <p className="text-slate-600 leading-relaxed">
                OpenHRApp is an open-source project. The source code is available under its respective open-source license on GitHub.
                These Terms of Service govern your use of the hosted Service at openhrapp.com. If you choose to self-host the application,
                the open-source license terms apply to the software, while these Terms do not apply to self-hosted instances.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">8. Service Availability</h2>
              <p className="text-slate-600 leading-relaxed">
                We strive to maintain the availability and reliability of the Service, but we do not guarantee uninterrupted or error-free operation.
                We may temporarily suspend the Service for maintenance, updates, or other operational reasons. We will make reasonable efforts to
                provide advance notice of planned downtime.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">9. Limitation of Liability</h2>
              <p className="text-slate-600 leading-relaxed">
                To the maximum extent permitted by applicable law, OpenHRApp and its contributors shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages, including but not limited to loss of profits, data, use, or goodwill, arising out of
                or in connection with your use of the Service. Our total liability for any claims arising under these Terms shall not exceed the
                amount you have paid us in the twelve (12) months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">10. Disclaimer of Warranties</h2>
              <p className="text-slate-600 leading-relaxed">
                The Service is provided on an "AS IS" and "AS AVAILABLE" basis, without warranties of any kind, either express or implied,
                including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
                We do not warrant that the Service will meet your specific requirements or that it will be error-free.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">11. Termination</h2>
              <p className="text-slate-600 leading-relaxed">
                We reserve the right to suspend or terminate your access to the Service at any time, with or without cause, with or without notice.
                Upon termination, your right to use the Service will immediately cease. You may also terminate your account at any time by
                contacting us. All provisions of these Terms that by their nature should survive termination shall survive, including
                ownership provisions, warranty disclaimers, and limitations of liability.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">12. Changes to These Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will provide notice of material changes by updating the
                "Last updated" date at the top of this page. Your continued use of the Service after any changes constitutes acceptance
                of the new Terms. We encourage you to review these Terms periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">13. Governing Law</h2>
              <p className="text-slate-600 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws applicable to your jurisdiction, without regard
                to its conflict of law provisions. Any disputes arising under these Terms shall be resolved through good-faith negotiation
                before pursuing formal legal action.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-900 mb-3">14. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
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

export default TermsOfServicePage;
