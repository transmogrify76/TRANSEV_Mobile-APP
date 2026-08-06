import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { FaHome, FaUserEdit, FaSave, FaTimes, FaSpinner } from 'react-icons/fa';
import { getMe, updateProfile } from '../services/customerApi';
import { getMeCached, setMe } from '../services/session';
import { AuthApiError } from '../types/auth';

interface ProfileFormData {
  name: string;
  phone: string;
}

const UserProfile: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [savedData, setSavedData] = useState<ProfileFormData>({ name: '', phone: '' });
  const [formData, setFormData] = useState<ProfileFormData>({ name: '', phone: '' });
  const [editMode, setEditMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyMe = (name: string, phone: string, emailAddr: string) => {
    setSavedData({ name, phone });
    setFormData({ name, phone });
    setEmail(emailAddr);
  };

  useEffect(() => {
    const fetchProfileDetails = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        // Show cached data instantly if we have it, then refresh from the server.
        const cached = getMeCached();
        if (cached) {
          applyMe(cached.user.full_name, cached.user.phone || '', cached.user.email);
        }
        const me = await getMe();
        setMe(me);
        applyMe(me.user.full_name, me.user.phone || '', me.user.email);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setErrorMessage('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfileDetails();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const describeError = (error: unknown, fallback: string) => {
    if (error instanceof AuthApiError) {
      switch (error.code) {
        case 'invalid_full_name':
          return 'Please enter a valid name (1-255 characters).';
        case 'invalid_phone':
          return 'Please enter a valid phone number (7-15 digits, optional leading +).';
        case 'cpo_app_id_mismatch':
          return 'App configuration mismatch. Please contact support.';
        default:
          return error.message || fallback;
      }
    }
    return fallback;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const updated = await updateProfile({
        full_name: formData.name,
        phone: formData.phone || null,
      });

      // PATCH /profile returns just the CustomerUser projection - merge it
      // into the cached CustomerMe bootstrap rather than replacing it whole.
      const cached = getMeCached();
      if (cached) {
        setMe({ ...cached, user: updated });
      }

      applyMe(updated.full_name, updated.phone || '', updated.email);
      setEditMode(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Update error:', error);
      setErrorMessage(describeError(error, 'Failed to update profile. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = () => {
    setEditMode(true);
    setFormData(savedData);
  };

  const handleCancelClick = () => {
    setEditMode(false);
    setFormData(savedData);
    setErrorMessage('');
  };

  const getInitials = () =>
    savedData.name
      ? savedData.name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U';

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-brand-50 via-white to-blue-50 flex items-center justify-center px-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
        <p className="ml-3 text-brand-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-brand-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <button
          onClick={() => history.push('/dashboard')}
          className="absolute -top-2 left-0 p-3 bg-brand-600 rounded-full shadow-lg hover:bg-brand-700 transition-all duration-200 z-10"
          aria-label="Back to dashboard"
        >
          <FaHome className="text-white text-lg" />
        </button>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-8 text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden border-4 border-white">
                <div className="w-full h-full bg-brand-100 flex items-center justify-center text-brand-700 text-3xl font-bold">
                  {getInitials()}
                </div>
              </div>
            </div>
            <h2 className="mt-4 text-xl sm:text-2xl font-bold text-white">My Profile</h2>
            <p className="text-brand-100 text-sm">Manage your account details</p>
          </div>

          <div className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  required
                  maxLength={255}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-300 transition ${
                    editMode
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={email}
                  disabled
                  title="Email can't be changed from the app yet."
                  className="w-full px-4 py-2 border rounded-lg bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Email can't be changed from the app yet.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={!editMode}
                  placeholder="+919876543210"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-300 transition ${
                    editMode
                      ? 'bg-white border-gray-300 text-gray-900'
                      : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                />
              </div>

              {successMessage && (
                <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                  <p className="text-green-700 text-sm">{successMessage}</p>
                </div>
              )}
              {errorMessage && (
                <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
                  <p className="text-red-700 text-sm">{errorMessage}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {editMode ? (
                  <>
                    <button
                      type="button"
                      onClick={handleCancelClick}
                      className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center justify-center gap-2"
                      disabled={isSubmitting}
                    >
                      <FaTimes /> Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !formData.name.trim()}
                      className="flex-1 py-2 px-4 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleEditClick}
                    className="w-full py-2 px-4 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition flex items-center justify-center gap-2"
                  >
                    <FaUserEdit /> Edit Profile
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
