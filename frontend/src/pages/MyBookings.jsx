import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { bookingAPI, reviewAPI } from '../services/api';
import { Calendar, Clock, MapPin, Tag, CheckCircle, XCircle, AlertCircle, RefreshCw, Star } from 'lucide-react';

// ── Review Modal Component ───────────────────────────────────────────────────
function ReviewModal({ salonName, onClose, onSubmit }) {
  const [rating,  setRating]  = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) { alert('Please select a rating'); return; }
    setLoading(true);
    await onSubmit(rating, comment);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-body">
      <div className="bg-paper-card border border-ink/10 rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-7">
        <h2 className="text-xl font-display font-semibold text-ink mb-1">Leave a Review</h2>
        <p className="text-ink/50 text-sm mb-5">{salonName}</p>

        {/* Star rating */}
        <div className="flex gap-2 mb-5 justify-center">
          {[1,2,3,4,5].map(star => (
            <button key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={34}
                className={`transition-colors ${
                  star <= (hovered || rating)
                    ? 'fill-ink text-ink'
                    : 'text-ink/15'
                }`}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <p className="text-center text-sm font-semibold text-ink/60 mb-4">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </p>
        )}

        {/* Comment */}
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your experience (optional)…"
          rows={3}
          className="bg-paper-card border border-ink/15 w-full rounded-xl px-4 py-3 text-sm text-ink placeholder:text-ink/35 focus:border-rose/60 focus:outline-none resize-none mb-4"
        />

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-ink/15 text-ink/60 font-semibold text-sm hover:bg-ink/5 transition">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading || rating === 0}
            className="flex-1 py-3 rounded-xl bg-rose hover:bg-rose-dark text-white font-bold text-sm transition disabled:opacity-50">
            {loading ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const navigate = useNavigate();
  // reviewStatuses: { [bookingCode]: 'can_review' | 'already_reviewed' | 'no_completed_booking' }
  const [reviewStatuses, setReviewStatuses] = useState({});
  // reviewModal: { open, salonId, salonName, bookingCode } | null
  const [reviewModal, setReviewModal] = useState(null);

  // Tick every second so the countdown ("~12 min wait") stays live even
  // though the arrival clock-time itself is a fixed server value.
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const response = await bookingAPI.getMyBookings();
      const bookingsList = response.data.data || [];
      setBookings(bookingsList);

      // Fetch review status for each completed booking
      const completedBookings = bookingsList.filter(b => b.status === 'COMPLETED' && b.salonId);
      await Promise.all(completedBookings.map(async (b) => {
        try {
          const res = await reviewAPI.getReviewStatus(b.salonId);
          setReviewStatuses(prev => ({ ...prev, [b.bookingCode]: res.data.data }));
        } catch { /* ignore */ }
      }));
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Arrival time and wait-minutes now come straight from the backend
   * (BookingResponse.estimatedStartTime, populated from the linked
   * QueueEntry — the same chair-aware simulation that powers the salon
   * list and salon details pages). No more re-deriving it from a
   * separately-fetched queue snapshot — that was the fragile path that
   * used to show 0 min no matter how many people were actually waiting.
   */
  const getWaitMinutes = (booking) => {
    if (!booking.estimatedStartTime) return null;
    const ms = new Date(booking.estimatedStartTime).getTime() - currentTime.getTime();
    return Math.max(0, Math.round(ms / 60000));
  };

  const formatArrivalTime = (booking) => {
    if (!booking.estimatedStartTime) return '–';
    return new Date(booking.estimatedStartTime).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '–';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Human-readable labels for cancellation reasons set by the salon
  const CANCEL_REASON_LABELS = {
    SALON_EMERGENCY:  'Salon emergency — unexpected situation required us to stop services',
    RUNNING_TOO_LATE: 'Queue ran too late — we could not accommodate you today',
    OVERBOOKING:      'Overbooking error — too many customers were booked by mistake',
    OTHER:            'Cancelled by the salon',
    // Auto-cancelled by PaymentCleanupScheduler when checkout was started but
    // never completed (popup closed, payment failed silently, etc.)
    PAYMENT_TIMEOUT:  'Payment was not completed in time, so this booking was automatically cancelled. No amount was charged — feel free to book again.',
  };

  const statusConfig = {
    CONFIRMED:       { bg: 'bg-rose/15',  text: 'text-rose',     icon: AlertCircle,  label: 'Confirmed'       },
    IN_PROGRESS:     { bg: 'bg-rose/15',  text: 'text-rose',     icon: Clock,        label: 'In Progress'     },
    COMPLETED:       { bg: 'bg-ink/10',   text: 'text-ink/60',   icon: CheckCircle,  label: 'Completed'       },
    CANCELLED:       { bg: 'bg-ink/10',  text: 'text-ink/60',   icon: XCircle,      label: 'Cancelled'       },
    NO_SHOW:         { bg: 'bg-ink/10',  text: 'text-ink/60',   icon: XCircle,      label: 'No Show'         },
    PENDING_PAYMENT: { bg: 'bg-ink/8',   text: 'text-ink/40',   icon: Clock,        label: 'Pending Payment' },
  };

  const StatusBadge = ({ status }) => {
    const cfg = statusConfig[status] || { bg: 'bg-ink/8', text: 'text-ink/40', icon: AlertCircle, label: status };
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
        <Icon size={13} />
        {cfg.label}
      </span>
    );
  };

  // ── Submit review ────────────────────────────────────────────────────────
  const handleSubmitReview = async (rating, comment) => {
    try {
      await reviewAPI.submitReview(reviewModal.salonId, rating, comment);
      setReviewStatuses(prev => ({ ...prev, [reviewModal.bookingCode]: 'already_reviewed' }));
      setReviewModal(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="bg-paper min-h-screen flex items-center justify-center font-body">
        <div className="text-center">
          <div className="w-12 h-12 border-[3px] border-rose/25 border-t-rose rounded-full animate-spin mx-auto mb-3" />
          <p className="text-ink/50 font-display">Loading bookings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-paper min-h-screen font-body">
      {/* ── Review Modal ── */}
      {reviewModal?.open && (
        <ReviewModal
          salonName={reviewModal.salonName}
          onClose={() => setReviewModal(null)}
          onSubmit={handleSubmitReview}
        />
      )}
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">

        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink mb-6">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="bg-paper-card border border-ink/10 rounded-2xl p-10 sm:p-12 text-center">
            <Calendar size={44} className="mx-auto text-ink/25 mb-3" />
            <p className="text-lg font-display font-semibold text-ink/70 mb-1">No bookings yet</p>
            <p className="text-ink/40 text-sm mb-5">Find a salon and book your slot</p>
            <button
              onClick={() => navigate('/home')}
              className="bg-rose hover:bg-rose-dark text-white px-6 py-3 rounded-xl font-bold transition shadow-md shadow-rose/20"
            >
              Search Salons
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-paper-card border border-ink/10 rounded-2xl overflow-hidden"
              >
                {/* Card header */}
                <div className="px-4 sm:px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-ink text-base sm:text-lg truncate">
                      {booking.salonName || 'Salon'}
                    </p>
                    {booking.salonAddress && (
                      <p className="text-xs text-ink/45 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={12} className="flex-shrink-0" /> {booking.salonAddress}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={booking.status} />
                </div>

                {/* Key details row */}
                <div className="px-4 sm:px-5 pb-4 grid grid-cols-3 gap-2 sm:gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="text-[11px] text-ink/35 mb-0.5">Booking Code</p>
                    <p className="font-mono font-bold text-rose flex items-center gap-1 text-xs sm:text-sm truncate">
                      <Tag size={12} className="flex-shrink-0" />{booking.bookingCode}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-ink/35 mb-0.5">Service</p>
                    <p className="font-semibold text-ink text-xs sm:text-sm truncate">{booking.serviceName}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-ink/35 mb-0.5">Amount</p>
                    <p className="font-mono font-bold text-rose text-xs sm:text-sm">₹{booking.amount}</p>
                  </div>
                </div>

                {/* Booked on */}
                <div className="px-4 sm:px-5 pb-4 text-xs sm:text-sm text-ink/40 flex items-center gap-1">
                  <Calendar size={13} className="flex-shrink-0" />
                  Booked on {formatDate(booking.scheduledTime || booking.createdAt)}
                </div>

                {/* ── CONFIRMED: arrival time strip — ticket motif, same
                     visual family as the booking summary on SalonDetails ── */}
                {booking.status === 'CONFIRMED' && (
                  <div className="border-t-2 border-dashed border-ink/10">
                    <div className="bg-paper-card border border-ink/10 px-4 sm:px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Clock size={20} className="text-rose flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] text-ink/50 font-medium uppercase tracking-wide">Estimated Arrival</p>
                            {getWaitMinutes(booking) === null ? (
                              <p className="text-sm text-ink/40">Loading…</p>
                            ) : (
                              <>
                                <p className="text-xl sm:text-2xl font-mono font-bold text-ink">
                                  {formatArrivalTime(booking)}
                                </p>
                                <p className="text-xs text-ink/45 mt-0.5">
                                  ≈ {getWaitMinutes(booking)} min wait
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          {booking.salonId && (
                            <button
                              onClick={loadBookings}
                              className="flex items-center gap-1 text-xs text-ink/50 font-semibold hover:text-ink/80 transition"
                            >
                              <RefreshCw size={12} /> Refresh
                            </button>
                          )}
                          {booking.salonId && (
                            <button
                              onClick={() => navigate(`/salon/${booking.salonId}`)}
                              className="text-xs text-ink/40 hover:text-ink/70 transition"
                            >
                              View queue →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── IN_PROGRESS strip ── */}
                {booking.status === 'IN_PROGRESS' && (
                  <div className="border-t border-rose/25 bg-rose/10 px-4 sm:px-5 py-3 flex items-center gap-2 text-rose text-sm font-semibold">
                    <Clock size={16} className="animate-pulse flex-shrink-0" />
                    Your service is currently in progress!
                  </div>
                )}

                {/* ── COMPLETED strip ── */}
                {booking.status === 'COMPLETED' && (
                  <div className="border-t border-ink/15 bg-ink/5 px-4 sm:px-5 py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-ink/60 text-xs sm:text-sm font-semibold min-w-0">
                      <CheckCircle size={16} className="flex-shrink-0" />
                      <span className="truncate">Service completed — thank you!</span>
                    </div>
                    {reviewStatuses[booking.bookingCode] === 'can_review' && (
                      <button
                        onClick={() => setReviewModal({
                          open: true,
                          salonId: booking.salonId,
                          salonName: booking.salonName,
                          bookingCode: booking.bookingCode,
                        })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose hover:bg-rose-dark text-white rounded-lg text-xs font-bold transition flex-shrink-0"
                      >
                        <Star size={12} /> Review
                      </button>
                    )}
                    {reviewStatuses[booking.bookingCode] === 'already_reviewed' && (
                      <span className="flex items-center gap-1 text-xs text-ink/50 font-medium flex-shrink-0">
                        <Star size={12} className="fill-ink text-ink" /> Reviewed
                      </span>
                    )}
                  </div>
                )}

                {/* ── CANCELLED / NO_SHOW strip ── */}
                {(booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') && (
                  <div className="border-t border-ink/10 bg-ink/5 px-4 sm:px-5 py-3 flex items-center justify-between text-ink/60 text-xs sm:text-sm font-semibold">
                    <div className="flex items-center gap-2">
                      <XCircle size={16} className="flex-shrink-0" />
                      {booking.status === 'CANCELLED' ? 'Booking cancelled' : 'Marked as no-show'}
                    </div>

                    {/* Reason tooltip — for salon-cancelled and system-cancelled bookings */}
                    {booking.status === 'CANCELLED'
                      && (booking.cancelledBy === 'SALON' || booking.cancelledBy === 'SYSTEM')
                      && booking.cancellationReason && (
                      <div className="relative group flex-shrink-0">
                        {/* Exclamation trigger */}
                        <div className="w-5 h-5 rounded-full bg-ink/15 text-ink/70 flex items-center justify-center cursor-help text-xs font-bold select-none">
                          !
                        </div>

                        {/* Tooltip bubble — appears above on hover */}
                        <div className="absolute bottom-7 right-0 w-56 bg-ink text-paper text-xs rounded-xl px-3 py-2.5 shadow-xl border border-white/10
                                        opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-10">
                          <p className="font-bold mb-1 text-paper/50 uppercase tracking-wide text-[10px]">
                            {booking.cancelledBy === 'SALON' ? 'Cancelled by salon' : 'Automatically cancelled'}
                          </p>
                          <p className="font-body font-normal">{CANCEL_REASON_LABELS[booking.cancellationReason] || booking.cancellationReason}</p>
                          {/* Arrow */}
                          <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-ink rotate-45" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs text-ink/35 mt-8">
          <Link to="/terms" className="hover:text-ink/60 underline underline-offset-2 transition-colors">
            Terms & Conditions
          </Link>
        </p>
      </div>
    </div>
  );
}
