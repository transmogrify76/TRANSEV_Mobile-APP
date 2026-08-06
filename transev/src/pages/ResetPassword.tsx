import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { forgotPassword, resendPasswordReset, resetPassword } from '../services/authApi';
import { AuthApiError } from '../types/auth';

// The forgot-password endpoint is enumeration-safe: it always returns the
// same generic 202 message and never includes the challenge id in the HTTP
// response. The recovery id + OTP code only arrive by email, so step 2 asks
// the user to enter both (or follow an email deep link that pre-fills them).
const ResetPassword: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const describeError = (error: unknown, fallback: string) => {
    if (error instanceof AuthApiError) {
      switch (error.code) {
        case 'invalid_challenge':
          return 'That recovery code is invalid or expired. Please request a new one.';
        case 'rate_limited':
          return 'Too many attempts. Please wait a moment and try again.';
        case 'mail_unavailable':
          return 'Email delivery is temporarily unavailable. Please try again shortly.';
        case 'invalid_password':
          return 'Password must be 10-128 characters.';
        default:
          return error.message || fallback;
      }
    }
    return fallback;
  };

  const handleOtpRequest = async () => {
    if (!email) {
      setMessage('Please enter your email');
      return;
    }

    try {
      setIsLoading(true);
      const result = await forgotPassword(email);
      setMessage(result.message || 'If the account is eligible, a recovery code has been emailed to you.');
      setStep(2);
    } catch (error) {
      setMessage(describeError(error, 'Failed to send recovery email. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!challengeId || otp.some((digit) => !digit) || !newPassword) {
      setMessage('Please enter the recovery ID, the code from your email, and a new password.');
      return;
    }

    try {
      setIsLoading(true);
      const result = await resetPassword(challengeId, otp.join(''), newPassword);
      setMessage(result.message || 'Password reset successfully. You can now log in.');

      setTimeout(() => {
        history.push('/login');
      }, 2000);
    } catch (error) {
      setMessage(describeError(error, 'Failed to reset password. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!challengeId) {
      setMessage('Enter the recovery ID from your email first, then you can request a new code.');
      return;
    }
    try {
      setIsLoading(true);
      const challenge = await resendPasswordReset(challengeId);
      setChallengeId(challenge.challenge_id);
      setOtp(Array(6).fill(''));
      setMessage('A new recovery code has been emailed to you.');
    } catch (error) {
      setMessage(describeError(error, 'Could not resend the code. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    } else if (!value && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-brand-100 via-brand-200 to-blue-100">
      <div className="w-full max-w-md bg-white bg-opacity-60 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-center text-brand-800 mb-6">Reset Password</h2>
        {message && <p className="text-center text-red-500 mb-4">{message}</p>}
        {step === 1 ? (
          <>
            {/* Request recovery email */}
            <div>
              <label className="block text-lg font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                placeholder="Enter your email"
              />
            </div>
            <button
              className="w-full mt-6 bg-brand-500 text-white font-bold py-3 rounded-full shadow-lg hover:bg-brand-600 transition duration-300 ease-in-out disabled:opacity-60"
              onClick={handleOtpRequest}
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Recovery Email'}
            </button>
          </>
        ) : (
          <>
            {/* Verify recovery code and reset password */}
            <p className="text-sm text-gray-600 mb-4 text-center">
              Check your email for a recovery ID and a 6-digit code, then enter them below.
            </p>
            <div>
              <label className="block text-lg font-medium text-gray-700">Recovery ID</label>
              <input
                type="text"
                value={challengeId}
                onChange={(e) => setChallengeId(e.target.value.trim())}
                required
                className="mt-2 mb-4 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                placeholder="From your recovery email"
              />
            </div>
            <div className="mb-6 flex justify-between">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-input-${index}`}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  maxLength={1}
                  className="w-12 h-12 p-2 text-center text-xl font-bold text-gray-800 bg-white border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                />
              ))}
            </div>
            <div>
              <label className="block text-lg font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={10}
                maxLength={128}
                className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                placeholder="Enter new password (10-128 characters)"
              />
            </div>
            <button
              className="w-full mt-6 bg-brand-500 text-white font-bold py-3 rounded-full shadow-lg hover:bg-brand-600 transition duration-300 ease-in-out disabled:opacity-60"
              onClick={handlePasswordReset}
              disabled={isLoading}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
            <div className="mt-4 flex justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-gray-600 hover:underline"
                disabled={isLoading}
              >
                Use a different email
              </button>
              <button
                type="button"
                onClick={handleResend}
                className="text-brand-600 font-semibold hover:underline"
                disabled={isLoading}
              >
                Resend code
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
