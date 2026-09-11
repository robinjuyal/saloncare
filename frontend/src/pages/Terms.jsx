import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Scissors, Mail, ShieldCheck, Clock, HelpCircle } from 'lucide-react';
import ContactModal from '../components/ContactModal';

export default function Terms() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="bg-slate-50 min-h-screen font-sans text-slate-900 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Back navigation */}
        <button
          type="button"
          onClick={() => (user ? navigate('/') : navigate(-1))}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm sm:text-base font-semibold mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-xs">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0 rotate-3 shadow-md shadow-emerald-600/20">
              <Scissors className="text-white -rotate-3" size={18} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Terms & Conditions
            </h1>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mb-8 ml-[52px]">
            Last updated: September 2026
          </p>

          <div className="space-y-8 text-sm sm:text-base text-slate-600 leading-relaxed">
            <p>
              These terms govern queue reservations and service bookings through SalonQueue / SalonCare.
              By creating an account or completing a booking, you agree to the policies outlined below.
            </p>

            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <Clock size={18} className="text-emerald-600 shrink-0" />
                1. Booking & Cancellation Policy
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-slate-800">Confirmed Queue Placement:</strong> Your place in the salon's live queue is officially locked in only after payment verification. Unfinished or cancelled checkouts do not reserve a queue slot.
                </li>
                <li>
                  <strong className="text-slate-800">No-Show Policy & 24-Hour Refund:</strong> Every booking displays a real-time estimated arrival window. If you do not arrive at the salon within a 15-minute grace period following your estimated arrival time, your booking is automatically marked as a <strong className="text-slate-900">No-Show</strong>, and your queue spot is released to seat waiting customers.
                  <div className="mt-1 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs sm:text-sm">
                    <strong>No-Show Refund Terms:</strong> To fairly compensate the barber for reserved chair time and schedule disruption, a <strong className="text-amber-950">10% cancellation fee</strong> is deducted, and the remaining <strong className="text-amber-950">90% of your booking payment is refunded to your original payment method within 24 hours</strong>.
                  </div>
                </li>
                <li>
                  <strong className="text-slate-800">Salon-Initiated Cancellations:</strong> If a salon must cancel a session due to unexpected barber unavailability or shop emergencies, you will receive a <strong className="text-slate-900">100% full refund within 24 hours</strong>.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                2. Payment & 24-Hour Refund Terms
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong className="text-slate-800">Secure Processing:</strong> Payments are processed via encrypted channels by Razorpay (supporting UPI, Google Pay, PhonePe, Paytm, Debit/Credit Cards, and Net Banking). SalonCare never stores your raw card credentials.
                </li>
                <li>
                  <strong className="text-slate-800">Transparent Pricing:</strong> The amount charged at checkout covers 100% of the service(s) selected and locks your place in line. Additional services requested in person at the salon are billed separately by the salon.
                </li>
                <li>
                  <strong className="text-slate-800">24-Hour Refund Processing:</strong> All approved refunds — whether from salon cancellations, duplicate payment adjustments, or eligible no-show resolutions (less the 10% barber compensation fee) — are processed promptly and credited back to your original source account <strong className="text-slate-900">within 24 hours</strong>.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-2">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                3. Salon Services & Standards
              </h2>
              <p>
                SalonCare operates the real-time queue synchronization and booking platform. Styling, grooming, hygiene standards, and physical in-salon experiences are conducted by the respective independent salon professionals.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3 pt-2">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <HelpCircle size={18} className="text-emerald-600 shrink-0" />
                4. Questions or Disputes
              </h2>
              <p>
                Have questions about your booking, payment verification, or refund status? Encountered an issue at the salon? Our dedicated support team is here to assist you immediately.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm sm:text-base px-5 py-3 rounded-xl transition shadow-xs cursor-pointer"
                >
                  <Mail size={17} />
                  <span>Contact Us</span>
                </button>
              </div>
            </section>

            <p className="text-slate-400 text-xs sm:text-sm pt-4 border-t border-slate-100">
              These terms may be updated periodically to reflect operational enhancements. Continued use of SalonCare signifies acceptance of the latest terms.
            </p>
          </div>
        </div>
      </div>

      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}
    </div>
  );
}
