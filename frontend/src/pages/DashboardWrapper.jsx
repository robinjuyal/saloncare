import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { salonAPI } from '../services/api';
import OwnerDashboard from '../components/OwnerDashboard';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Resolves the correct salonId for the logged-in SALON_OWNER
 * before rendering the dashboard.
 *
 * Calls GET /api/salons/my-salon (JWT identifies the owner)
 * and passes the real salonId down to BarberDashboard.
 */
export default function DashboardWrapper() {
  const { user } = useAuth();
  const [salonId, setSalonId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    salonAPI.getMySalon()
      .then(r => {
        const salon = r.data.data;
        if (salon?.id) {
          setSalonId(salon.id);
        } else {
          setError('no_salon');
        }
        setLoading(false);
      })
      .catch((err) => {
        // A 401 here means the JWT expired — the global axios interceptor
        // is already clearing storage and redirecting to /login. Showing
        // our own "Failed to load salon" screen at the same time used to
        // race that redirect and could leave someone stuck on a broken
        // screen instead of actually reaching the login page. Deliberately
        // NOT calling setLoading(false) here — staying on the spinner is
        // safer than falling through to render OwnerDashboard with a null
        // salonId in the brief window before the redirect actually happens.
        if (err.response?.status !== 401) {
          setError('fetch_failed');
          setLoading(false);
        }
      });
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  if (error === 'no_salon') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="text-5xl mb-4">✂️</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No salon found</h2>
          <p className="text-slate-500">
            Your account doesn't have a salon linked yet.
            Please contact our team to get your salon set up.
          </p>
        </div>
      </div>
    );
  }

  if (error === 'fetch_failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Failed to load salon</h2>
          <p className="text-slate-500 mb-4">Could not fetch your salon details. Please refresh.</p>
          <button onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <OwnerDashboard salonId={salonId} />;
}