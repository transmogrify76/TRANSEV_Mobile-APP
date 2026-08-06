// src/services/session.ts
//
// Central place for storing/reading the auth session in this browser.
//
// The new access token is opaque and MUST NOT be decoded on the frontend
// (see USERAPP_FE_HANDOFF.md section 7.2 / 12), so every place in the app
// that used to do `jwtDecode(token).userid` now reads the customer id (and
// other profile fields) that were stored here after login, from the
// CustomerTokenResponse and the GET /me bootstrap call.
//
// `token` is kept as the localStorage key name for the access token so any
// existing Bearer-header calls elsewhere in the app keep working unchanged.

import { CustomerMe, CustomerTokenResponse } from '../types/auth';

const KEYS = {
  accessToken: 'token', // kept as 'token' for backward compatibility
  refreshToken: 'refresh_token',
  accessTokenExpiresAt: 'access_token_expires_at',
  sessionExpiresAt: 'session_expires_at',
  customerId: 'customer_id',
  cpoId: 'cpo_id',
  cpoAppId: 'cpo_app_id',
  me: 'me',
} as const;

export function setSession(tokens: CustomerTokenResponse): void {
  localStorage.setItem(KEYS.accessToken, tokens.access_token);
  localStorage.setItem(KEYS.refreshToken, tokens.refresh_token);
  localStorage.setItem(KEYS.accessTokenExpiresAt, tokens.access_token_expires_at);
  localStorage.setItem(KEYS.sessionExpiresAt, tokens.session_expires_at);
  localStorage.setItem(KEYS.customerId, tokens.customer_id);
  localStorage.setItem(KEYS.cpoId, tokens.cpo_id);
  localStorage.setItem(KEYS.cpoAppId, tokens.cpo_app_id);
}

export function setMe(me: CustomerMe): void {
  localStorage.setItem(KEYS.me, JSON.stringify(me));
}

export function getMeCached(): CustomerMe | null {
  const raw = localStorage.getItem(KEYS.me);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CustomerMe;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(KEYS.accessToken);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(KEYS.refreshToken);
}

/** Replacement for the old `jwtDecode(token).userid`. */
export function getUserId(): string | null {
  return localStorage.getItem(KEYS.customerId) || getMeCached()?.customer.id || null;
}

export function getCpoId(): string | null {
  return localStorage.getItem(KEYS.cpoId);
}

export function getUserEmail(): string | null {
  return getMeCached()?.user.email || null;
}

export function getUserName(): string | null {
  return getMeCached()?.user.full_name || null;
}

export function getWalletId(): string | null {
  return getMeCached()?.wallet.id || null;
}

export function isAuthenticated(): boolean {
  return !!getAccessToken() && !!getUserId();
}

export function clearSession(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
}
