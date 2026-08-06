// src/services/authApi.ts
//
// Client for USER_APP_AUTH_ROOT ({API_ORIGIN}/api/v1/app/auth): signup,
// login, refresh, password recovery/change, session list/revocation, and
// logout. Everything else (me, profile, hubs, chargers, favorites, price,
// wallet) lives under USER_APP_ROOT in customerApi.ts - see
// USERAPP_FE_HANDOFF_3.md section 2.

import { authedRequest, request, USER_APP_AUTH_ROOT } from './http';
import {
  ChallengeResponse,
  CustomerTokenResponse,
  MessageResponse,
  SessionListResponse,
  SignupStartPayload,
  SignupVerifyResponse,
} from '../types/auth';

export { refreshSession } from './http';

// ---------------------------------------------------------------------------
// Signup
// ---------------------------------------------------------------------------

export function startSignup(payload: SignupStartPayload): Promise<ChallengeResponse> {
  return request<ChallengeResponse>(USER_APP_AUTH_ROOT, '/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function verifySignup(challengeId: string, code: string): Promise<SignupVerifyResponse> {
  return request<SignupVerifyResponse>(USER_APP_AUTH_ROOT, '/signup/verify', {
    method: 'POST',
    body: JSON.stringify({ challenge_id: challengeId, code }),
  });
}

export function resendSignupOtp(challengeId: string): Promise<ChallengeResponse> {
  return request<ChallengeResponse>(USER_APP_AUTH_ROOT, '/signup/resend', {
    method: 'POST',
    body: JSON.stringify({ challenge_id: challengeId }),
  });
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export function startLogin(email: string, password: string): Promise<ChallengeResponse> {
  return request<ChallengeResponse>(USER_APP_AUTH_ROOT, '/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function verifyLogin(challengeId: string, code: string): Promise<CustomerTokenResponse> {
  return request<CustomerTokenResponse>(USER_APP_AUTH_ROOT, '/login/verify', {
    method: 'POST',
    body: JSON.stringify({ challenge_id: challengeId, code }),
  });
}

export function resendLoginOtp(challengeId: string): Promise<ChallengeResponse> {
  return request<ChallengeResponse>(USER_APP_AUTH_ROOT, '/login/resend', {
    method: 'POST',
    body: JSON.stringify({ challenge_id: challengeId }),
  });
}

// ---------------------------------------------------------------------------
// Authenticated session/account management (still under /auth)
// ---------------------------------------------------------------------------

export function getSessions(): Promise<SessionListResponse> {
  return authedRequest<SessionListResponse>(USER_APP_AUTH_ROOT, '/sessions', { method: 'GET' });
}

export function revokeSession(sessionId: string): Promise<void> {
  return authedRequest<void>(USER_APP_AUTH_ROOT, `/sessions/${sessionId}`, { method: 'DELETE' });
}

export function logout(): Promise<void> {
  return authedRequest<void>(USER_APP_AUTH_ROOT, '/logout', { method: 'POST' });
}

export function logoutAll(): Promise<void> {
  return authedRequest<void>(USER_APP_AUTH_ROOT, '/logout-all', { method: 'POST' });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<MessageResponse> {
  return authedRequest<MessageResponse>(USER_APP_AUTH_ROOT, '/password/change', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

// ---------------------------------------------------------------------------
// Password recovery (no bearer token)
// ---------------------------------------------------------------------------

export function forgotPassword(email: string): Promise<MessageResponse> {
  return request<MessageResponse>(USER_APP_AUTH_ROOT, '/password/forgot', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function resendPasswordReset(challengeId: string): Promise<ChallengeResponse> {
  return request<ChallengeResponse>(USER_APP_AUTH_ROOT, '/password/reset/resend', {
    method: 'POST',
    body: JSON.stringify({ challenge_id: challengeId }),
  });
}

export function resetPassword(
  challengeId: string,
  code: string,
  newPassword: string
): Promise<MessageResponse> {
  return request<MessageResponse>(USER_APP_AUTH_ROOT, '/password/reset', {
    method: 'POST',
    body: JSON.stringify({ challenge_id: challengeId, code, new_password: newPassword }),
  });
}
