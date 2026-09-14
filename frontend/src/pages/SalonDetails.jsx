import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salonAPI, serviceAPI, queueAPI, paymentAPI, reviewAPI, WS_URL } from '../services/api';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { ArrowLeft, AlertCircle, Ticket, Clock, ArrowRight, X } from 'lucide-react';
import SalonHeader from '../components/salon/SalonHeader';
import TabBar from '../components/salon/TabBar';
import ServicesTab from '../components/salon/ServicesTab';
import ReviewsTab from '../components/salon/ReviewsTab';
import AboutTab from '../components/salon/AboutTab';
import BookingSuccessModal from '../components/salon/BookingSuccessModal';
import BookingTicket from '../components/salon/BookingTicket';

const PAY_STATE = {
  IDLE: 'IDLE',
  CREATING: 'CREATING',
  PROCESSING: 'PROCESSING',
  VERIFYING: 'VERIFYING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
};

export default function SalonDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [queue, setQueue] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [activeTab, setActiveTab] = useState('services');
  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [payState, setPayState] = useState(PAY_STATE.IDLE);
  const [payError, setPayError] = useState('');
  const [successBooking, setSuccessBooking] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  // Clock tick for wait time estimations
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Fetch data & establish real-time STOMP WebSocket
  useEffect(() => {
    loadSalonDetails();
    loadServices();
    loadQueue();
    loadReviews();

    let stompClient = null;
    try {
      const socket = new SockJS(WS_URL);
      stompClient = new Client({
        webSocketFactory: () => socket,
        onConnect: () => {
          stompClient.subscribe(`/topic/queue/${id}`, (message) => {
            try {
              setQueue(JSON.parse(message.body));
            } catch {}
          });
        },
      });
      stompClient.activate();
    } catch (e) {
      console.warn('WebSocket connection fallback to polling:', e);
    }

    // Periodic self-healing reconciliation
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const res = await serviceAPI.getBySalon(id);
      const list = res.data.data || [];
      // Strictly sort services in ascending order by service ID
      const sorted = [...list].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
      setServices(sorted);
      // Auto-select first Men service for immediate arrival calculation (matching default Men toggle)
      if (sorted.length > 0 && selectedServices.length === 0) {
        const firstMen =
          sorted.find((s) => {
            const g = (s.gender || '').toUpperCase();
            const n = (s.name || '').toLowerCase();
            return (
              g === 'MEN' ||
              g === 'UNISEX' ||
              g === 'ALL' ||
              (!g && !n.includes('women') && !n.includes('female'))
            );
          }) || sorted[0];
        setSelectedServices([firstMen]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setServicesLoading(false);
    }
  };

  const loadQueue = async () => {
    try {
      const res = await queueAPI.getQueue(id);
      setQueue(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadReviews = async () => {
    try {
      const res = await reviewAPI.getSalonReviews(id);
      setReviews(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setReviewsLoading(false);
    }
  };

  // Chair & wait-time simulation mirroring backend
  const getTotalWaitMinutes = useCallback(() => {
    const totalChairs = Math.min(Math.max(salon?.totalChairs || 1, 1), 4);
    const chairFreeInMinutes = new Array(totalChairs).fill(0);

    for (const entry of queue) {
      if (entry.status === 'IN_PROGRESS') {
        let elapsed = 0;
        if (entry.actualStartTime) {
          elapsed = Math.floor((currentTime - new Date(entry.actualStartTime)) / 60000);
        }
        const remaining = Math.max(0, (entry.estimatedDurationMinutes || 0) - elapsed);
        const chairIdx = Math.min(Math.max(entry.chairNumber || 1, 1), totalChairs) - 1;
        chairFreeInMinutes[chairIdx] = Math.max(chairFreeInMinutes[chairIdx], remaining);
      } else if (entry.status === 'WAITING') {
        const idx = chairFreeInMinutes.indexOf(Math.min(...chairFreeInMinutes));
        chairFreeInMinutes[idx] += entry.estimatedDurationMinutes || 0;
      }
    }

    return Math.min(...chairFreeInMinutes);
  }, [queue, currentTime, salon]);

  const waitMinutes = salon?.estimatedWaitMinutes ?? getTotalWaitMinutes();
  const estimatedArrivalMs = currentTime.getTime() + waitMinutes * 60000;
  const totalChairs = salon?.totalChairs || 1;

  // Multi-service totals
  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + Number(s.price || 0), 0),
    [selectedServices]
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
    [selectedServices]
  );

  // Toggle & remove services
  const handleToggleService = (service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) {
        return prev.filter((s) => s.id !== service.id);
      }
      return [...prev, service];
    });
    setPayState(PAY_STATE.IDLE);
    setPayError('');
  };

  const handleRemoveService = (serviceId) => {
    setSelectedServices((prev) => prev.filter((s) => s.id !== serviceId));
    setPayState(PAY_STATE.IDLE);
    setPayError('');
  };

  // Razorpay script loader
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  // Pay Now Razorpay checkout flow
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
        serviceIds: selectedServices.map((s) => s.id),
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
      key: orderData.razorpayKeyId,
      amount: orderData.amountPaise,
      currency: orderData.currency || 'INR',
      name: orderData.salonName || salon?.name || 'SalonCare',
      description: orderData.serviceName || `${selectedServices.length} Services`,
      order_id: orderData.razorpayOrderId,
      prefill: {
        name: user.name || '',
        email: user.email || '',
        contact: user.phone || '',
      },
      theme: { color: '#059669' }, // Emerald green brand color
      modal: {
        ondismiss: () => {
          // Per user request: remove "your payment was cancelled" notification
          setPayState(PAY_STATE.IDLE);
          setPayError('');
        },
      },
      handler: async (response) => {
        setPayState(PAY_STATE.VERIFYING);
        try {
          await paymentAPI.verify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          setSuccessBooking({
            bookingCode: orderData.bookingCode,
            salonName: orderData.salonName || salon?.name,
            serviceName: orderData.serviceName || selectedServices.map((s) => s.name).join(', '),
            amount: (orderData.amountPaise / 100).toFixed(2),
          });
          setPayState(PAY_STATE.SUCCESS);
          setSelectedServices([]);
          loadQueue();
        } catch {
          setPayError("Payment received, but booking verification is pending. Check 'My Bookings'.");
          setPayState(PAY_STATE.FAILED);
        }
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', (response) => {
      setPayState(PAY_STATE.FAILED);
      setPayError(`Payment failed: ${response.error?.description || 'Transaction error'}`);
    });
    razorpay.open();
  };

  // Handle hardware/browser back button: close ticket modal instead of navigating away
  useEffect(() => {
    if (ticketModalOpen) {
      window.history.pushState({ modal: 'ticket' }, '');
      const handlePopState = () => {
        setTicketModalOpen(false);
      };
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [ticketModalOpen]);

  const handleCloseTicket = () => {
    if (window.history.state?.modal === 'ticket') {
      window.history.back();
    } else {
      setTicketModalOpen(false);
    }
  };

  // Close ticket modal automatically when payment succeeds
  useEffect(() => {
    if (payState === PAY_STATE.SUCCESS) {
      setTicketModalOpen(false);
    }
  }, [payState]);

  // Submit new review
  const handleSubmitReview = async (rating, comment) => {
    await reviewAPI.submitReview(id, rating, comment);
    loadReviews();
    loadSalonDetails();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">Loading salon details…</p>
        </div>
      </div>
    );
  }

  if (!salon) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-xs max-w-sm">
          <AlertCircle size={36} className="text-slate-400 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-slate-900">Salon Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">
            This salon might have been removed or is temporarily unavailable.
          </p>
          <button
            onClick={() => navigate('/home')}
            className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#F8FAFC] text-slate-900 font-sans ${selectedServices.length > 0 ? 'pb-28 sm:pb-32 lg:pb-16' : 'pb-16'}`}>
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-3.5 sm:pt-6">
        {/* Top Back Navigation */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-bold mb-3.5 transition text-base sm:text-lg cursor-pointer"
        >
          <ArrowLeft size={20} className="text-slate-500" />
          <span>Back to Salons</span>
        </button>

        {/* Salon Header with stat strip */}
        <SalonHeader
          salon={salon}
          waitMinutes={waitMinutes}
          queueLength={queue.filter((q) => q.status === 'WAITING').length}
        />

        {/* 3-column balanced tabs: Services, Reviews, About */}
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          rating={salon.rating}
          selectedServicesCount={selectedServices.length}
        />

        {/* Divider line between tabs and service search / tab content */}
        <div className="border-b border-slate-200/80 my-3.5 sm:my-4" />

        {/* Tab 1: Services */}
        {activeTab === 'services' && (
          <ServicesTab
            services={services}
            servicesLoading={servicesLoading}
            selectedServices={selectedServices}
            onToggleService={handleToggleService}
            onRemoveService={handleRemoveService}
            totalPrice={totalPrice}
            totalDuration={totalDuration}
            estimatedArrivalMs={estimatedArrivalMs}
            totalChairs={totalChairs}
            waitMinutes={waitMinutes}
            payState={payState}
            payError={payError}
            onPayNow={handlePayNow}
          />
        )}

        {/* Tab 3: Reviews */}
        {activeTab === 'reviews' && (
          <ReviewsTab
            reviews={reviews}
            overallRating={salon.rating}
            totalReviews={salon.totalReviews}
            onSubmitReview={handleSubmitReview}
          />
        )}

        {/* Tab 4: About */}
        {activeTab === 'about' && <AboutTab salon={salon} />}
      </div>

      {/* Sticky Bottom Summary Bar - visible across ALL tabs whenever services are selected */}
      {selectedServices.length > 0 && (
        <div
          className={`fixed bottom-3 left-3 right-3 z-40 max-w-md mx-auto pointer-events-none ${
            activeTab === 'services' ? 'lg:hidden' : 'lg:bottom-6 lg:right-6 lg:left-auto lg:mr-0 lg:max-w-sm'
          }`}
        >
          <div
            key={`${selectedServices.map((s) => s.id).join('-')}-${totalPrice}`}
            role="button"
            tabIndex={0}
            onClick={() => setTicketModalOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setTicketModalOpen(true);
              }
            }}
            className="animate-bottom-bar-pop bg-[#f0faf5] hover:bg-[#e4f7ee] active:bg-[#dbf3e7] border border-emerald-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-3.5 px-4 sm:px-4.5 shadow-lg shadow-emerald-950/10 flex items-center justify-between gap-3 pointer-events-auto cursor-pointer transition-colors duration-150 select-none group"
            title="Click to view token & booking summary"
          >
            {/* Left: Ticket icon + service details (Clickable) */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="animate-icon-pop w-10 h-10 rounded-xl bg-emerald-100/80 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Ticket size={20} className="text-emerald-600" />
              </div>

              <div className="min-w-0">
                <div className="font-body text-xs font-semibold text-slate-800 leading-tight truncate">
                  <span>{selectedServices.length} selected </span>
                  <span className="text-slate-500 font-normal">(~{totalDuration}m)</span>
                </div>
                <div className="animate-price-pulse font-display font-bold text-lg sm:text-xl text-slate-900 leading-tight my-0.5">
                  ₹{totalPrice}
                </div>
                <div className="font-body text-[11px] sm:text-xs font-medium text-emerald-700 flex items-center gap-1 leading-tight">
                  <Clock size={12} className="text-emerald-600 shrink-0" />
                  <span>
                    Arrival: ~{estimatedArrivalMs
                      ? new Date(estimatedArrivalMs).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        }).toLowerCase()
                      : 'now'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-10 w-[1px] bg-slate-200/90 mx-1 shrink-0" />

            {/* Right: Book Now Button (Also opens ticket modal / checkout) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setTicketModalOpen(true);
              }}
              className="bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] text-white font-body font-semibold text-xs sm:text-sm px-5 sm:px-6 py-3 sm:py-3.5 rounded-2xl shadow-sm transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 group-hover:shadow-md"
            >
              <span>Book Now</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Booking Ticket Drawer Modal */}
      {ticketModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity"
          onClick={handleCloseTicket}
        >
          <div
            className="bg-white w-full max-w-md max-h-[88vh] rounded-t-3xl sm:rounded-2xl overflow-y-auto p-4 sm:p-5 shadow-2xl relative animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-base text-slate-900">Your Booking Ticket</h3>
              <button
                type="button"
                onClick={handleCloseTicket}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <BookingTicket
              selectedServices={selectedServices}
              totalPrice={totalPrice}
              totalDuration={totalDuration}
              estimatedArrivalMs={estimatedArrivalMs}
              totalChairs={totalChairs}
              waitMinutes={waitMinutes}
              payState={payState}
              payError={payError}
              onRemoveService={handleRemoveService}
              onPayNow={handlePayNow}
            />
          </div>
        </div>
      )}

      {/* Booking Success Confirmation Modal */}
      {successBooking && (
        <BookingSuccessModal
          booking={successBooking}
          onTrackQueue={() => {
            setSuccessBooking(null);
            navigate('/my-bookings');
          }}
          onViewMyBookings={() => {
            setSuccessBooking(null);
            navigate('/my-bookings');
          }}
          onClose={() => setSuccessBooking(null)}
        />
      )}
    </div>
  );
}
