import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { resendSignupOtp, startSignup, verifySignup } from '../services/authApi';
import { AuthApiError } from '../types/auth';

const Signup: React.FC = () => {
  const history = useHistory();
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phonenumber, setPhonenumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<string | null>(null);
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const describeError = (error: unknown, fallback: string) => {
    if (error instanceof AuthApiError) {
      switch (error.code) {
        case 'customer_already_registered':
          return 'An account with this email already exists. Try logging in instead.';
        case 'invalid_challenge':
          return 'That code is no longer valid. Please request a new one.';
        case 'rate_limited':
          return 'Too many attempts. Please wait a moment and try again.';
        case 'mail_unavailable':
          return 'Email delivery is temporarily unavailable. Please try again shortly.';
        case 'signup_unavailable':
          return 'Signups are unavailable for this app right now. Please contact support.';
        default:
          return error.message || fallback;
      }
    }
    return fallback;
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      if (!isOtpSent) {
        const challenge = await startSignup({
          email,
          password,
          full_name: username,
          phone: phonenumber || undefined,
        });
        setChallengeId(challenge.challenge_id);
        setResendAvailableAt(challenge.resend_available_at);
        setIsOtpSent(true);
        setOtp(Array(6).fill(''));
        setSuccessMessage('We sent a verification code to your email.');
      } else if (challengeId) {
        await verifySignup(challengeId, otp.join(''));
        setSuccessMessage('Account created! Redirecting to login...');
        setTimeout(() => history.push('/login'), 1500);
      }
    } catch (error) {
      setErrorMessage(describeError(error, 'Something went wrong!'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (!challengeId || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const challenge = await resendSignupOtp(challengeId);
      setChallengeId(challenge.challenge_id);
      setResendAvailableAt(challenge.resend_available_at);
      setOtp(Array(6).fill(''));
      setSuccessMessage('A new code has been sent to your email.');
    } catch (error) {
      setErrorMessage(describeError(error, 'Could not resend the code. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  // Hide the error popup after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-brand-100 via-brand-200 to-blue-100">
      <div className="w-full h-screen flex items-center justify-center">
        <div className="w-full max-w-md h-full bg-white bg-opacity-60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 flex flex-col justify-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="https://transev.in/assets/up-B0GM0qzi.png"
              alt="Logo"
              className="h-14 w-auto"
            />
          </div>

          <h2 className="text-4xl font-bold text-center text-brand-800 mb-6">Sign Up</h2>

          <form onSubmit={handleSignup} noValidate className="space-y-4">
            {!isOtpSent && (
              <>
                {/* Username Input */}
                <div>
                  <label className="block text-lg font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                    placeholder="Enter your username"
                  />
                </div>

                {/* Email Input */}
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

                {/* Phone Number Input */}
                <div>
                  <label className="block text-lg font-medium text-gray-700">Phone Number</label>
                  <input
                    type="text"
                    value={phonenumber}
                    onChange={(e) => setPhonenumber(e.target.value)}
                    className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                    placeholder="Enter your phone number"
                  />
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-lg font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={10}
                    maxLength={128}
                    className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                    placeholder="Create a password (10-128 characters)"
                  />
                </div>
              </>
            )}

            {isOtpSent && (
              <>
                <div className="mb-2 flex justify-between">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      id={`otp-input-${index}`}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value.slice(-1), index)}
                      maxLength={1}
                      className="w-12 h-12 p-2 text-center text-xl font-bold text-gray-800 bg-white border border-gray-300 rounded-md shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setChallengeId(null);
                    }}
                    className="text-gray-600 hover:underline"
                    disabled={isSubmitting}
                  >
                    Edit details
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-brand-600 font-semibold hover:underline"
                    disabled={isSubmitting}
                  >
                    Resend OTP
                  </button>
                </div>
                {resendAvailableAt && (
                  <p className="text-xs text-gray-500 text-center">
                    You can resend the code after{' '}
                    {new Date(resendAvailableAt).toLocaleTimeString()}.
                  </p>
                )}
              </>
            )}

            <button
              type="submit"
              className="w-full bg-brand-500 text-white font-bold py-3 rounded-full shadow-lg hover:bg-brand-600 transition duration-300 ease-in-out disabled:opacity-60"
              disabled={
                isSubmitting ||
                (!isOtpSent ? !username || !email || !password : otp.some((d) => !d))
              }
            >
              {isSubmitting ? 'Please wait...' : isOtpSent ? 'Verify OTP' : 'Send OTP'}
            </button>
          </form>

          {/* Success Message */}
          {successMessage && <p className="text-green-500 text-center mt-4">{successMessage}</p>}

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-700">
              Already have an account?{' '}
              <a href="/login" className="text-brand-600 font-bold hover:underline">
                Login here
              </a>
            </p>
          </div>

          {errorMessage && (
            <div className="fixed bottom-4 right-4 p-4 bg-red-500 text-white rounded-lg shadow-lg text-center transition-opacity duration-300 ease-in-out">
              <p>{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Signup;
