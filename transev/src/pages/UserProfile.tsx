import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { FaArrowLeft, FaUserEdit, FaSave, FaTimes, FaSpinner, FaEnvelope, FaPhone } from 'react-icons/fa';
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

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-brand-50 via-white to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-ink-100/60">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => history.push('/dashboard')}
            className="p-2.5 rounded-full bg-ink-50 text-ink-700 hover:bg-ink-100 transition flex-shrink-0"
            aria-label="Back to dashboard"
          >
            <FaArrowLeft className="text-base" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight">My Profile</h1>
            <p className="text-xs sm:text-sm text-ink-400">Manage your account details</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-6 pb-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <FaSpinner className="animate-spin text-brand-600 text-2xl mr-3" />
            <p className="text-ink-400">Loading profile...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2.5xl shadow-soft overflow-hidden">
            <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-8 text-center">
              <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full bg-white shadow-lg flex items-center justify-center overflow-hidden border-4 border-white">
                <div className="w-full h-full bg-brand-100 flex items-center justify-center text-brand-700 text-3xl font-bold">
                  {getInitials()}
                </div>
              </div>
              <h2 className="mt-4 text-lg sm:text-xl font-bold text-white truncate">{savedData.name || 'Your Profile'}</h2>
              <p className="text-brand-100 text-sm truncate">{email}</p>
            </div>

            <div className="p-5 sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-ink-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    required
                    maxLength={255}
                    className={`w-full px-4 py-2.5 rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent ${
                      editMode
                        ? 'bg-white border-ink-100 text-ink-900 shadow-sm'
                        : 'bg-ink-50 border-transparent text-ink-500 cursor-not-allowed'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-700 mb-1.5 flex items-center gap-1.5">
                    <FaEnvelope className="text-ink-300 text-xs" /> Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    disabled
                    title="Email can't be changed from the app yet."
                    className="w-full px-4 py-2.5 rounded-xl border border-transparent bg-ink-50 text-ink-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-ink-300 mt-1.5">Email can't be changed from the app yet.</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-ink-700 mb-1.5 flex items-center gap-1.5">
                    <FaPhone className="text-ink-300 text-xs" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    placeholder="+919876543210"
                    className={`w-full px-4 py-2.5 rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent ${
                      editMode
                        ? 'bg-white border-ink-100 text-ink-900 shadow-sm'
                        : 'bg-ink-50 border-transparent text-ink-500 cursor-not-allowed'
                    }`}
                  />
                </div>

                {successMessage && (
                  <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                    <p className="text-green-700 text-sm">{successMessage}</p>
                  </div>
                )}
                {errorMessage && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <p className="text-red-700 text-sm">{errorMessage}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  {editMode ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelClick}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 px-4 bg-ink-50 text-ink-700 font-semibold rounded-xl hover:bg-ink-100 transition flex items-center justify-center gap-2"
                      >
                        <FaTimes /> Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !formData.name.trim()}
                        className="flex-1 py-2.5 px-4 bg-brand-600 text-white font-semibold rounded-xl shadow-glow hover:bg-brand-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isSubmitting ? <FaSpinner className="animate-spin" /> : <FaSave />}
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleEditClick}
                      className="w-full py-2.5 px-4 bg-brand-600 text-white font-semibold rounded-xl shadow-glow hover:bg-brand-700 transition flex items-center justify-center gap-2"
                    >
                      <FaUserEdit /> Edit Profile
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;