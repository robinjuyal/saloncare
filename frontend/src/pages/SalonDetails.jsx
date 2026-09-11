import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salonAPI, serviceAPI, queueAPI, paymentAPI, reviewAPI, WS_URL } from '../services/api';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import SalonHeader from '../components/salon/SalonHeader';
import TabBar from '../components/salon/TabBar';
import ServicesTab from '../components/salon/ServicesTab';
import WaitingLineTab from '../components/salon/WaitingLineTab';
import ReviewsTab from '../components/salon/ReviewsTab';
import AboutTab from '../components/salon/AboutTab';
import BookingSuccessModal from '../components/salon/BookingSuccessModal';

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
      setServices(list);
      // Auto-select first service for immediate arrival calculation
      if (list.length > 0 && selectedServices.length === 0) {
        setSelectedServices([list[0]]);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16 font-sans">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6">
        {/* Top Back Navigation with increased text size */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold mb-3 sm:mb-4 transition text-sm sm:text-base cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span>Back to Salons</span>
        </button>

        {/* Salon Header with verified badge and stat strip */}
        <SalonHeader
          salon={salon}
          waitMinutes={waitMinutes}
          queueLength={queue.filter((q) => q.status === 'WAITING').length}
          onSelectTab={setActiveTab}
        />

        {/* 4-column balanced tabs */}
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          queueCount={queue.filter((q) => q.status === 'WAITING').length}
          rating={salon.rating}
          selectedServicesCount={selectedServices.length}
        />

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

        {/* Tab 2: In Line (Waiting Line) */}
        {activeTab === 'queue' && (
          <WaitingLineTab
            queue={queue}
            totalChairs={totalChairs}
            waitMinutes={waitMinutes}
            currentTime={currentTime}
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

      {/* Booking Success Confirmation Modal */}
      {successBooking && (
        <BookingSuccessModal
          booking={successBooking}
          onTrackQueue={() => {
            setSuccessBooking(null);
            setActiveTab('queue');
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
