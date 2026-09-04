import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salonAPI, serviceAPI, queueAPI, paymentAPI, reviewAPI } from '../services/api';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import {
  Clock, Star, Users, ArrowLeft,
  Bell, CheckCircle, AlertCircle, Loader, CreditCard, Shield,
  Scissors, User, Palette, Sparkles, Hand, Wind, MoreHorizontal, LayoutGrid, Check
} from 'lucide-react';

// Icon + label per service category — matches Service.ServiceCategory enum
// on the backend exactly. New categories added on the backend fall back to
// the OTHER treatment automatically via getCategoryMeta().
const CATEGORY_META = {
  HAIRCUT:        { label: 'Haircut',     icon: Scissors },
  BEARD:          { label: 'Beard',       icon: User },
  HAIR_AND_BEARD: { label: 'Hair+Beard',  icon: Scissors },
  HAIR_COLOR:     { label: 'Color',       icon: Palette },
  FACIAL:         { label: 'Facial',      icon: Sparkles },
  MASSAGE:        { label: 'Massage',     icon: Hand },
  STYLING:        { label: 'Styling',     icon: Wind },
  OTHER:          { label: 'Other',       icon: MoreHorizontal },
};
const getCategoryMeta = (category) => CATEGORY_META[category] || CATEGORY_META.OTHER;

const PAY_STATE = {
  IDLE:       'IDLE',
  CREATING:   'CREATING',
  PROCESSING: 'PROCESSING',
  VERIFYING:  'VERIFYING',
  SUCCESS:    'SUCCESS',
  FAILED:     'FAILED',
};

