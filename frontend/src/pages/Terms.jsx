import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Scissors } from 'lucide-react';

// Public page — reachable whether logged in or not (linked from Signup,
// and from MyBookings for people who are already logged in). Kept as a
// standalone route rather than nested under /home or /dashboard so it
// works the same for a customer, a salon owner, or someone who hasn't
// made an account yet.
export default function Terms() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="bg-paper min-h-screen font-body">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* Back — goes to the logged-in home if there is one, otherwise
            just backs up in history (e.g. back to Signup). */}
        <button
          onClick={() => user ? navigate('/') : navigate(-1)}
          className="flex items-center gap-1.5 text-ink/50 hover:text-ink text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-paper-card border border-ink/10 rounded-2xl sm:rounded-3xl p-6 sm:p-10">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-rose rounded-xl flex items-center justify-center flex-shrink-0 rotate-3 shadow-sm shadow-rose/30">
              <Scissors className="text-white -rotate-3" size={18} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink">
              Terms & Conditions
            </h1>
          </div>
          <p className="text-ink/40 text-xs mb-8 ml-[52px]">Last updated: September 2026</p>

          <div className="space-y-8 text-sm text-ink/75 leading-relaxed">

            <p>
              These terms cover booking a place in a salon's queue through SalonQueue.
              By creating an account or completing a booking, you agree to the rules below.
            </p>

            <section>
              <h2 className="font-display font-semibold text-ink text-base mb-2.5">
                1. Booking & Cancellation
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  A booking is confirmed — and your place in the salon's queue is reserved — only
                  once payment is completed. An unpaid or abandoned checkout does not hold your spot.
                </li>
                <li>
                  <strong className="text-ink">No-shows:</strong> every booking has an estimated
                  arrival time. If you don't check in at the salon within the no-show window after
                  that time (typically 15 minutes, set by the salon), your booking is automatically
                  marked as a <strong className="text-ink">No-Show</strong>, your place in the queue
                  is released, and the payment is treated as forfeited under Section 2.
                </li>
                <li>
                  Self-service cancellation isn't available yet — if your plans change, contact the
                  salon directly or reach SalonQueue support (Section 4) as early as you can, ideally
                  before your estimated turn.
                </li>
                <li>
                  A salon can cancel a booking on its end (for example, if a barber becomes
                  unavailable). You'll see this reflected in <em>My Bookings</em> along with the
                  reason, and any payment already made is reviewed for a refund per Section 2.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display font-semibold text-ink text-base mb-2.5">
                2. Payment Terms
              </h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Payments are processed securely through Razorpay (UPI, cards, net banking). SalonQueue
                  does not see or store your card or bank details.
                </li>
                <li>
                  <strong className="text-ink">The amount charged is the full price</strong> of the
                  service(s) you selected — not a deposit or partial advance. It covers reserving your
                  queue position and the specific service(s) booked, at the price shown at checkout.
                </li>
                <li>
                  It does not cover any additional services, products, or add-ons requested in person
                  at the salon beyond what was booked — those are settled directly with the salon.
                </li>
                <li>
                  Refunds are not automatic and are reviewed case by case — for example, a salon-initiated
                  cancellation or a payment/technical error. Eligible refunds are issued to your original
                  payment method, typically within 5–7 business days, once approved.
                </li>
                <li>
                  A No-Show under Section 1 forfeits the payment, since the queue position was held and
                  then released without the service being provided.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display font-semibold text-ink text-base mb-2.5">
                3. Nature of the Service
              </h2>
              <p>
                SalonQueue books your place in line and estimates your wait — it doesn't perform or
                supervise the salon service itself. Service quality, timing on the day, and anything
                that happens at the salon are between you and the salon.
              </p>
            </section>

            <section>
              <h2 className="font-display font-semibold text-ink text-base mb-2.5">
                4. Questions or Disputes
              </h2>
              <p>
                For anything about a specific booking or payment — a refund request, a no-show you
                think was marked in error, or anything else — reach out and we'll help sort it out.
              </p>
            </section>

            <p className="text-ink/40 text-xs pt-2 border-t border-ink/10">
              These terms may be updated from time to time; continued use of SalonQueue after a
              change means you accept the updated terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
