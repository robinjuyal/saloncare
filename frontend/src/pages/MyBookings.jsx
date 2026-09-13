import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { bookingAPI, reviewAPI } from '../services/api';
import {
  Calendar,
  Clock,
  MapPin,
  Tag,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Star,
  Copy,
  Check,
  ChevronDown,
  Scissors,
  ArrowRight,
  Info,
} from 'lucide-react';

// ── Human-readable labels for cancellation reasons ──────────────────────────
const CANCEL_REASON_LABELS = {
  SALON_EMERGENCY: 'Salon emergency — unexpected situation required the shop to pause services.',
  RUNNING_TOO_LATE: 'Queue ran too late — the salon could not accommodate the slot today.',
  OVERBOOKING: 'Overbooking adjustment — corrected by salon management.',
  OTHER: 'Cancelled by the salon.',
  PAYMENT_TIMEOUT: 'Payment session expired before completion. No amount was debited.',
};

// ── Review Modal Component (Green, Black & White Theme) ───────────────────────
function ReviewModal({ salonName, salonId, onClose, onSubmit }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    await onSubmit(rating, comment);
    setLoading(false);
  };

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Exceptional'];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200/90 rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-7 relative text-slate-900">
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-200/80">
            <Star size={24} className="fill-emerald-600 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Rate Your Experience</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 truncate px-4">{salonName}</p>
        </div>

        {/* 5-Star Interactive Rating */}
        <div className="flex gap-2.5 mb-2 justify-center">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = star <= (hovered || rating);
            return (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHovered(star)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(star)}
                className="p-1 rounded-xl hover:bg-slate-50 transition transform hover:scale-110 cursor-pointer"
                title={`${star} star${star > 1 ? 's' : ''}`}
              >
                <Star
                  size={32}
                  className={`transition-colors ${
                    isFilled
                      ? 'fill-emerald-500 text-emerald-500'
                      : 'text-slate-200 hover:text-slate-300'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <p className="text-center text-xs font-semibold text-emerald-700 min-h-[1.25rem] mb-4">
          {ratingLabels[hovered || rating] || 'Tap a star to rate'}
        </p>

        {/* Feedback Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What did you like? (Haircut precision, hygiene, wait time...)"
          rows={3}
          className="bg-slate-50 border border-slate-200 w-full rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition resize-none mb-4"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-sm shadow-emerald-600/20 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Pagination state (default latest 5 bookings)
  const [visibleCount, setVisibleCount] = useState(5);
  const [copiedCode, setCopiedCode] = useState(null);

  // Review states: keyed by salonId to avoid duplicate requests & storage
  // { [salonId]: 'can_review' | 'already_reviewed' | 'no_completed_booking' }
  const [reviewStatuses, setReviewStatuses] = useState({});
  const fetchedSalonsRef = useRef(new Set());
  const [reviewModal, setReviewModal] = useState(null);

  // ── Optimized Data Fetching ────────────────────────────────────────────────
  // Immediately sets bookings and ends loading. Fetches review statuses
  // ONLY for distinct salonIds in the background, preventing network storms.
  const loadBookings = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const response = await bookingAPI.getMyBookings();
      const list = response.data?.data || [];
      setBookings(list);
      setLoading(false);

      // Extract distinct salonIds for completed bookings
      const completedSalonIds = Array.from(
        new Set(
          list
            .filter((b) => b.status === 'COMPLETED' && b.salonId)
            .map((b) => b.salonId)
        )
      );

      // Only query review status for salons we haven't checked yet
      const unqueriedSalonIds = completedSalonIds.filter(
        (id) => !fetchedSalonsRef.current.has(id)
      );

      if (unqueriedSalonIds.length > 0) {
        // Mark as requested immediately
        unqueriedSalonIds.forEach((id) => fetchedSalonsRef.current.add(id));

        // Fetch in background without blocking UI
        Promise.all(
          unqueriedSalonIds.map(async (salonId) => {
            try {
              const res = await reviewAPI.getReviewStatus(salonId);
              return { salonId, status: res.data?.data };
            } catch {
              return { salonId, status: null };
            }
          })
        ).then((results) => {
          setReviewStatuses((prev) => {
            const next = { ...prev };
            results.forEach(({ salonId, status }) => {
              if (status) next[salonId] = status;
            });
            return next;
          });
        });
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
      setLoading(false);
    } finally {
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  // ── Smart clock tick ───────────────────────────────────────────────────────
  // Re-evaluates wait time every 10 seconds ONLY if there is an active booking,
  // preventing wasteful 1000ms CPU re-renders across 30+ cards.
  const hasActiveBooking = useMemo(() => {
    return bookings.some(
      (b) => b.status === 'CONFIRMED' || b.status === 'IN_PROGRESS'
    );
  }, [bookings]);

  useEffect(() => {
    if (!hasActiveBooking) return;
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, [hasActiveBooking]);

  // ── Helpers ────────────────────────────────────────────────────────────────
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

  const copyCode = (code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode((c) => (c === code ? null : c)), 1800);
    }
  };

  // ── Submit Review ──────────────────────────────────────────────────────────
  const handleSubmitReview = async (rating, comment) => {
    if (!reviewModal) return;
    try {
      await reviewAPI.submitReview(reviewModal.salonId, rating, comment);
      setReviewStatuses((prev) => ({
        ...prev,
        [reviewModal.salonId]: 'already_reviewed',
      }));
      setReviewModal(null);
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to submit review');
    }
  };

  // ── Sorted Bookings (Latest first) ─────────────────────────────────────────
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.scheduledTime || 0).getTime();
      const timeB = new Date(b.createdAt || b.scheduledTime || 0).getTime();
      return timeB - timeA;
    });
  }, [bookings]);

  // ── Status Pill Badge Component ────────────────────────────────────────────
  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-body text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Confirmed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-body text-xs font-bold bg-emerald-600 text-white shadow-2xs">
            <Scissors size={11} className="animate-bounce" />
            In Chair
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-body text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
            <CheckCircle2 size={11} className="text-emerald-600" />
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-body text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
            <XCircle size={11} />
            Cancelled
          </span>
        );
      case 'NO_SHOW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-body text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle size={11} />
            No Show
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-body text-xs font-semibold bg-slate-100 text-slate-500">
            {status}
          </span>
        );
    }
  };

  // ── Loading Skeleton State ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-slate-50/50 min-h-screen font-body py-6 sm:py-8">
        <div className="max-w-2xl mx-auto px-4">
          <div className="h-8 w-44 bg-slate-200 rounded-lg animate-pulse mb-6" />
          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-9 w-20 bg-slate-200 rounded-full animate-pulse" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <div className="h-5 w-40 bg-slate-200 rounded mb-3 animate-pulse" />
                <div className="h-4 w-60 bg-slate-100 rounded mb-4 animate-pulse" />
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-10 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded animate-pulse" />
                  <div className="h-10 bg-slate-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50/60 min-h-screen font-body text-slate-900 pb-16">
      {/* ── Review Modal ── */}
      {reviewModal?.open && (
        <ReviewModal
          salonName={reviewModal.salonName}
          salonId={reviewModal.salonId}
          onClose={() => setReviewModal(null)}
          onSubmit={handleSubmitReview}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-5 sm:py-7">
        {/* ── Page Header ── */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display font-semibold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              My Bookings
            </h1>
          </div>

          <button
            type="button"
            onClick={() => loadBookings(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-body text-xs font-semibold shadow-2xs transition cursor-pointer"
            title="Refresh bookings"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
            <span className="hidden sm:inline">{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>

        {/* ── Bookings List (Latest 5 default with Show more) ── */}
        {sortedBookings.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center shadow-2xs">
            <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center mx-auto mb-3 border border-slate-100">
              <Calendar size={24} />
            </div>
            <h3 className="font-display font-semibold text-base sm:text-lg text-slate-900 mb-1">
              No bookings yet
            </h3>
            <p className="font-body text-xs sm:text-sm text-slate-500 mb-5 max-w-sm mx-auto">
              Explore top rated neighbourhood salons, check live wait times, and skip the line.
            </p>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="inline-flex items-center gap-2 bg-black hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-body font-semibold text-xs sm:text-sm transition shadow-2xs cursor-pointer"
            >
              <span>Explore Salons</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {sortedBookings.slice(0, visibleCount).map((booking) => {
              const waitMin = getWaitMinutes(booking);
              const salonReviewStatus = reviewStatuses[booking.salonId];

              return (
                <div
                  key={booking.id || booking.bookingCode}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:border-slate-300 transition-colors group"
                >
                  {/* Card Header: Salon Name & Status Pill */}
                  <div className="p-4 sm:p-5 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-display font-semibold text-base sm:text-lg text-slate-900 tracking-tight truncate">
                            {booking.salonName || 'Salon'}
                          </h3>
                          <span className="shrink-0 inline-flex items-center text-emerald-700 text-[10px] font-semibold bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                            Verified
                          </span>
                        </div>

                        {booking.salonAddress && (
                          <p className="font-body text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={12} className="shrink-0 text-slate-400" />
                            <span className="truncate">{booking.salonAddress}</span>
                          </p>
                        )}
                      </div>

                      <div className="shrink-0">
                        <StatusBadge status={booking.status} />
                      </div>
                    </div>

                    {/* Service & Token Strip */}
                    <div className="grid grid-cols-3 gap-2 mt-3.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs">
                      {/* Token Code */}
                      <div className="min-w-0">
                        <p className="font-body text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          Token Code
                        </p>
                        <button
                          type="button"
                          onClick={() => copyCode(booking.bookingCode)}
                          className="flex items-center gap-1 font-mono font-bold text-emerald-700 hover:text-emerald-800 text-xs sm:text-sm mt-0.5 cursor-pointer truncate"
                          title="Click to copy token code"
                        >
                          <Tag size={11} className="shrink-0" />
                          <span className="truncate">{booking.bookingCode}</span>
                          {copiedCode === booking.bookingCode ? (
                            <Check size={11} className="text-emerald-600 shrink-0" />
                          ) : (
                            <Copy size={10} className="text-slate-400 shrink-0" />
                          )}
                        </button>
                      </div>

                      {/* Services */}
                      <div className="min-w-0">
                        <p className="font-body text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          Services
                        </p>
                        <p className="font-body font-medium text-slate-800 text-xs sm:text-sm mt-0.5 truncate" title={booking.serviceName}>
                          {booking.serviceName || 'Standard Service'}
                        </p>
                      </div>

                      {/* Price / Paid */}
                      <div className="min-w-0 text-right">
                        <p className="font-body text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          Amount
                        </p>
                        <p className="font-mono font-bold text-slate-900 text-xs sm:text-sm mt-0.5">
                          ₹{booking.amount}
                        </p>
                      </div>
                    </div>

                    {/* Booked Timestamp */}
                    <div className="flex items-center justify-between font-body text-[11px] text-slate-400 mt-2.5 px-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-400" />
                        Booked on {formatDate(booking.scheduledTime || booking.createdAt)}
                      </span>
                      {booking.serviceDuration && (
                        <span className="font-medium text-slate-500">
                          ⏱ {booking.serviceDuration} min duration
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Dynamic Footer Strip per Status ── */}

                  {/* 1. CONFIRMED STRIP */}
                  {booking.status === 'CONFIRMED' && (
                    <div className="border-t border-emerald-100 bg-emerald-50/50 p-3.5 sm:px-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Clock size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-body text-[10px] uppercase font-semibold tracking-wider text-emerald-800">
                            Estimated Arrival
                          </p>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-slate-900 text-sm sm:text-base">
                              {formatArrivalTime(booking)}
                            </span>
                            <span className="font-body text-xs font-semibold text-emerald-700">
                              (≈ {waitMin ?? 0}m wait)
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/salon/${booking.salonId}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 font-body font-semibold text-xs transition shadow-2xs shrink-0 cursor-pointer"
                      >
                        <span>Queue Floor</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}

                  {/* 2. IN PROGRESS STRIP */}
                  {booking.status === 'IN_PROGRESS' && (
                    <div className="border-t border-emerald-200 bg-emerald-600 text-white p-3 sm:px-5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-body text-xs sm:text-sm font-semibold">
                        <Scissors size={15} className="animate-bounce" />
                        <span>You are currently in the chair with your stylist!</span>
                      </div>
                      {booking.salonId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/salon/${booking.salonId}`)}
                          className="font-body text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer"
                        >
                          Salon details
                        </button>
                      )}
                    </div>
                  )}

                  {/* 3. COMPLETED STRIP */}
                  {booking.status === 'COMPLETED' && (
                    <div className="border-t border-slate-100 bg-slate-50/70 p-3 sm:px-5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 font-body text-xs text-slate-600 font-medium">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>Service completed</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {salonReviewStatus === 'can_review' && (
                          <button
                            type="button"
                            onClick={() =>
                              setReviewModal({
                                open: true,
                                salonId: booking.salonId,
                                salonName: booking.salonName,
                                bookingCode: booking.bookingCode,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-black hover:bg-slate-800 text-white rounded-xl font-body text-xs font-semibold transition shadow-2xs cursor-pointer"
                          >
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            <span>Rate Salon</span>
                          </button>
                        )}

                        {salonReviewStatus === 'already_reviewed' && (
                          <span className="inline-flex items-center gap-1 font-body text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-1 rounded-lg">
                            <Star size={11} className="fill-emerald-600 text-emerald-600" />
                            Reviewed
                          </span>
                        )}

                        {booking.salonId && (
                          <button
                            type="button"
                            onClick={() => navigate(`/salon/${booking.salonId}`)}
                            className="font-body text-xs text-slate-500 hover:text-slate-900 font-medium px-1.5 py-1 transition cursor-pointer"
                          >
                            Book again →
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 4. CANCELLED / NO SHOW STRIP */}
                  {(booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') && (
                    <div className="border-t border-slate-100 bg-slate-50/60 p-3 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
                          <div className="font-body text-xs text-slate-600">
                            <span className="font-semibold text-slate-700">
                              {booking.status === 'CANCELLED' ? 'Booking cancelled' : 'Marked as no-show'}
                            </span>
                            {booking.cancellationReason && (
                              <p className="text-slate-500 mt-0.5">
                                {CANCEL_REASON_LABELS[booking.cancellationReason] || booking.cancellationReason}
                              </p>
                            )}
                          </div>
                        </div>

                        {booking.salonId && (
                          <button
                            type="button"
                            onClick={() => navigate(`/salon/${booking.salonId}`)}
                            className="font-body text-xs text-emerald-600 hover:text-emerald-700 font-semibold shrink-0 cursor-pointer"
                          >
                            Rebook →
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── Client-Side Pagination / Show more ── */}
            {sortedBookings.length > visibleCount && (
              <div className="text-center pt-3 pb-1">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 5)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-body text-xs sm:text-sm font-semibold shadow-2xs transition cursor-pointer"
                >
                  <ChevronDown size={14} />
                  <span>Show more</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Terms & Help Footer ── */}
        <div className="text-center text-xs text-slate-400 mt-10 space-y-1">
          <p>Need help with a booking? Contact support via the profile menu.</p>
          <p>
            <Link
              to="/terms"
              className="text-slate-500 hover:text-slate-800 underline underline-offset-2 transition-colors"
            >
              Terms of Service & Queue Fairness Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
