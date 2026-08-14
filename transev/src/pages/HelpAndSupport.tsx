import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { FaArrowLeft, FaHeadset, FaPaperPlane, FaHistory } from 'react-icons/fa';

const HelpAndSupport: React.FC = () => {
  const history = useHistory();
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [userMessage, setUserMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await axios.post(
        'https://be.cms.ocpp.transev.site/admin/has',
        {
          name,
          email,
          phonenumber: phoneNumber,
          usermessage: userMessage,
        },
        {
          headers: {
            apiauthkey: 'aBcD1eFgH2iJkLmNoPqRsTuVwXyZ012345678jasldjalsdjurewouroewiru',
          },
        }
      );

      setSuccessMessage(response.data.message);
      setName('');
      setEmail('');
      setPhoneNumber('');
      setUserMessage('');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || 'An error occurred. Please try again.');
      } else {
        setErrorMessage('An error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <h1 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight">Help &amp; Support</h1>
            <p className="text-xs sm:text-sm text-ink-400">We usually reply within a day</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-6 pb-10">
        <div className="bg-white rounded-2.5xl shadow-soft p-5 sm:p-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
            <FaHeadset className="text-xl text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-ink-900 mb-1">Send us a message</h2>
          <p className="text-sm text-ink-400 mb-5">
            Tell us what's going on and we'll get back to you at the email or number you provide.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1.5">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="block w-full px-4 py-2.5 border border-ink-100 rounded-xl bg-ink-50 focus:bg-white text-ink-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="block w-full px-4 py-2.5 border border-ink-100 rounded-xl bg-ink-50 focus:bg-white text-ink-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="block w-full px-4 py-2.5 border border-ink-100 rounded-xl bg-ink-50 focus:bg-white text-ink-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition"
                placeholder="+91 98765 43210"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink-700 mb-1.5">Your Message</label>
              <textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                required
                rows={4}
                className="block w-full px-4 py-2.5 border border-ink-100 rounded-xl bg-ink-50 focus:bg-white text-ink-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition resize-none"
                placeholder="Describe the issue you're facing..."
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-2xl shadow-glow transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <FaPaperPlane className="text-sm" />
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        <button
          onClick={() => history.push('/viewhelp')}
          className="w-full mt-4 bg-white border border-ink-100 text-ink-700 font-semibold py-3 rounded-2xl shadow-soft hover:bg-ink-50 transition flex items-center justify-center gap-2"
        >
          <FaHistory className="text-sm text-ink-400" />
          Past Messages
        </button>
      </div>
    </div>
  );
};

export default HelpAndSupport;