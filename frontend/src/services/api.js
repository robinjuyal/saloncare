import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws';


const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  }, 
  (error) => Promise.reject(error)
);

// Guards against every simultaneous 401 (a page can fire several requests
// at once — salon details, services, queue, reviews, etc.) each trying to
// clear storage and redirect independently. Only the first one actually acts.
let sessionExpiredHandled = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !sessionExpiredHandled) {
      sessionExpiredHandled = true;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // replace() rather than assigning href — this is a forced logout, not
      // a normal navigation, so it shouldn't leave a "back" entry that
      // returns to a now-broken authenticated page.
      window.location.replace('/login?expired=1');
    }
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login:  (data) => api.post('/auth/login', data),
};

export const salonAPI = {
  searchNearby: (latitude, longitude, radiusKm = 10) =>
    api.get('/salons/search/nearby', { params: { latitude, longitude, radiusKm } }),
  getById:      (id)   => api.get(`/salons/${id}`),
  create:       (data) => api.post('/salons', data),
  getMySalon:   ()     => api.get('/salons/my-salon'),
  searchByName: (query) => api.get('/salons/search/name', { params: { query } }),
  updateChairs: (id, totalChairs) => api.patch(`/salons/${id}/chairs`, { totalChairs }),
};

export const serviceAPI = {
  getBySalon: (salonId)       => api.get(`/services/salon/${salonId}`),
  create:     (salonId, data) => api.post(`/services/salon/${salonId}`, data),
  update:     (id, data)      => api.put(`/services/${id}`, data),
  delete:     (id)            => api.delete(`/services/${id}`),
};

export const queueAPI = {
  getQueue:        (salonId)       => api.get(`/queue/salon/${salonId}`),
  addWalkIn:       (data)          => api.post('/queue/walkin', data),
  startService:    (queueEntryId)  => api.post(`/queue/${queueEntryId}/start`),
  completeService: (queueEntryId)  => api.post(`/queue/${queueEntryId}/complete`),
  removeFromQueue: (queueEntryId)  => api.delete(`/queue/${queueEntryId}`),
  cancelOnlineBooking: (queueEntryId, reason) =>
    api.post(`/queue/${queueEntryId}/cancel-booking`, { reason }),
  getWaitTime: (salonId) => api.get(`/queue/salon/${salonId}/wait-time`),
};

export const bookingAPI = {
  getMyBookings: ()    => api.get('/bookings/customer'),
};

export const paymentAPI = {
  // Step 1: Create Razorpay order + pending booking
  createOrder: (data) => api.post('/payments/create-order', data),

  // Step 2B: Verify payment after Razorpay popup succeeds
  verify: (data) => api.post('/payments/verify', data),

  // Poll payment status (for webhook delay fallback)
  getStatus: (razorpayOrderId) => api.get(`/payments/status/${razorpayOrderId}`),
};

export const adminAPI = {
  // Analytics
  getSummary: () => api.get('/admin/analytics/summary'),

  // Salons
  getSalons:       (status) => api.get('/admin/salons', { params: { status } }),
  getSalonDetail:  (id)     => api.get(`/admin/salons/${id}`),
  registerSalon:   (data)   => api.post('/admin/salons', data),
  approveSalon:    (id)     => api.put(`/admin/salons/${id}/approve`),
  rejectSalon:     (id, reason) => api.put(`/admin/salons/${id}/reject`, { reason }),
  toggleSalon:     (id)     => api.put(`/admin/salons/${id}/toggle`),
  updateCoords:    (id, latitude, longitude) =>
                               api.put(`/admin/salons/${id}/coords`, { latitude, longitude }),

  // Users
  getUsers:    (role) => api.get('/admin/users', { params: { role } }),
  toggleUser:  (id)  => api.put(`/admin/users/${id}/toggle`),

  // Bookings
  getBookings: (status, salonId) =>
                         api.get('/admin/bookings', { params: { status, salonId } }),

  // Payments
  getPayments:   (status) => api.get('/admin/payments', { params: { status } }),
  initiateRefund: (id, reason) =>
                         api.post(`/admin/payments/${id}/refund`, { reason }),

  // Live queue
  getLiveQueues: () => api.get('/admin/queue/live'),

  // Config
  getConfig:    ()          => api.get('/admin/config'),
  updateConfig: (key, value) => api.put(`/admin/config/${key}`, { value }),
};

// ── ADD TO api.js (after paymentAPI, before adminAPI) ────────────────────────
export const reviewAPI = {
  getSalonReviews: (salonId)              => api.get(`/reviews/salon/${salonId}`),
  getReviewStatus: (salonId)              => api.get(`/reviews/status/${salonId}`),
  submitReview:    (salonId, rating, comment) =>
                     api.post(`/reviews/salon/${salonId}`, { rating, comment }),
};

export const ownerAPI = {
  getStatus:  (salonId)                  => api.get(`/owner/salon/${salonId}/status`),
  toggleShop: (salonId)                  => api.put(`/owner/salon/${salonId}/toggle`),
  getToday:   (salonId)                  => api.get(`/owner/salon/${salonId}/analytics/today`),
  getRange:   (salonId, from, to)        =>
    api.get(`/owner/salon/${salonId}/analytics/range`, { params: { from, to } }),
};

export default api;