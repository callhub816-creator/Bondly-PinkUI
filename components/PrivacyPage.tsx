
import React, { useEffect } from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

interface PageProps {
  onBack: () => void;
}

const PrivacyPage: React.FC<PageProps> = ({ onBack }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#FDF2F8] font-sans text-[#5e3a58]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#FDF2F8]/90 backdrop-blur-md border-b border-[#B28DFF]/20 px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-black/5 text-[#5e3a58] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-serif-display font-bold text-[#4A2040]">Privacy Policy</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

        <p className="leading-relaxed opacity-90 text-sm">
          Bondly AI ("we", "our", or "us") is committed to protecting the privacy of our users. This Privacy Policy explains our practices regarding the collection and use of information on our platform.
        </p>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">1. Data Collection</h3>
          <p className="opacity-90">
            We collect basic information required to operate our service, including account details (such as email address) and usage data (such as feature preferences and interaction patterns). We do not collect real-world identity verification documents or sensitive personal identifiers beyond what is necessary to confirm legal age.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">2. Purpose of Usage</h3>
          <p className="opacity-90">
            Information is used to provide and maintain the service, ensure account security, detect and prevent misuse, and improve the quality of the AI-generated conversational experience.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">3. Data Protection</h3>
          <p className="opacity-90">
            We implement reasonable technical and organizational safeguards to protect your information from unauthorized access, loss, or disclosure. Your conversational data is stored securely and is not shared with unauthorized third parties.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">4. Data Sharing</h3>
          <p className="opacity-90">
            We do not sell, trade, or rent personal data to third parties for marketing purposes. Data may only be shared with service providers who assist in our operations or as required by law.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">5. Cookies and Analytics</h3>
          <p className="opacity-90">
            We use cookies to maintain your session and provide a consistent user experience. Basic, non-personalized analytics are used to monitor platform performance and usage trends.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-lg font-bold text-[#4A2040]">6. User Rights</h3>
          <p className="opacity-90">
            You have the right to access the information associated with your account and request the deletion of your data at any time. You can manage your preferences or request account closure through the platform settings.
          </p>
        </section>

        <section className="space-y-3 bg-white/50 p-6 rounded-2xl border border-white/60">
          <h3 className="text-lg font-bold text-[#4A2040]">7. Contact Policy</h3>
          <p className="opacity-90 mb-2">For any concerns regarding your privacy or data protection, email us at:</p>
          <a href="mailto:support@Bondly.in" className="text-[#B28DFF] font-medium hover:underline block">
            support@Bondly.in
          </a>
        </section>

      </div>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-[#B28DFF]/10 bg-[#FFF0F5]">
        <p className="text-[#5e3a58]/60 text-xs font-medium leading-loose">
          © 2026 Bondly AI • All Rights Reserved • 18+ Only<br />
          Entertainment & Emotional Well-being Platform
        </p>
      </footer>
    </div>
  );
};

export default PrivacyPage;
