import React, { useState, useEffect, useRef } from 'react';
import { Clock, Plus, Play, AlertCircle, Trash2, XCircle, Scissors, Phone } from 'lucide-react';
import { queueAPI, serviceAPI, salonAPI } from '../services/api';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import ChairCard from './ChairCard';

export default function BarberDashboard({ salonId }) {
  // Up to 2 IN_PROGRESS entries, one per active chair
  const [inProgressEntries, setInProgressEntries] = useState([]);
  const [queue, setQueue] = useState([]);
  const [totalChairs, setTotalChairs] = useState(1);
  const [chairToggleLoading, setChairToggleLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAddWalkin, setShowAddWalkin] = useState(false);
  const [cancelModal, setCancelModal] = useState({
    open: false,
    queueEntry: null,
    reason: '',
    loading: false,
  });
  const [services, setServices] = useState([]);
  const [walkinData, setWalkinData] = useState({
    customerName: '',
    serviceId: null
  });

  // In-memory + localStorage cache of estimated-arrival "floors", so a
  // waiting customer's displayed wait time never visibly jumps backward
  // between server updates — it can only move later, never earlier.
  // Key: queueEntry.id (string) → estimated arrival ms
  const estimatedFloorRef = useRef({});
  const FLOOR_LS_KEY = `barber_queue_floors_${salonId}`;

  const seedFloorsFromStorage = () => {
    try {
      const stored = localStorage.getItem(FLOOR_LS_KEY);
      if (stored) estimatedFloorRef.current = JSON.parse(stored);
    } catch { /* ignore corrupt data */ }
  };

  const persistFloor = (entryId, ms) => {
    estimatedFloorRef.current[entryId] = ms;
    try {
      localStorage.setItem(FLOOR_LS_KEY, JSON.stringify(estimatedFloorRef.current));
    } catch { /* ignore quota errors */ }
  };

  const clearFloor = (entryId) => {
    delete estimatedFloorRef.current[entryId];
    try {
      localStorage.setItem(FLOOR_LS_KEY, JSON.stringify(estimatedFloorRef.current));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    seedFloorsFromStorage();
    loadSalonInfo();
    loadQueueAndRestoreState();
    loadServices();
    const cleanup = connectWebSocket();
    return cleanup;
  }, [salonId]);

  const connectWebSocket = () => {
    const socket = new SockJS(import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws');
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        stompClient.subscribe(`/topic/queue/${salonId}`, (message) => {
          try {
            const updatedQueue = JSON.parse(message.body);
            updateQueueState(updatedQueue);
          } catch (error) {
            console.error('Error parsing queue update:', error);
          }
        });
      },
      onDisconnect: () => console.log('WebSocket disconnected'),
      onStompError: (frame) => console.error('STOMP error:', frame),
    });

    stompClient.activate();

    return () => {
      if (stompClient && stompClient.active) stompClient.deactivate();
    };
  };

  const loadSalonInfo = async () => {
    try {
      const response = await salonAPI.getMySalon();
      const salon = response.data.data;
      if (salon?.totalChairs) setTotalChairs(salon.totalChairs);
    } catch (error) {
      console.error('Error loading salon info:', error);
    }
  };

  const handleToggleChairs = async (newCount) => {
    if (newCount === totalChairs || chairToggleLoading) return;
    const previous = totalChairs;
    setTotalChairs(newCount); // optimistic — feels instant
    setChairToggleLoading(true);
    try {
      await salonAPI.updateChairs(salonId, newCount);
      // Positions/wait-times for everyone waiting depend on chair count,
      // so refresh the queue right away rather than waiting for the
      // next natural update.
      loadQueue();
    } catch (error) {
      console.error('Error updating chair count:', error);
      setTotalChairs(previous); // revert on failure
      alert('Could not update chair count. Please try again.');
    } finally {
      setChairToggleLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const response = await serviceAPI.getBySalon(salonId);
      setServices(response.data.data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadQueueAndRestoreState = async () => {
    try {
      const response = await queueAPI.getQueue(salonId);
      updateQueueState(response.data.data || []);
    } catch (error) {
      console.error('Error loading queue:', error);
      if (error.response?.status === 404) {
        setQueue([]);
        setInProgressEntries([]);
      }
    }
  };

  const loadQueue = async () => {
    try {
      const response = await queueAPI.getQueue(salonId);
      updateQueueState(response.data.data || []);
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  };

  const updateQueueState = (queueData) => {
    const inProgress = queueData
      .filter(entry => entry.status === 'IN_PROGRESS')
      .sort((a, b) => (a.chairNumber || 1) - (b.chairNumber || 1));
    const waitingQueue = queueData.filter(entry => entry.status === 'WAITING');

    // Clear floors for entries no longer waiting (started, cancelled, removed)
    const waitingIds = new Set(waitingQueue.map(e => String(e.id)));
    Object.keys(estimatedFloorRef.current).forEach(id => {
      if (!waitingIds.has(id)) clearFloor(id);
    });

    setInProgressEntries(inProgress);
    setQueue(waitingQueue);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  /**
   * The backend already computes an accurate estimatedStartTime per waiting
   * entry — factoring in however many chairs are active right now, and
   * whichever chair frees up soonest for that specific customer. We just
   * apply a "never move backward" floor on top so the displayed number
   * doesn't visibly flicker earlier between updates.
   */
  const getEstimatedArrivalMs = (entry) => {
    const serverMs = entry.estimatedStartTime
      ? new Date(entry.estimatedStartTime).getTime()
      : Date.now();
    const floor = estimatedFloorRef.current[entry.id] || 0;
    const effectiveMs = Math.max(serverMs, floor);
    persistFloor(entry.id, effectiveMs);
    return effectiveMs;
  };

  const calculateEstimatedTime = (entry) => formatTime(new Date(getEstimatedArrivalMs(entry)));

  const getTimeUntilTurn = (entry) => {
    const ms = getEstimatedArrivalMs(entry);
    return Math.max(0, Math.round((ms - Date.now()) / 60000));
  };

  const handleAddWalkin = async () => {
    if (!walkinData.customerName || !walkinData.serviceId) {
      alert('Please fill all fields');
      return;
    }
    try {
      await queueAPI.addWalkIn({
        salonId,
        serviceId: walkinData.serviceId,
        customerName: walkinData.customerName
      });
      setShowAddWalkin(false);
      setWalkinData({ customerName: '', serviceId: null });
      loadQueue();
    } catch (error) {
      console.error('Error adding walk-in:', error);
      alert('Failed to add walk-in. Please try again.');
    }
  };

  // No chair number needs to be picked here — the backend assigns the
  // lowest-numbered free chair automatically.
  const handleStartService = async (queueEntry) => {
    try {
      await queueAPI.startService(queueEntry.id);
      clearFloor(queueEntry.id);
      loadQueue();
    } catch (error) {
      console.error('Error starting service:', error);
      alert(error.response?.data?.message || 'Failed to start service — no chair may be free right now.');
      loadQueue(); // resync in case another device/tab already grabbed the chair
    }
  };

  const handleCompleteService = async (entryId) => {
    try {
      localStorage.removeItem(`service_${entryId}`);
      await queueAPI.completeService(entryId);
      loadQueue();
    } catch (error) {
      console.error('Error completing service:', error);
      alert('Failed to complete service');
    }
  };

  const CANCEL_REASONS = [
    { key: 'SALON_EMERGENCY', label: 'Salon Emergency', description: 'Unexpected situation requiring us to close or stop services' },
    { key: 'RUNNING_TOO_LATE', label: 'Running Too Late', description: 'Queue is running significantly behind and we cannot accommodate you today' },
    { key: 'OVERBOOKING', label: 'Overbooking Error', description: 'Too many customers were booked by mistake' },
    { key: 'OTHER', label: 'Other Reason', description: 'Another reason not listed above' },
  ];

  const openCancelModal = (customer) => {
    setCancelModal({ open: true, queueEntry: customer, reason: '', loading: false });
  };

  const closeCancelModal = () => {
    setCancelModal({ open: false, queueEntry: null, reason: '', loading: false });
  };

  const handleCancelOnlineBooking = async () => {
    if (!cancelModal.reason) return;
    setCancelModal(prev => ({ ...prev, loading: true }));
    try {
      await queueAPI.cancelOnlineBooking(cancelModal.queueEntry.id, cancelModal.reason);
      closeCancelModal();
      loadQueue();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking. Please try again.');
      setCancelModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleRemoveFromQueue = async (id) => {
    if (!confirm('Remove this customer from queue?')) return;
    try {
      clearFloor(id);
      await queueAPI.removeFromQueue(id);
      loadQueue();
    } catch (error) {
      console.error('Error removing from queue:', error);
      alert('Failed to remove from queue');
    }
  };

  const twoChairMode = totalChairs === 2;
  const freeChairsCount = Math.max(0, totalChairs - inProgressEntries.length);

  // One ChairCard per active chair — chair N shows whichever IN_PROGRESS
  // entry has that chairNumber, or an empty state if none.
  const chairSlots = Array.from({ length: totalChairs }, (_, i) => {
    const chairNumber = i + 1;
    const entry = inProgressEntries.find(e => (e.chairNumber || 1) === chairNumber) || null;
    return { chairNumber, entry };
  });

  return (
    <div className="min-h-screen bg-paper p-3 sm:p-4 font-body">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-paper-card rounded-2xl shadow-sm border border-ink/8 p-5 sm:p-6 mb-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-semibold text-ink flex items-center gap-2">
                <div className="w-9 h-9 bg-rose rounded-xl flex items-center justify-center rotate-3 flex-shrink-0">
                  <Scissors size={17} className="text-white -rotate-3" />
                </div>
                Barber Dashboard
              </h1>
              <p className="text-ink/50 mt-1 text-sm">Manage your queue in real-time</p>
            </div>
            <div className="text-right">
              <div className="text-3xl sm:text-4xl font-mono font-bold text-ink">{formatTime(currentTime)}</div>
              <div className="text-xs sm:text-sm text-ink/40">Current Time</div>
            </div>
          </div>

          {/* Chair toggle — simple two-button segmented control. Owner flips
              this each morning depending on whether both barbers are in. */}
          <div className="mt-5 pt-5 border-t border-dashed border-ink/10 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-ink/60 text-sm font-semibold">
              Chairs running today
            </div>
            <div className="inline-flex bg-ink/5 rounded-xl p-1">
              {[1, 2].map(n => (
                <button
                  key={n}
                  onClick={() => handleToggleChairs(n)}
                  disabled={chairToggleLoading}
                  className={`px-5 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 ${
                    totalChairs === n
                      ? 'bg-rose text-white shadow-sm'
                      : 'text-ink/50 hover:text-ink/70'
                  }`}
                >
                  {n} {n === 1 ? 'Chair' : 'Chairs'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chair cards — 1 column for a single chair, 2 side-by-side for two */}
        <div className={`grid gap-4 mb-4 ${twoChairMode ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          {chairSlots.map(slot => (
            <ChairCard
              key={slot.chairNumber}
              chairNumber={slot.chairNumber}
              entry={slot.entry}
              onComplete={handleCompleteService}
              twoChairMode={twoChairMode}
            />
          ))}
        </div>

        {/* Queue */}
        <div className="bg-paper-card rounded-2xl shadow-sm border border-ink/8 p-5 sm:p-6 mb-4">
          <div className="flex justify-between items-center mb-5 sm:mb-6 gap-3">
            <h2 className="text-xl sm:text-2xl font-display font-semibold text-ink">Queue ({queue.length})</h2>
            <button
              onClick={() => setShowAddWalkin(true)}
              className="bg-sage hover:bg-sage/90 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-bold flex items-center gap-2 transition-all transform active:scale-95 shadow-md text-sm sm:text-base flex-shrink-0"
            >
              <Plus size={18} />
              <span>Add Walk-in</span>
            </button>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-14 sm:py-16 text-ink/30">
              <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg sm:text-xl font-display font-semibold text-ink/50">No customers in queue</p>
              <p className="text-sm mt-2 text-ink/35">Walk-ins will appear here when you add them</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((customer, index) => (
                <div
                  key={customer.id}
                  className="border-2 border-ink/8 rounded-xl p-4 sm:p-5 hover:border-rose/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="bg-ink text-paper w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-mono font-bold text-lg sm:text-xl shadow-md flex-shrink-0">
                        {index + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-display font-semibold text-ink text-base sm:text-lg truncate">{customer.customerName}</span>
                          {customer.type === 'ONLINE_BOOKING' ? (
                            <span className="bg-sage-light text-sage px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0">
                              PAID ONLINE
                            </span>
                          ) : (
                            <span className="bg-ink/8 text-ink/50 px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0">
                              WALK-IN
                            </span>
                          )}
                        </div>

                        <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm flex-wrap items-center">
                          <span className="font-medium text-ink/70">{customer.serviceName}</span>
                          <span className="text-ink/25">•</span>
                          <span className="text-ink/50 font-mono">{customer.estimatedDurationMinutes} min</span>
                          <span className="text-ink/25">•</span>
                          <span className="text-rose font-bold flex items-center gap-1 font-mono">
                            <Clock size={13} />
                            {calculateEstimatedTime(customer)}
                          </span>
                        </div>

                        {/* Phone — only present for online bookings (walk-ins
                            have no linked user account, so no number to show).
                            Plain text, not a tel: link — the barber's device
                            is a tablet, not a phone, so a dialer link would do
                            nothing useful here. They can call from their own
                            phone if needed. */}
                        {customer.customerPhone && (
                          <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs sm:text-sm text-sage font-semibold font-mono">
                            <Phone size={13} />
                            {customer.customerPhone}
                          </span>
                        )}

                        <div className="mt-1.5 text-xs text-ink/40">
                          Estimated in{' '}
                          <span className="font-bold text-rose font-mono">
                            {getTimeUntilTurn(customer)} minutes
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                      {/* A free chair exists for this customer's turn — with 2
                          chairs both the 1st and 2nd waiting customer can be
                          started at once if both chairs are empty. */}
                      {index < freeChairsCount && (
                        <button
                          onClick={() => handleStartService(customer)}
                          className="bg-rose hover:bg-rose-dark text-white px-3.5 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold flex items-center gap-1.5 sm:gap-2 transition-all transform active:scale-95 shadow-md text-sm sm:text-base"
                        >
                          <Play size={16} />
                          <span className="hidden sm:inline">Start Service</span>
                        </button>
                      )}

                      {customer.type !== 'ONLINE_BOOKING' && (
                        <button
                          onClick={() => handleRemoveFromQueue(customer.id)}
                          className="text-ink/35 hover:text-rose hover:bg-rose-light p-2.5 sm:p-3 rounded-xl transition-all"
                          title="Remove walk-in from queue"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}

                      {customer.type === 'ONLINE_BOOKING' && (
                        <button
                          onClick={() => openCancelModal(customer)}
                          className="text-brass/70 hover:text-brass hover:bg-brass-light p-2.5 sm:p-3 rounded-xl transition-all"
                          title="Cancel online booking"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-paper-card rounded-xl shadow-sm border border-ink/8 p-4 sm:p-5">
            <div className="text-ink/45 text-xs sm:text-sm mb-1 font-medium">Total Queue</div>
            <div className="text-2xl sm:text-4xl font-display font-semibold text-ink">{queue.length}</div>
          </div>
          <div className="bg-paper-card rounded-xl shadow-sm border border-ink/8 p-4 sm:p-5">
            <div className="text-ink/45 text-xs sm:text-sm mb-1 font-medium">Online</div>
            <div className="text-2xl sm:text-4xl font-display font-semibold text-sage">
              {queue.filter(c => c.type === 'ONLINE_BOOKING').length}
            </div>
          </div>
          <div className="bg-paper-card rounded-xl shadow-sm border border-ink/8 p-4 sm:p-5">
            <div className="text-ink/45 text-xs sm:text-sm mb-1 font-medium">Walk-ins</div>
            <div className="text-2xl sm:text-4xl font-display font-semibold text-brass">
              {queue.filter(c => c.type === 'WALK_IN').length}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cancel Online Booking Modal ────────────────────────────────────── */}
      {cancelModal.open && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-paper-card rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-brass-light p-2 rounded-full">
                <XCircle size={24} className="text-brass" />
              </div>
              <h3 className="text-xl sm:text-2xl font-display font-semibold text-ink">Cancel Booking</h3>
            </div>

            <div className="bg-paper rounded-xl p-4 mb-6 mt-4">
              <p className="text-sm text-ink/45 mb-1">Cancelling booking for</p>
              <p className="font-display font-semibold text-ink text-lg">
                {cancelModal.queueEntry?.customerName}
              </p>
              <p className="text-sm text-ink/55">
                {cancelModal.queueEntry?.serviceName} •{' '}
                {cancelModal.queueEntry?.estimatedDurationMinutes} min
              </p>
            </div>

            <div className="bg-brass-light border border-brass/20 rounded-xl p-3 mb-5 flex gap-2">
              <AlertCircle size={16} className="text-brass flex-shrink-0 mt-0.5" />
              <p className="text-xs text-brass">
                The customer will see this cancellation and the reason in their bookings.
                Please select an honest reason.
              </p>
            </div>

            <p className="text-sm font-bold text-ink/70 mb-3">Select a reason</p>
            <div className="space-y-2 mb-6">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setCancelModal(prev => ({ ...prev, reason: r.key }))}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    cancelModal.reason === r.key
                      ? 'border-brass bg-brass-light'
                      : 'border-ink/10 hover:border-ink/20'
                  }`}
                >
                  <div className="font-semibold text-ink text-sm">{r.label}</div>
                  <div className="text-xs text-ink/45 mt-0.5">{r.description}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeCancelModal}
                disabled={cancelModal.loading}
                className="flex-1 px-4 py-3 border-2 border-ink/10 rounded-xl hover:bg-ink/5 transition-all font-bold text-ink/60 disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={handleCancelOnlineBooking}
                disabled={!cancelModal.reason || cancelModal.loading}
                className="flex-1 px-4 py-3 bg-brass hover:bg-brass/90 text-white rounded-xl transition-all font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cancelModal.loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Cancelling…
                  </>
                ) : (
                  'Confirm Cancel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Walk-in Modal */}
      {showAddWalkin && (
        <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-paper-card rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl sm:text-2xl font-display font-semibold mb-6 text-ink">Add Walk-in Customer</h3>

            <div className="mb-5">
              <label className="block text-xs font-bold text-ink/50 uppercase tracking-wide mb-2">Customer Name</label>
              <input
                type="text"
                value={walkinData.customerName}
                onChange={(e) => setWalkinData({ ...walkinData, customerName: e.target.value })}
                placeholder="Enter customer name"
                className="w-full px-4 py-3.5 bg-paper border-2 border-transparent rounded-xl focus:border-rose focus:outline-none transition-colors text-sm text-ink placeholder:text-ink/35"
                autoFocus
              />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-ink/50 uppercase tracking-wide mb-3">Select Service</label>
              <div className="space-y-3">
                {services.map(service => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => setWalkinData({ ...walkinData, serviceId: service.id })}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      walkinData.serviceId === service.id
                        ? 'border-rose bg-rose-light shadow-sm'
                        : 'border-ink/10 hover:border-ink/20'
                    }`}
                  >
                    <div className="font-display font-semibold text-base text-ink">{service.name}</div>
                    <div className="text-sm text-ink/50 font-mono">₹{service.price} • {service.durationMinutes || service.duration} minutes</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddWalkin(false);
                  setWalkinData({ customerName: '', serviceId: null });
                }}
                className="flex-1 px-4 py-3 border-2 border-ink/10 rounded-xl hover:bg-ink/5 transition-all font-bold text-ink/60"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWalkin}
                disabled={!walkinData.customerName || !walkinData.serviceId}
                className="flex-1 px-4 py-3 bg-sage hover:bg-sage/90 text-white rounded-xl transition-all font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
