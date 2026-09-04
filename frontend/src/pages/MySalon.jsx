import React, { useState, useEffect } from 'react';
import { salonAPI, serviceAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { Store, MapPin, Clock, Phone, Mail, Edit, Plus, Trash2, Save, X } from 'lucide-react';

export default function MySalon() {
  const [salon, setSalon] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateSalon, setShowCreateSalon] = useState(false);
  const [editingServices, setEditingServices] = useState(false);
  const [salonForm, setSalonForm] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    openingTime: '09:00',
    closingTime: '20:00',
    totalChairs: 1,
  });

  useEffect(() => {
    loadMySalon();
  }, []);

  const loadMySalon = async () => {
    setLoading(true);
    try {
      const response = await salonAPI.getMySalon();
      if (response.data.data) {
        setSalon(response.data.data);
        // Load services for this salon
        loadServices(response.data.data.id);
      }
    } catch (error) {
      console.error('Error loading salon:', error);
      // No salon found - show create option
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async (salonId) => {
    try {
      const response = await serviceAPI.getBySalon(salonId);
      setServices(response.data.data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      // Fallback to default services
      setServices([
        { id: 1, name: 'Haircut', price: 150, durationMinutes: 30, category: 'HAIRCUT' },
        { id: 2, name: 'Beard Trim', price: 100, durationMinutes: 20, category: 'BEARD' },
        { id: 3, name: 'Hair + Beard', price: 200, durationMinutes: 40, category: 'HAIR_AND_BEARD' },
      ]);
    }
  };

  const handleCreateSalon = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!salonForm.name.trim()) {
      alert('Salon name is required');
      return;
    }
    if (!salonForm.phone.match(/^[0-9]{10}$/)) {
      alert('Phone must be 10 digits');
      return;
    }
    if (!salonForm.pincode.match(/^[0-9]{6}$/)) {
      alert('Pincode must be 6 digits');
      return;
    }

    try {
      const response = await salonAPI.create(salonForm);
      setSalon(response.data.data);
      setShowCreateSalon(false);
      alert('Salon created successfully!');
      
      // Load services for new salon
      if (response.data.data.id) {
        loadServices(response.data.data.id);
      }
    } catch (error) {
      console.error('Error creating salon:', error);
      alert(error.response?.data?.message || 'Failed to create salon');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your salon..." />;
  }

  // Show create salon if no salon exists
  if (!salon && !showCreateSalon) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-md w-full text-center">
          <Store size={64} className="mx-auto text-blue-600 mb-6" />
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Create Your Salon</h2>
          <p className="text-slate-600 mb-8">
            Set up your salon profile to start accepting bookings and managing your queue
          </p>
          <button
            onClick={() => setShowCreateSalon(true)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2"
          >
            <Plus size={24} />
            Create Salon
          </button>
        </div>
      </div>
    );
  }

  // Show create salon form
  if (showCreateSalon) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Create Your Salon</h1>

            <form onSubmit={handleCreateSalon} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Salon Name *
                  </label>
                  <input
                    type="text"
                    value={salonForm.name}
                    onChange={(e) => setSalonForm({...salonForm, name: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                    placeholder="e.g., Luxury Hair Studio"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Address *
                  </label>
                  <input
                    type="text"
                    value={salonForm.address}
                    onChange={(e) => setSalonForm({...salonForm, address: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                    placeholder="Street address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">City *</label>
                  <input
                    type="text"
                    value={salonForm.city}
                    onChange={(e) => setSalonForm({...salonForm, city: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">State *</label>
                  <input
                    type="text"
                    value={salonForm.state}
                    onChange={(e) => setSalonForm({...salonForm, state: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Pincode *</label>
                  <input
                    type="text"
                    value={salonForm.pincode}
                    onChange={(e) => setSalonForm({...salonForm, pincode: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    pattern="[0-9]{6}"
                    required
                    placeholder="123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={salonForm.phone}
                    onChange={(e) => setSalonForm({...salonForm, phone: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    pattern="[0-9]{10}"
                    required
                    placeholder="9876543210"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-2">Email (optional)</label>
                  <input
                    type="email"
                    value={salonForm.email}
                    onChange={(e) => setSalonForm({...salonForm, email: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="salon@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Opening Time *</label>
                  <input
                    type="time"
                    value={salonForm.openingTime}
                    onChange={(e) => setSalonForm({...salonForm, openingTime: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Closing Time *</label>
                  <input
                    type="time"
                    value={salonForm.closingTime}
                    onChange={(e) => setSalonForm({...salonForm, closingTime: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Number of Chairs *</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={salonForm.totalChairs}
                    onChange={(e) => setSalonForm({...salonForm, totalChairs: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowCreateSalon(false)}
                  className="flex-1 px-6 py-3 border-2 border-slate-300 rounded-xl hover:bg-slate-50 transition font-bold flex items-center justify-center gap-2"
                >
                  <X size={20} />
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Create Salon
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Show existing salon
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          My Salon
        </h1>

        {/* Salon Info Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">{salon.name}</h2>
              <div className="space-y-2 text-slate-700">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-blue-600" />
                  <span>{salon.address}, {salon.city}, {salon.state} - {salon.pincode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={18} className="text-blue-600" />
                  <span>{salon.phone}</span>
                </div>
                {salon.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={18} className="text-blue-600" />
                    <span>{salon.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-blue-600" />
                  <span>{salon.openingTime} - {salon.closingTime}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Store size={18} className="text-blue-600" />
                  <span>{salon.totalChairs} Chair{salon.totalChairs > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition font-bold"
              onClick={() => alert('Edit functionality coming soon!')}
            >
              <Edit size={18} />
              Edit
            </button>
          </div>

          {/* Salon Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{salon.currentQueueSize || 0}</div>
              <div className="text-sm text-slate-600">Current Queue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{salon.totalReviews || 0}</div>
              <div className="text-sm text-slate-600">Total Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{salon.rating || '0.0'} ⭐</div>
              <div className="text-sm text-slate-600">Rating</div>
            </div>
          </div>
        </div>

        {/* Services Management */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Services ({services.length})</h2>
            <button 
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-bold"
              onClick={() => alert('Add service functionality coming soon!')}
            >
              <Plus size={20} />
              Add Service
            </button>
          </div>

          {services.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Store size={48} className="mx-auto mb-3 opacity-50" />
              <p className="text-lg">No services added yet</p>
              <p className="text-sm">Add your first service to start accepting bookings</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {services.map((service) => (
                <div key={service.id} className="border-2 border-slate-200 rounded-xl p-5 hover:border-blue-300 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{service.name}</h3>
                      <div className="flex gap-4 text-sm text-slate-600 mt-1">
                        <span className="font-bold text-green-600">₹{service.price}</span>
                        <span>•</span>
                        <span>{service.durationMinutes} min</span>
                        <span>•</span>
                        <span className="text-blue-600 font-medium">{service.category}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        className="p-2 hover:bg-blue-50 rounded-lg transition"
                        onClick={() => alert('Edit service coming soon!')}
                      >
                        <Edit size={20} className="text-blue-600" />
                      </button>
                      <button 
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this service?')) {
                            alert('Delete service coming soon!');
                          }
                        }}
                      >
                        <Trash2 size={20} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}