import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Plus,
  Play,
  AlertCircle,
  Trash2,
  XCircle,
  Scissors,
  Phone,
  CheckCircle2,
  Users,
  CreditCard,
  UserCheck,
  Armchair,
  Radio,
  Timer
} from 'lucide-react';
import { queueAPI, serviceAPI, salonAPI, WS_URL } from '../services/api';
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
  const [wsConnected, setWsConnected] = useState(false);
  const [cancelModal, setCancelModal] = useState({
    open: false,
    queueEntry: null,
    reason: '',
    loading: false,
  });
  const [services, setServices] = useState([]);
  const [walkinData, setWalkinData] = useState({
    customerName: '',
    serviceId: null,
  });

  // In-memory + localStorage cache of estimated-arrival "floors"
  const estimatedFloorRef = useRef({});
  const FLOOR_LS_KEY = `barber_queue_floors_${salonId}`;

  const seedFloorsFromStorage = () => {
    try {
      const stored = localStorage.getItem(FLOOR_LS_KEY);
      if (stored) estimatedFloorRef.current = JSON.parse(stored);
    } catch {
      /* ignore corrupt data */
    }
  };

  const persistFloor = (entryId, ms) => {
    estimatedFloorRef.current[entryId] = ms;
    try {
      localStorage.setItem(FLOOR_LS_KEY, JSON.stringify(estimatedFloorRef.current));
    } catch {
      /* ignore quota errors */
    }
  };

  const clearFloor = (entryId) => {
    delete estimatedFloorRef.current[entryId];
    try {
      localStorage.setItem(FLOOR_LS_KEY, JSON.stringify(estimatedFloorRef.current));
    } catch {
      /* ignore */
    }
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
    const socket = new SockJS(WS_URL);
    const stompClient = new Client({
      webSocketFactory: () => socket,
      onConnect: () => {
        setWsConnected(true);
        stompClient.subscribe(`/topic/queue/${salonId}`, (message) => {
          try {
            const updatedQueue = JSON.parse(message.body);
            updateQueueState(updatedQueue);
          } catch (error) {
            console.error('Error parsing queue update:', error);
          }
        });
      },
      onDisconnect: () => setWsConnected(false),
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        setWsConnected(false);
      },
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
    setTotalChairs(newCount); // optimistic UI
    setChairToggleLoading(true);

    try {
      await salonAPI.updateChairs(salonId, newCount);
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
      .filter((entry) => entry.status === 'IN_PROGRESS')
      .sort((a, b) => (a.chairNumber || 1) - (b.chairNumber || 1));

    const waitingQueue = queueData.filter((entry) => entry.status === 'WAITING');

    // Clear floors for entries no longer waiting
    const waitingIds = new Set(waitingQueue.map((e) => String(e.id)));
    Object.keys(estimatedFloorRef.current).forEach((id) => {
      if (!waitingIds.has(id)) clearFloor(id);
    });

    setInProgressEntries(inProgress);
    setQueue(waitingQueue);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

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
      alert('Please fill customer name and choose a service');
      return;
    }

    try {
      await queueAPI.addWalkIn({
        salonId,
        serviceId: walkinData.serviceId,
        customerName: walkinData.customerName,
      });
      setShowAddWalkin(false);
      setWalkinData({ customerName: '', serviceId: null });
      loadQueue();
    } catch (error) {
      console.error('Error adding walk-in:', error);
      alert('Failed to add walk-in. Please try again.');
    }
  };

  const handleStartService = async (queueEntry) => {
    try {
      await queueAPI.startService(queueEntry.id);
      clearFloor(queueEntry.id);
      loadQueue();
    } catch (error) {
      console.error('Error starting service:', error);
      alert(error.response?.data?.message || 'Failed to start service — no chair may be free right now.');
      loadQueue();
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
    { key: 'SALON_EMERGENCY', label: 'Salon Emergency', description: 'Unexpected emergency or store closure' },
    { key: 'RUNNING_TOO_LATE', label: 'Running Too Late', description: 'Schedule heavily delayed and cannot seat today' },
    { key: 'OVERBOOKING', label: 'Overbooking Error', description: 'Accidental overlap or excess queue' },
    { key: 'OTHER', label: 'Other Reason', description: 'Any other unforeseen circumstance' },
  ];

  const openCancelModal = (customer) => {
    setCancelModal({ open: true, queueEntry: customer, reason: '', loading: false });
  };

  const closeCancelModal = () => {
    setCancelModal({ open: false, queueEntry: null, reason: '', loading: false });
  };

  const handleCancelOnlineBooking = async () => {
    if (!cancelModal.reason) return;
    setCancelModal((prev) => ({ ...prev, loading: true }));

    try {
      await queueAPI.cancelOnlineBooking(cancelModal.queueEntry.id, cancelModal.reason);
      closeCancelModal();
      loadQueue();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert('Failed to cancel booking. Please try again.');
      setCancelModal((prev) => ({ ...prev, loading: false }));
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

  // Map chair slots 1..totalChairs
  const chairSlots = Array.from({ length: totalChairs }, (_, i) => {
    const chairNumber = i + 1;
    const entry = inProgressEntries.find((e) => (e.chairNumber || 1) === chairNumber) || null;
    return { chairNumber, entry };
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-2.5 sm:p-4 md:p-5 font-sans">
      <div className="max-w-5xl mx-auto space-y-3 sm:space-y-4">
        
        {/* ── Top Header & Chair Control Bar ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 sm:p-3.5 md:p-4">
          <div className="flex flex-col min-[600px]:flex-row min-[600px]:items-center justify-between gap-2.5 sm:gap-3">
            
            {/* Title & Live Status */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
                <Scissors size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
                    Barber Dashboard
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 whitespace-nowrap ${
                      wsConnected
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {wsConnected ? 'Live Connected' : 'Syncing'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate hidden min-[500px]:block">
                  Real-time chair and queue management
                </p>
              </div>
            </div>

            {/* Right: Clock & Chair Switcher */}
            <div className="flex items-center justify-between min-[600px]:justify-end gap-2 sm:gap-2.5 border-t min-[600px]:border-t-0 pt-2 min-[600px]:pt-0 border-slate-100 shrink-0">
              
              {/* Digital Clock */}
              <div className="flex items-center gap-1.5 bg-slate-100/90 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200/60 shrink-0 whitespace-nowrap">
                <Clock size={14} className="text-slate-500 shrink-0" />
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 whitespace-nowrap">
                  {formatTime(currentTime)}
                </span>
              </div>

              {/* Chairs running toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70 shrink-0">
                {[1, 2].map((count) => (
                  <button
                    key={count}
                    onClick={() => handleToggleChairs(count)}
                    disabled={chairToggleLoading}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      totalChairs === count
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Armchair size={12} className="shrink-0" />
                    <span>{count} {count === 1 ? 'Chair' : 'Chairs'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Chairs Section ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Armchair size={13} />
              <span>Active Chairs ({inProgressEntries.length}/{totalChairs} Occupied)</span>
            </h2>
            {freeChairsCount > 0 && (
              <span className="text-[11px] sm:text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                {freeChairsCount} {freeChairsCount === 1 ? 'chair ready' : 'chairs ready'}
              </span>
            )}
          </div>

          <div
            className={`grid gap-2.5 sm:gap-3.5 ${
              twoChairMode ? 'grid-cols-1 min-[560px]:grid-cols-2 sm:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {chairSlots.map((slot) => (
              <ChairCard
                key={slot.chairNumber}
                chairNumber={slot.chairNumber}
                entry={slot.entry}
                onComplete={handleCompleteService}
                twoChairMode={twoChairMode}
                nextWaitingCustomer={freeChairsCount > 0 && queue.length > 0 ? queue[0] : null}
                onStartNext={handleStartService}
              />
            ))}
          </div>
        </div>

        {/* ── Waiting Queue Section ── */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3 sm:p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Waiting Queue
              </h2>
              <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-full text-xs border border-slate-200">
                {queue.length}
              </span>
            </div>

            <button
              onClick={() => setShowAddWalkin(true)}
              className="bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Plus size={15} />
              <span>Add Walk-in</span>
            </button>
          </div>

          {queue.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={24} />
              </div>
              <p className="text-base font-semibold text-slate-700">Queue is Clear</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No customers are currently waiting. Walk-ins added at the counter or online bookings will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {queue.map((customer, index) => {
                const canStart = index < freeChairsCount;
                return (
                  <div
                    key={customer.id}
                    className={`group rounded-xl border p-2.5 sm:p-3.5 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 ${
                      canStart
                        ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300 hover:shadow-xs'
                        : 'border-slate-200/90 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Left: Position Badge & Customer Meta */}
                    <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 font-mono ${
                          canStart
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        #{index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5 sm:mb-1">
                          <span className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                            {customer.customerName}
                          </span>
                          {customer.type === 'ONLINE_BOOKING' ? (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200/80 px-2 py-0.5 rounded-full text-[11px] font-semibold flex items-center gap-1">
                              <CheckCircle2 size={10} className="text-blue-600" />
                              Paid Online
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                              Walk-in
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] sm:text-xs text-slate-500">
                          <span className="font-medium text-slate-700">{customer.serviceName}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-slate-600">{customer.estimatedDurationMinutes} min</span>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                            <Clock size={11} className="text-slate-400" />
                            {calculateEstimatedTime(customer)} (~{getTimeUntilTurn(customer)}m away)
                          </span>

                          {customer.customerPhone && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="inline-flex items-center gap-1 text-blue-600 font-mono font-medium">
                                <Phone size={10} />
                                {customer.customerPhone}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                      {canStart && (
                        <button
                          onClick={() => handleStartService(customer)}
                          className="bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Play size={13} className="fill-current text-white" />
                          <span>Start Service</span>
                        </button>
                      )}

                      {customer.type !== 'ONLINE_BOOKING' ? (
                        <button
                          onClick={() => handleRemoveFromQueue(customer.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Remove walk-in"
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={() => openCancelModal(customer)}
                          className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Cancel online booking"
                        >
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Summary Stats Strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
              <span className="text-[11px] sm:text-xs font-medium">Total Waiting</span>
              <Users size={14} className="text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900">{queue.length}</div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
              <span className="text-[11px] sm:text-xs font-medium">Online Paid</span>
              <CreditCard size={14} className="text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {queue.filter((c) => c.type === 'ONLINE_BOOKING').length}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
              <span className="text-[11px] sm:text-xs font-medium">Walk-ins</span>
              <UserCheck size={14} className="text-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">
              {queue.filter((c) => c.type === 'WALK_IN').length}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-0.5 sm:mb-1">
              <span className="text-[11px] sm:text-xs font-medium">Chairs Active</span>
              <Armchair size={14} className="text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-800">
              {inProgressEntries.length}/{totalChairs}
            </div>
          </div>
        </div>

      </div>

      {/* ── Modal: Add Walk-in ── */}
      {showAddWalkin && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add Walk-in Customer</h3>
              <button
                onClick={() => setShowAddWalkin(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Customer Name */}
            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5 sm:mb-1.5">
                Customer Name
              </label>
              <input
                type="text"
                value={walkinData.customerName}
                onChange={(e) => setWalkinData({ ...walkinData, customerName: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-slate-900 focus:outline-none transition-colors text-sm text-slate-800"
                autoFocus
              />
            </div>

            {/* Service Selection */}
            <div className="mb-5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Select Service
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {services.map((service) => {
                  const isSelected = walkinData.serviceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setWalkinData({ ...walkinData, serviceId: service.id })}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm leading-tight">{service.name}</div>
                        <div
                          className={`text-xs mt-0.5 font-mono ${
                            isSelected ? 'text-slate-300' : 'text-slate-400'
                          }`}
                        >
                          {service.durationMinutes || service.duration} mins
                        </div>
                      </div>
                      <div className="font-bold text-sm">₹{service.price}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowAddWalkin(false);
                  setWalkinData({ customerName: '', serviceId: null });
                }}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-xs text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWalkin}
                disabled={!walkinData.customerName.trim() || !walkinData.serviceId}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold text-xs shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Add to Queue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Cancel Online Booking ── */}
      {cancelModal.open && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl border border-slate-200">
            <div className="flex items-center gap-2.5 mb-3 text-amber-600">
              <AlertCircle size={22} />
              <h3 className="text-lg font-bold text-slate-900">Cancel Online Booking</h3>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200/80 text-xs">
              <p className="text-slate-500 mb-0.5">Booking for:</p>
              <p className="font-bold text-slate-800 text-sm">
                {cancelModal.queueEntry?.customerName}
              </p>
              <p className="text-slate-500 mt-0.5">
                {cancelModal.queueEntry?.serviceName} ({cancelModal.queueEntry?.estimatedDurationMinutes} mins)
              </p>
            </div>

            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select reason for cancellation:
            </p>
            <div className="space-y-1.5 mb-5">
              {CANCEL_REASONS.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setCancelModal((prev) => ({ ...prev, reason: r.key }))}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                    cancelModal.reason === r.key
                      ? 'border-amber-500 bg-amber-50 text-amber-900 font-semibold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">{r.label}</div>
                  <div className="text-[11px] text-slate-500">{r.description}</div>
                </button>
              ))}
            </div>

            <div className="flex gap-2.5">
              <button
                onClick={closeCancelModal}
                disabled={cancelModal.loading}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 font-semibold text-xs text-slate-600 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleCancelOnlineBooking}
                disabled={!cancelModal.reason || cancelModal.loading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold text-xs shadow-sm transition-all disabled:opacity-40"
              >
                {cancelModal.loading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
