import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { UserPlus, User, Mail, Phone, Lock, Scissors, AlertCircle } from 'lucide-react';

export default function Signup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.signup(formData);
      login(response.data.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-paper min-h-screen flex items-center justify-center p-4 py-10 font-body">
      <div className="bg-paper-card border border-ink/10 rounded-[2rem] p-8 sm:p-10 w-full max-w-md">
        <div className="text-center mb-7">
          <div className="w-14 h-14 bg-rose rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose/30 rotate-3">
            <Scissors size={24} className="text-white -rotate-3" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold text-ink">
            Join SalonQueue
          </h1>
          <p className="text-ink/50 mt-1.5 text-sm">Create your account in under a minute</p>
        </div>

        {error && (
          <div className="bg-rose/10 border border-rose/30 text-rose px-4 py-3 rounded-xl mb-5 flex items-center gap-2 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink/50 uppercase tracking-wide mb-2">Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={19} />
              <input type="text" value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="bg-paper-card border border-ink/15 w-full pl-11 pr-4 py-3.5 rounded-xl focus:border-rose/60 focus:outline-none transition-colors text-sm text-ink placeholder:text-ink/35"
                placeholder="Your full name" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink/50 uppercase tracking-wide mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={19} />
              <input type="email" value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="bg-paper-card border border-ink/15 w-full pl-11 pr-4 py-3.5 rounded-xl focus:border-rose/60 focus:outline-none transition-colors text-sm text-ink placeholder:text-ink/35"
                required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink/50 uppercase tracking-wide mb-2">Phone</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={19} />
              <input type="tel" value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="bg-paper-card border border-ink/15 w-full pl-11 pr-4 py-3.5 rounded-xl focus:border-rose/60 focus:outline-none transition-colors text-sm text-ink placeholder:text-ink/35"
                placeholder="10-digit number" pattern="[0-9]{10}" required />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink/50 uppercase tracking-wide mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" size={19} />
              <input type="password" value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="bg-paper-card border border-ink/15 w-full pl-11 pr-4 py-3.5 rounded-xl focus:border-rose/60 focus:outline-none transition-colors text-sm text-ink placeholder:text-ink/35"
                placeholder="Min 6 characters" required />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-rose hover:bg-rose-dark text-white py-4 rounded-2xl font-bold text-base transition-all transform active:scale-[0.98] shadow-lg shadow-rose/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none mt-2">
            <UserPlus size={19} />
            {loading ? 'Creating Account…' : 'Sign Up'}
          </button>

          <p className="text-center text-xs text-ink/40 mt-3">
            By signing up, you agree to our{' '}
            <Link to="/terms" className="text-ink/60 hover:text-rose underline underline-offset-2 transition-colors">
              Terms & Conditions
            </Link>
          </p>
        </form>

        <div className="mt-7 text-center">
          <p className="text-ink/50 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-rose font-bold hover:text-rose-dark transition-colors">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
