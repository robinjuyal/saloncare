import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoadingSpinner from './components/LoadingSpinner';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import CustomerHome from './pages/CustomerHome';
import SalonDetails from './pages/SalonDetails';
import MyBookings from './pages/MyBookings';
import MySalon from './pages/MySalon';

// Admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSalons from './pages/admin/AdminSalons';
import AdminSalonDetail from './pages/admin/AdminSalonDetail';
import AdminUsers from './pages/admin/AdminUsers';
import AdminBookings from './pages/admin/AdminBookings';
import AdminPayments from './pages/admin/AdminPayments';
import AdminQueues from './pages/admin/AdminQueues';
import AdminConfig from './pages/admin/AdminConfig';
import DashboardWrapper from './pages/DashboardWrapper';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner message="Loading..." />;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const AppContent = () => {
  const { user } = useAuth();

  const getDefaultRoute = () => {
    if (!user) return <Navigate to="/login" />;
    if (user.role === 'ADMIN')        return <Navigate to="/admin" />;
    if (user.role === 'CUSTOMER')     return <Navigate to="/home" />;
    if (user.role === 'SALON_OWNER' || user.role === 'BARBER') return <Navigate to="/dashboard" />;
    return <Navigate to="/login" />;
  };

  // Admin layout has its own sidebar — no global Navbar for admin
  const isAdmin = user?.role === 'ADMIN';

  return (
    <>
      {user && !isAdmin && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/login"  element={user ? getDefaultRoute() : <Login />} />
        <Route path="/signup" element={user ? getDefaultRoute() : <Signup />} />

        {/* Customer */}
        <Route path="/home" element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}><CustomerHome /></ProtectedRoute>
        } />
        <Route path="/salon/:id" element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}><SalonDetails /></ProtectedRoute>
        } />
        <Route path="/my-bookings" element={
          <ProtectedRoute allowedRoles={['CUSTOMER']}><MyBookings /></ProtectedRoute>
        } />

        {/* Salon Owner / Barber */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['SALON_OWNER']}>
            <DashboardWrapper />
          </ProtectedRoute>
        } />
        <Route path="/my-salon" element={
          <ProtectedRoute allowedRoles={['SALON_OWNER']}><MySalon /></ProtectedRoute>
        } />

        {/* ── Admin (nested, uses AdminLayout with sidebar) ── */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['ADMIN']}><AdminLayout /></ProtectedRoute>
        }>
          <Route index          element={<AdminDashboard />} />
          <Route path="salons"  element={<AdminSalons />} />
          <Route path="salons/:id" element={<AdminSalonDetail />} />
          <Route path="users"   element={<AdminUsers />} />
          <Route path="bookings" element={<AdminBookings />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="queues"  element={<AdminQueues />} />
          <Route path="config"  element={<AdminConfig />} />
        </Route>

        {/* Default */}
        <Route path="/"  element={getDefaultRoute()} />
        <Route path="*"  element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;