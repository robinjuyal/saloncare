import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { LogIn, User, Lock, Scissors, AlertCircle } from 'lucide-react';

export default function Login() {
  const [formData, setFormData] = useState({ emailOrPhone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      login(response.data.data);
      navigate(response.data.data.role === 'SALON_OWNER' ? '/dashboard' : '/');
    } catch (err) {
      if (!err.response) {
        setError('Cannot connect to backend server. Please verify your connection.');
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-paper min-h-screen flex items-center justify-center p-4 font-body">
      <div className="bg-paper-card border border-ink/10 rounded-[2rem] p-8 sm:p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-rose rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose/30 rotate-3">
            <Scissors size={24} className="text-white -rotate-3" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-ink">
            SalonQueue
          </h1>
          <p className="text-ink/50 mt-1.5 text-sm">Welcome back — let's get you to the front of the line</p>
        </div>

        {error && (
          <div className="bg-rose/10 border border-rose/30 text-rose px-4 py-3 rounded-xl mb-5 flex items-center gap-2 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink/50 uppercase tracking-wide mb-2">
              Email or Phone
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={19} />
              <input
                type="text"
                value={formData.emailOrPhone}
                onChange={(e) => setFormData({...formData, emailOrPhone: e.target.value})}
                className="bg-paper-card border border-ink/15 w-full pl-11 pr-4 py-3.5 rounded-xl focus:border-rose/60 focus:outline-none transition-colors text-sm text-ink placeholder:text-ink/35"
                placeholder="Enter email or phone"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink/50 uppercase tracking-wide mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={19} />
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="bg-paper-card border border-ink/15 w-full pl-11 pr-4 py-3.5 rounded-xl focus:border-rose/60 focus:outline-none transition-colors text-sm text-ink placeholder:text-ink/35"
                placeholder="Enter password"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose hover:bg-rose-dark text-white py-4 rounded-2xl font-bold text-base transition-all transform active:scale-[0.98] shadow-lg shadow-rose/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none mt-2"
          >
            <LogIn size={19} />
            {loading ? 'Logging in…' : 'Login'}
          </button>
        </form>

        <div className="mt-7 text-center">
          <p className="text-ink/50 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-rose font-bold hover:text-rose-dark transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