export default function SalonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [salon, setSalon]                     = useState(null);
  const [services, setServices]               = useState([]);
  const [queue, setQueue]                     = useState([]);
  const [selectedServices, setSelectedServices] = useState([]); // array of service objects — was a single selectedService
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [loading, setLoading]                 = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [currentTime, setCurrentTime]         = useState(new Date());
  const [payState, setPayState]               = useState(PAY_STATE.IDLE);
  const [payError, setPayError]               = useState('');
  const [successBooking, setSuccessBooking]   = useState(null);

  // ── Review state ──────────────────────────────────────────────────────────
  const [reviews, setReviews]               = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  // Tick every second for live wait time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadSalonDetails();
    loadServices();
    loadQueue();
    loadReviews();

    const socket = new SockJS(import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        stompClient.subscribe(`/topic/queue/${id}`, (message) => {
          try { setQueue(JSON.parse(message.body)); } catch {}
        });
      },
    });
    stompClient.activate();

    // Safety net: STOMP subscriptions only push *future* broadcasts, they
    // don't replay current state on subscribe — so if the very first REST
    // fetch above ever misses (slow network, brief backend hiccup), the
    // local queue array could silently drift from reality with nothing to
    // correct it until the next queue change happens to broadcast. A
    // periodic reconciliation fetch means it self-heals within 15s either way.
    // Also re-fetches salon details on the same tick, since estimatedWaitMinutes
    // and currentQueueSize otherwise only load once at page open and would
    // go stale while someone just sits on this page.
    const reconcileInterval = setInterval(() => {
      loadQueue();
      loadSalonDetails();
    }, 15000);

    return () => {
      if (stompClient?.active) stompClient.deactivate();
      clearInterval(reconcileInterval);
    };
  }, [id]);

  const loadSalonDetails = async () => {
    try {
      const res = await salonAPI.getById(id);
      setSalon(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadServices = async () => {
    try {
      const res = await serviceAPI.getBySalon(id);
      const list = res.data.data || [];
      setServices(list);
      // Auto-select the first service (whatever the salon's catalog lists
      // first — for most salons that's the most commonly booked one, e.g.
      // Men's Haircut) so the booking summary / arrival estimate is visible
      // immediately instead of requiring a tap before showing anything useful.
      if (list.length > 0) {
        setSelectedServices([list[0]]);
      }
    } catch (e) { console.error(e); }
    finally { setServicesLoading(false); }
  };

  const loadQueue = async () => {
    try {
      const res = await queueAPI.getQueue(id);
      setQueue(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  // Load reviews for this salon
  const loadReviews = async () => {
    try {
      const res = await reviewAPI.getSalonReviews(id);
      setReviews(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setReviewsLoading(false); }
  };

  // Mirrors the backend's chair simulation exactly: track one "frees up in
  // N minutes" clock per active chair, and always hand the next person in
  // line to whichever clock is smaller. With totalChairs=1 this collapses
  // back to the old single-line sum, so nothing changes for single-chair
  // salons — it's purely additive.
  const getTotalWaitMinutes = useCallback(() => {
    const totalChairs = Math.min(Math.max(salon?.totalChairs || 1, 1), 2);
    const chairFreeInMinutes = new Array(totalChairs).fill(0);

    for (const entry of queue) {
      if (entry.status === 'IN_PROGRESS') {
        let elapsed = 0;
        if (entry.actualStartTime) {
          elapsed = Math.floor((currentTime - new Date(entry.actualStartTime)) / 60000);
        }
        const remaining = Math.max(0, (entry.estimatedDurationMinutes || 0) - elapsed);
        const chairIdx = Math.min(Math.max((entry.chairNumber || 1), 1), totalChairs) - 1;
        chairFreeInMinutes[chairIdx] = Math.max(chairFreeInMinutes[chairIdx], remaining);
      } else if (entry.status === 'WAITING') {
        const idx = chairFreeInMinutes.indexOf(Math.min(...chairFreeInMinutes));
        chairFreeInMinutes[idx] += entry.estimatedDurationMinutes || 0;
      }
    }

    return Math.min(...chairFreeInMinutes);
  }, [queue, currentTime, salon]);

  // How many chairs are free right now — used to explain *why* the wait is
  // what it is (Maister: unexplained waits feel longer than explained ones).
  // Inferred from waitMinutes rather than counting IN_PROGRESS entries in
  // the locally-fetched queue array directly: waitMinutes already comes
  // from the backend's own authoritative simulation, so "0 wait" reliably
  // means a chair is free right now without needing a second, separately
  // fetched data source to agree with it.
  const getChairStatus = useCallback(() => {
    const totalChairs = Math.min(Math.max(salon?.totalChairs || 1, 1), 2);
    const currentWait = salon?.estimatedWaitMinutes ?? getTotalWaitMinutes();
    const chairAvailableNow = currentWait === 0;
    return { totalChairs, chairAvailableNow };
  }, [salon, getTotalWaitMinutes]);

  const formatTime = (ms) =>
    new Date(ms).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) { resolve(true); return; }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload  = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  // Tap a service card to add/remove it from the selection — this is what
  // makes multi-service booking possible (Haircut + Beard + Color in one
  // booking) instead of every combination needing its own priced service
  // in the salon's catalog.
  const toggleService = (service) => {
    setSelectedServices(prev => {
      const isSelected = prev.some(s => s.id === service.id);
      if (isSelected) return prev.filter(s => s.id !== service.id);
      return [...prev, service];
    });
    setPayState(PAY_STATE.IDLE);
    setPayError('');
  };

  const handlePayNow = async () => {
    if (selectedServices.length === 0) return;
    setPayError('');
    setPayState(PAY_STATE.CREATING);

    const sdkLoaded = await loadRazorpayScript();
    if (!sdkLoaded) {
      setPayError('Could not load payment gateway. Please check your internet connection.');
      setPayState(PAY_STATE.FAILED);
      return;
    }

    let orderData;
    try {
      const res = await paymentAPI.createOrder({
        salonId: parseInt(id),
        serviceIds: selectedServices.map(s => s.id),
      });
      orderData = res.data.data;
    } catch (e) {
      setPayError(e.response?.data?.message || 'Could not initiate payment. Please try again.');
      setPayState(PAY_STATE.FAILED);
      return;
    }

    setPayState(PAY_STATE.PROCESSING);
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const options = {
      key:         orderData.razorpayKeyId,
      amount:      orderData.amountPaise,
      currency:    orderData.currency,
      name:        orderData.salonName,
      description: orderData.serviceName,
      order_id:    orderData.razorpayOrderId,
      prefill: { name: user.name || '', email: user.email || '', contact: user.phone || '' },
      theme: { color: '#E8425F' },
      modal: {
        ondismiss: () => {
          setPayState(PAY_STATE.FAILED);
          setPayError('Payment was cancelled. Your booking has not been confirmed.');
        },
      },
      handler: async (response) => {
        setPayState(PAY_STATE.VERIFYING);
        try {
          await paymentAPI.verify({
            razorpayOrderId:   response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          setSuccessBooking({
            bookingCode: orderData.bookingCode,
            salonName:   orderData.salonName,
            serviceName: orderData.serviceName,
            amount:      orderData.amount,
          });
          setPayState(PAY_STATE.SUCCESS);
        } catch (e) {
          setPayError("Payment received but confirmation is pending. Check 'My Bookings' in a moment.");
          setPayState(PAY_STATE.FAILED);
        }
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', (response) => {
      setPayState(PAY_STATE.FAILED);
      setPayError(`Payment failed: ${response.error.description}`);
    });
    razorpay.open();
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (payState === PAY_STATE.SUCCESS && successBooking) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center p-4 font-body">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-sage rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-sage/30">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-display font-semibold text-paper mb-1">Booking Confirmed</h1>
            <p className="text-paper/50 text-sm">Your slot is secured — here's your ticket</p>
          </div>

          {/* ── Ticket stub ── perforated-token confirmation, the app's
              digital version of the paper number every salon hands out */}
          <div className="glass rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-7 text-center">
              <p className="text-xs font-bold text-paper/40 uppercase tracking-widest mb-1">Booking Code</p>
              <p className="text-4xl font-mono font-bold text-rose tracking-wider">{successBooking.bookingCode}</p>
            </div>

            <div className="flex items-center px-6">
              <div className="flex-1 border-t-2 border-dashed border-white/15 text-white/25 ticket-notch" />
            </div>

            <div className="p-6 sm:p-7 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-paper/50">Salon</span>
                <span className="font-semibold text-paper">{successBooking.salonName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-paper/50">Service</span>
                <span className="font-semibold text-paper">{successBooking.serviceName}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-dashed border-white/10">
                <span className="text-paper/50">Amount Paid</span>
                <span className="font-bold text-sage-bright text-lg font-mono">₹{successBooking.amount}</span>
              </div>
            </div>
          </div>

          <button onClick={() => navigate('/my-bookings')}
            className="w-full bg-rose hover:bg-rose-dark text-white py-4 rounded-2xl font-bold text-base mt-5 transition-all transform active:scale-[0.98] shadow-lg shadow-rose/30">
            View My Bookings
          </button>
        </div>
      </div>
    );
  }

  // ── Loading / not found ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center font-body">
        <div className="text-center">
          <div className="w-12 h-12 border-[3px] border-rose/25 border-t-rose rounded-full animate-spin mx-auto mb-3" />
          <p className="text-paper/50 font-display">Loading salon details…</p>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="ambient-bg min-h-screen flex items-center justify-center font-body">
        <p className="text-2xl font-display font-semibold text-paper/50">Salon not found</p>
      </div>
    );
  }

  // Backend-computed value first (same number CustomerHome and the stats
  // strip use, proven correct) — local simulation only as a fallback for
  // the brief window before `salon` has loaded.
  const waitMinutes        = salon?.estimatedWaitMinutes ?? getTotalWaitMinutes();
  const estimatedArrivalMs = currentTime.getTime() + waitMinutes * 60000;
  const chairStatus        = getChairStatus();
  // Prefer the backend's own queue count over counting the locally-fetched
  // queue array — keeps this in lockstep with the stats strip above.
  const yourPositionInLine = (salon?.currentQueueSize ?? queue.filter(e => e.status === 'WAITING').length) + 1;
  const isPaymentInProgress = [PAY_STATE.CREATING, PAY_STATE.PROCESSING, PAY_STATE.VERIFYING].includes(payState);
  // Summed across every selected service — lets a customer combine
  // services (Haircut + Beard + Color) into one booking instead of the
  // salon needing a separate priced "combo" entry for every combination.
  const totalPrice    = selectedServices.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0);

  // Only show category chips for categories this salon actually has
  // services in — no point offering an empty "Massage" filter.
  const presentCategories = [...new Set(services.map(s => s.category))];
  const filteredServices = selectedCategory === 'ALL'
    ? services
    : services.filter(s => s.category === selectedCategory);

  return (
    <div className="ambient-bg min-h-screen font-body">

      <div className="max-w-6xl mx-auto px-4 pt-6 pb-8 sm:pt-8">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-paper/60 hover:text-paper font-semibold mb-6 transition text-sm">
          <ArrowLeft size={18} /> Back to Search
        </button>

        {/* Salon header — glass panel instead of a solid dark band, since
            the whole page is dark now there's no need for a separate block.
            Address/phone/email removed per request — the customer already
            saw the address on the salon list before tapping in, and this
            keeps the header short so Select a Service starts sooner. */}
        <div className="glass rounded-2xl sm:rounded-3xl p-5 sm:p-7 mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-semibold text-paper mb-2">{salon.name}</h1>
              <div className="flex items-center gap-2 text-paper/60 text-sm">
                <Clock size={16} className="text-rose flex-shrink-0" /><span>{salon.openingTime} - {salon.closingTime}</span>
              </div>
            </div>
            <div className="flex sm:flex-col items-center sm:items-end gap-2">
              <div className="flex items-center gap-1.5 text-brass">
                <Star size={22} fill="currentColor" />
                <span className="text-2xl sm:text-3xl font-display font-semibold text-paper">{Number(salon.rating || 0).toFixed(1)}</span>
              </div>
              <div className="text-sm text-paper/50">{salon.totalReviews || 0} reviews</div>
            </div>
          </div>

          {/* Stats strip — now inline inside the same glass panel instead of
              a separate card, one glass surface instead of stacking two */}
          <div className="grid grid-cols-3 divide-x divide-white/10 mt-5 pt-5 border-t border-white/10">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-display font-semibold text-rose">{salon.currentQueueSize ?? queue.length}</div>
              <div className="text-[11px] sm:text-xs text-paper/45 font-medium mt-0.5">In Queue</div>
            </div>
            <div className="text-center">
              {/* Gentle pulse — Tailwind's built-in animate-pulse is a slow
                  (2s), smooth opacity breathe, not a hard blink, so it
                  draws the eye to the number that matters most without
                  being obnoxious about it. */}
              <div className="text-xl sm:text-2xl font-display font-semibold text-brass animate-pulse">{waitMinutes} min</div>
              <div className="text-[11px] sm:text-xs text-paper/45 font-medium mt-0.5">Total Wait</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-display font-semibold text-sage-bright">{salon.totalChairs || 1}</div>
              <div className="text-[11px] sm:text-xs text-paper/45 font-medium mt-0.5">Chair{(salon.totalChairs || 1) > 1 ? 's' : ''}</div>
            </div>
          </div>
        </div>

        {/* Services + Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 mb-8">

          {/* Services + booking */}
          <div className="lg:col-span-2 glass rounded-2xl p-5 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-display font-semibold text-paper mb-3 sm:mb-4">Select a Service</h2>

            {servicesLoading ? (
              <div className="text-center py-12 text-paper/40">
                <div className="w-8 h-8 border-[3px] border-rose/25 border-t-rose rounded-full animate-spin mx-auto mb-2" />
                Loading services…
              </div>
            ) : services.length === 0 ? (
              <div className="text-center py-12 text-paper/40">
                <AlertCircle size={36} className="mx-auto mb-2 opacity-40" />
                <p>No services available</p>
              </div>
            ) : (
              <div className="mb-6">

                {/* Category picker — circular icons, scrolls sideways.
                    Only rendered when there's more than one category to
                    actually filter between. Shrunk (was w-12 h-12 circles)
                    to keep this whole section compact so more services are
                    visible without scrolling. */}
                {presentCategories.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 mb-3 -mx-1 px-1 snap-x snap-mandatory hide-scrollbar">
                    {['ALL', ...presentCategories].map((cat) => {
                      const meta = cat === 'ALL' ? { label: 'All', icon: LayoutGrid } : getCategoryMeta(cat);
                      const Icon = meta.icon;
                      const active = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className="flex flex-col items-center gap-1 flex-shrink-0 snap-start w-12"
                        >
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                            active ? 'bg-rose text-white shadow-md shadow-rose/25 scale-105' : 'bg-white/8 text-paper/50'
                          }`}>
                            <Icon size={15} />
                          </div>
                          <span className={`text-[9px] font-semibold text-center leading-tight ${active ? 'text-rose' : 'text-paper/50'}`}>
                            {meta.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Service cards — a grid that flows into columns and
                    scrolls horizontally (2 rows tall), so even a salon
                    with 15+ services stays inside one contained,
                    swipeable strip instead of a long vertical list.
                    Tightened padding/icon size (was p-3 + w-8 h-8 icon)
                    to shrink each card's height, which is the real lever
                    for fitting more of the grid on screen at once. */}
                <div
                  className="grid grid-flow-col grid-rows-2 auto-cols-max gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory hide-scrollbar"
                >
                  {filteredServices.map((service) => {
                    const meta = getCategoryMeta(service.category);
                    const Icon = meta.icon;
                    const active = selectedServices.some(s => s.id === service.id);
                    return (
                      <button key={service.id}
                        onClick={() => toggleService(service)}
                        disabled={isPaymentInProgress}
                        className={`relative flex flex-col items-start text-left p-2.5 rounded-xl transition-all snap-start w-[112px] sm:w-[136px] ${
                          active ? 'glass-lite-active' : 'glass-lite hover:bg-white/10'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {active && (
                          <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-rose flex items-center justify-center">
                            <Check size={9} className="text-white" strokeWidth={3.5} />
                          </div>
                        )}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1.5 ${
                          active ? 'bg-rose text-white' : 'bg-white/10 text-paper/60'
                        }`}>
                          <Icon size={12} />
                        </div>
                        <div className="font-display font-semibold text-paper text-[11px] leading-snug mb-1 line-clamp-2">
                          {service.name}
                        </div>
                        <div className="text-[9px] text-paper/40 mb-1">{service.durationMinutes} min</div>
                        <div className="mt-auto text-sm font-mono font-bold text-rose">₹{service.price}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Swipe affordance — only shown when there's actually more
                    than fits in view, so it doesn't clutter a salon with
                    just 2-3 services. */}
                {filteredServices.length > 4 && (
                  <p className="text-[11px] text-paper/35 text-center mt-1">← swipe for more →</p>
                )}

                {/* Persistent selection feedback — tap a couple more
                    service cards and this updates instantly, without
                    needing to scroll down to the full booking summary to
                    see what's added up so far. Only shown once there's
                    more than one service selected — with just one, the
                    price is already right there on the card itself. */}
                {selectedServices.length > 1 && (
                  <div className="flex items-center justify-between glass-lite rounded-xl px-3.5 py-2.5 mt-3">
                    <span className="text-xs text-paper/70">
                      <span className="font-bold text-paper">{selectedServices.length} services</span> selected
                    </span>
                    <span className="text-sm font-mono font-bold text-rose">₹{totalPrice} · {totalDuration} min</span>
                  </div>
                )}
              </div>
            )}

            {selectedServices.length > 0 && (
              <div className="glass-strong rounded-2xl overflow-hidden">
                <div className="p-5 sm:p-6">
                  <h3 className="text-base font-display font-semibold text-paper mb-4">
                    Booking Summary
                    {selectedServices.length > 1 && (
                      <span className="text-paper/40 font-body font-normal text-xs ml-1.5">({selectedServices.length} services)</span>
                    )}
                  </h3>

                  {/* One row per selected service — always itemized here,
                      never truncated or combined, since this is the moment
                      someone's deciding to pay and should see exactly
                      what's included. (My Bookings, later, is the opposite
                      case — a compact joined name is right there, since
                      it's just one row in a list of bookings.) */}
                  <div className="space-y-2 text-sm mb-3">
                    {selectedServices.map(s => (
                      <div key={s.id} className="flex justify-between items-center gap-3">
                        <span className="text-paper/70 truncate">{s.name}</span>
                        <span className="font-mono font-semibold text-paper flex-shrink-0">₹{s.price}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-3 space-y-2">
                    <div className="flex justify-between"><span className="text-paper/50">Total Duration</span><span className="font-semibold text-paper">{totalDuration} min</span></div>
                    <div className="flex justify-between items-center"><span className="text-paper/50">Total Price</span><span className="font-mono font-bold text-brass text-base">₹{totalPrice}</span></div>
                  </div>
                </div>

                {/* Perforated tear line — separates the "order" half from
                    the "ticket" half, like a real receipt-and-stub. */}
                <div className="flex items-center px-6">
                  <div className="flex-1 border-t-2 border-dashed border-white/15 text-white/25 ticket-notch" />
                </div>

                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Bell size={16} className="text-rose" />
                    <span className="font-display font-semibold text-paper text-sm">Estimated Arrival Time</span>
                  </div>
                  <div className="glass rounded-xl p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-paper/65 text-sm">Your turn at:</span>
                      <span className="text-2xl font-mono font-bold text-rose">{formatTime(estimatedArrivalMs)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-paper/65">Wait time:</span>
                      <span className="font-bold text-paper font-mono">~{waitMinutes} minutes</span>
                    </div>

                    {/* Explained + fair: show exactly where in line this
                        booking lands and why the wait is what it is —
                        people tolerate a known, justified wait far better
                        than an unexplained one. */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-paper/65">Your place in line:</span>
                      <span className="font-bold text-paper font-mono">#{yourPositionInLine}</span>
                    </div>
                    <div className="text-xs text-paper/80 bg-white/10 rounded-lg px-3 py-2 leading-relaxed">
                      {chairStatus.chairAvailableNow
                        ? `A chair is free right now — you may start sooner than the estimate.`
                        : `All ${chairStatus.totalChairs} chair${chairStatus.totalChairs > 1 ? 's are' : ' is'} currently busy — this estimate updates live as customers finish.`}
                    </div>

                    {/* Same-hue text on same-hue translucent background reads
                        as "dull" against a busy backdrop — text and its own
                        backing need real contrast, not just different
                        opacities of one color. Solid-ish amber chip +
                        brass-bright text (not the muted default brass) is
                        the fix, same pattern as sage-bright elsewhere. */}
                    <div className="bg-brass/30 border border-brass/50 rounded-lg px-3 py-2.5">
                      <p className="text-xs text-brass-bright font-semibold leading-relaxed">
                        Please arrive 10-15 min before {formatTime(estimatedArrivalMs)} to avoid missing your slot
                      </p>
                    </div>
                  </div>

                  {payError && (
                    <div className="bg-rose/20 border border-rose/40 rounded-xl p-3 mt-4 flex gap-2">
                      <AlertCircle size={16} className="text-white flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-paper/90">{payError}</p>
                    </div>
                  )}

                  <button onClick={handlePayNow} disabled={isPaymentInProgress}
                    className="w-full bg-rose hover:bg-rose-dark text-white py-4 rounded-xl font-bold text-base transition-all transform active:scale-[0.98] shadow-lg shadow-rose/20 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 mt-4">
                    {payState === PAY_STATE.CREATING   && <><Loader size={19} className="animate-spin" /> Preparing payment…</>}
                    {payState === PAY_STATE.PROCESSING  && <><Loader size={19} className="animate-spin" /> Complete payment in popup…</>}
                    {payState === PAY_STATE.VERIFYING   && <><Loader size={19} className="animate-spin" /> Confirming payment…</>}
                    {(payState === PAY_STATE.IDLE || payState === PAY_STATE.FAILED) && <><CreditCard size={19} /> Pay ₹{totalPrice}</>}
                  </button>

                  <div className="flex items-center justify-center gap-2 mt-3 text-xs text-paper/35">
                    <Shield size={12} /> Secured by Razorpay · UPI, Cards, Net Banking accepted
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Live queue */}
          <div className="glass rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-display font-semibold text-paper">Live Queue</h2>
              <div className="bg-sage/20 text-sage-bright px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-sage-bright rounded-full animate-pulse" /> LIVE
              </div>
            </div>
            {queue.length === 0 ? (
              <div className="text-center py-12 text-paper/35">
                <Users size={44} className="mx-auto mb-3 opacity-50" />
                <p className="text-base font-display">No one in queue</p>
                <p className="text-sm">Be the first to book!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {queue.map((entry, index) => (
                  <div key={entry.id}
                    className={`p-3.5 rounded-xl ${entry.status === 'IN_PROGRESS' ? 'bg-sage/15 border border-sage/30' : 'glass-lite'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-sm flex-shrink-0 ${entry.status === 'IN_PROGRESS' ? 'bg-sage text-white' : 'bg-white/15 text-paper'}`}>
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-paper text-sm truncate">{entry.serviceName}</div>
                        <div className="text-xs text-paper/50">
                          {entry.status === 'IN_PROGRESS'
                            ? <span className="text-sage-bright font-bold">In Progress</span>
                            : <span>~{entry.estimatedDurationMinutes} min</span>}
                        </div>
                      </div>
                      {/* Chair badge — only meaningful (and only shown) once
                          a second chair is actually active for this salon */}
                      {chairStatus.totalChairs > 1 && entry.status === 'IN_PROGRESS' && (
                        <span className="bg-white/10 text-paper/60 px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0">
                          CHAIR {entry.chairNumber || 1}
                        </span>
                      )}
                      {entry.type === 'ONLINE_BOOKING' && (
                        <span className="bg-rose/20 text-rose px-2 py-0.5 rounded text-[10px] font-bold flex-shrink-0">ONLINE</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Reviews Section ── */}
        <div className="glass rounded-2xl p-5 sm:p-6 mb-8">
          <h2 className="text-xl sm:text-2xl font-display font-semibold text-paper mb-5 sm:mb-6">
            Reviews
            {reviews.length > 0 && (
              <span className="ml-2 text-sm sm:text-base font-body font-normal text-paper/40">({reviews.length})</span>
            )}
          </h2>

          {reviewsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-rose/30 border-t-rose rounded-full animate-spin" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-10 text-paper/35">
              <Star size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No reviews yet. Book a service and be the first to review!</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              {reviews.map(review => (
                <div key={review.id} className="glass-lite rounded-xl px-4 sm:px-5 py-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-paper text-sm">{review.customerName}</p>
                      <p className="text-xs text-paper/35 mt-0.5">
                        {new Date(review.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={13} className={
                          s <= review.rating
                            ? 'fill-brass text-brass'
                            : 'fill-white/10 text-white/10'
                        } />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-paper/60 leading-relaxed">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
