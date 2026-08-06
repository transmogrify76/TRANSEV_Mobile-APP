import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { resendLoginOtp, startLogin, verifyLogin } from '../services/authApi';
import { getMe } from '../services/customerApi';
import { isAuthenticated, setMe, setSession } from '../services/session';
import { AuthApiError } from '../types/auth';

const Login: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated()) {
      history.push('/dashboard');
    }
  }, [history]);

  const describeError = (error: unknown, fallback: string) => {
    if (error instanceof AuthApiError) {
      switch (error.code) {
        case 'invalid_credentials':
          return 'Incorrect email or password.';
        case 'invalid_challenge':
          return 'That code is no longer valid. Please request a new one.';
        case 'rate_limited':
          return 'Too many attempts. Please wait a moment and try again.';
        case 'mail_unavailable':
          return 'Email delivery is temporarily unavailable. Please try again shortly.';
        case 'missing_cpo_app_id':
        case 'cpo_app_id_mismatch':
          return 'App is not configured correctly. Please contact support.';
        default:
          return error.message || fallback;
      }
    }
    return fallback;
  };

  const bootstrapAfterLogin = async () => {
    const me = await getMe();
    setMe(me);
    history.push('/dashboard');
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setMessage('');
    setIsSubmitting(true);
    try {
      const challenge = await startLogin(email, password);
      setChallengeId(challenge.challenge_id);
      setResendAvailableAt(challenge.resend_available_at);
      setIsOtpSent(true);
      setOtp(Array(6).fill(''));
      setMessage('Enter the OTP sent to your email to finish logging in.');
    } catch (error) {
      setMessage(describeError(error, 'Something went wrong. Please try again.'));
    } finally {
      setIsSubmitting(false);
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

  const handleOtpVerification = async () => {
    if (!challengeId || isSubmitting) return;
    setIsSubmitting(true);
    setMessage('');
    try {
      const tokens = await verifyLogin(challengeId, otp.join(''));
      setSession(tokens);
      await bootstrapAfterLogin();
    } catch (error) {
      setMessage(describeError(error, 'Invalid OTP. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!challengeId || isSubmitting) return;
    setIsSubmitting(true);
    setMessage('');
    try {
      const challenge = await resendLoginOtp(challengeId);
      setChallengeId(challenge.challenge_id);
      setResendAvailableAt(challenge.resend_available_at);
      setOtp(Array(6).fill(''));
      setMessage('A new OTP has been sent to your email.');
    } catch (error) {
      setMessage(describeError(error, 'Could not resend the code. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-ink-50 flex flex-col relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-300/40 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-72 h-72 bg-brand-500/20 rounded-full blur-3xl" />

      <div className="relative flex-1 flex flex-col justify-center px-6 py-10 sm:py-12">
        <div className="w-full max-w-sm mx-auto">
          <div className="flex justify-center mb-8">
            <img
              src="https://transev.in/assets/up-B0GM0qzi.png"
              alt="Logo"
              className="h-12 w-auto"
            />
          </div>

          <div className="bg-white rounded-3xl shadow-card p-6 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-1">Welcome back</h2>
            <p className="text-ink-400 text-sm mb-6">
              {isOtpSent ? 'Enter the code we emailed you' : 'Sign in to keep charging'}
            </p>

            {!isOtpSent ? (
              <form onSubmit={handleLogin} noValidate className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="block w-full px-4 py-3 border border-ink-100 rounded-2xl bg-ink-50 text-ink-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-500 uppercase tracking-wide mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={10}
                    className="block w-full px-4 py-3 border border-ink-100 rounded-2xl bg-ink-50 text-ink-900 font-medium focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand-500 text-white font-bold py-3.5 rounded-2xl shadow-glow hover:bg-brand-600 active:scale-[0.98] transition disabled:opacity-50 disabled:shadow-none"
                  disabled={!email || !password || isSubmitting}
                >
                  {isSubmitting ? 'Sending OTP...' : 'Login'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between gap-1.5">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, index)}
                      maxLength={1}
                      className="w-full aspect-square text-center text-lg font-bold text-ink-900 bg-ink-50 border border-ink-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 focus:bg-white transition"
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleOtpVerification}
                  className="w-full bg-brand-500 text-white font-bold py-3.5 rounded-2xl shadow-glow hover:bg-brand-600 active:scale-[0.98] transition disabled:opacity-50 disabled:shadow-none"
                  disabled={otp.some((d) => !d) || isSubmitting}
                >
                  {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                </button>

                <div className="flex justify-between items-center text-sm pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setChallengeId(null);
                      setMessage('');
                    }}
                    className="text-ink-400 hover:text-ink-600"
                    disabled={isSubmitting}
                  >
                    &larr; Change details
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-brand-600 font-semibold hover:text-brand-700"
                    disabled={isSubmitting}
                  >
                    Resend OTP
                  </button>
                </div>
                {resendAvailableAt && (
                  <p className="text-xs text-ink-300 text-center">
                    You can resend the code after {new Date(resendAvailableAt).toLocaleTimeString()}.
                  </p>
                )}
              </div>
            )}

            {message && (
              <p className="text-red-500 text-sm text-center mt-4 bg-red-50 rounded-xl py-2 px-3">{message}</p>
            )}

            <div className="mt-5 text-center">
              <a href="/reset" className="text-brand-600 text-sm font-semibold hover:text-brand-700">
                Forgot Password?
              </a>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-ink-500 text-sm">
              Don't have an account?{' '}
              <a href="/signup" className="text-brand-600 font-bold hover:text-brand-700">
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
