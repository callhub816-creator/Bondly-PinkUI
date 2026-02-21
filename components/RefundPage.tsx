
import React, { useEffect } from 'react';
import { ArrowLeft, RefreshCcw } from 'lucide-react';

interface PageProps {
    onBack: () => void;
}

const RefundPage: React.FC<PageProps> = ({ onBack }) => {
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
                <h1 className="text-xl font-serif-display font-bold text-[#4A2040]">Refund & Cancellation</h1>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">

                <p className="leading-relaxed opacity-90 text-sm italic border-l-4 border-[#FF9ACB] pl-4">
                    Bondly provides digital entertainment services. Since our AI features and credits are consumed instantly, we have a clear policy regarding refunds and cancellations.
                </p>

                <section className="space-y-3">
                    <h3 className="text-lg font-bold text-[#4A2040]">1. Digital Consumption</h3>
                    <p className="opacity-90 leading-relaxed">
                        Bondly AI operates using digital credits that are consumed instantly to access AI-powered features. Once credits are used for chats, calls, or other features, the service is considered fully consumed.
                    </p>
                </section>

                <section className="space-y-4">
                    <div className="bg-[#B28DFF]/5 p-6 rounded-2xl border border-[#B28DFF]/20">
                        <h3 className="text-lg font-bold text-[#4A2040] mb-3">2. Refund Policy</h3>
                        <p className="text-sm opacity-90 leading-relaxed mb-4">
                            Refunds are not provided for credits that have already been utilized or for active subscription cycles that have been accessed.
                        </p>
                        <p className="text-sm opacity-90 leading-relaxed">
                            In the event of a successful payment where credits were not added due to a platform error, or in cases of duplicate transactions, users are eligible for a review.
                        </p>
                    </div>
                </section>

                <section className="space-y-3">
                    <h3 className="text-lg font-bold text-[#4A2040]">3. Processing Timeline</h3>
                    <p className="opacity-90 leading-relaxed">
                        Eligible refund requests (duplicate or failed additions) will be processed back to the original payment method within <strong>5–7 business days</strong> following internal review and approval.
                    </p>
                </section>

                <section className="space-y-3 bg-white/50 p-6 rounded-2xl border border-white/60">
                    <div className="flex items-center gap-2 mb-2">
                        <RefreshCcw size={20} className="text-[#B28DFF]" />
                        <h3 className="text-lg font-bold text-[#4A2040]">Support & Contact</h3>
                    </div>
                    <p className="opacity-90 mb-4">We are here to resolve any billing issues within 24 hours.</p>
                    <div className="space-y-2">
                        <a href="mailto:support@Bondly.in" className="text-[#B28DFF] font-medium hover:underline block">
                            Email: support@Bondly.in
                        </a>
                    </div>
                </section>

            </div>

            {/* Footer */}
            <footer className="py-8 px-6 text-center border-t border-[#B28DFF]/10 bg-[#FFF0F5]">
                <p className="text-[#5e3a58]/60 text-xs font-medium leading-loose">
                    © 2026 Bondly AI • All Rights Reserved<br />
                    Secure checkout powered by Razorpay
                </p>
            </footer>
        </div>
    );
};

export default RefundPage;
