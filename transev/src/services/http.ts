// src/services/http.ts
//
// Shared low-level HTTP plumbing for the customer app API, per
// USERAPP_FE_HANDOFF_3.md section 2 and 11.
//
// The API is now split into two route groups off one origin:
//   USER_APP_ROOT       = {API_ORIGIN}/api/v1/app       (me, profile, hubs,
//                          chargers, pricing, favorites, wallet, recharge)
//   USER_APP_AUTH_ROOT  = {API_ORIGIN}/api/v1/app/auth  (signup, login,
//                          refresh, password recovery/change, sessions, logout)
//
// This is a route migration, not an alias: the old combined
// /api/v1/app/auth/* surface for business resources is gone.

import { ApiError, AuthApiError, CustomerTokenResponse } from '../types/auth';
import { clearSession, getAccessToken, getRefreshToken, setSession } from './session';

const rawOrigin: string =
  import.meta.env.VITE_EV_CMS_API_ORIGIN || 'https://dev-evcmsnew.transev.site';

export const API_ORIGIN = rawOrigin.replace(/\/+$/, '');
export const API_BASE_URL = `${API_ORIGIN}/api/v1`;
export const USER_APP_ROOT = `${API_BASE_URL}/app`;
export const USER_APP_AUTH_ROOT = `${USER_APP_ROOT}/auth`;

export const CPO_APP_ID: string = import.meta.env.VITE_CPO_APP_ID || '';

if (!CPO_APP_ID && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.warn(
    '[http] VITE_CPO_APP_ID is not set. Every User App request needs X-CPO-App-ID. ' +
      'Set it in your .env file.'
  );
}

export type ApiInit = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> };

/** Low level request helper against a given route root (business or auth). */
export async function request<T>(
  root: string,
  path: string,
  init: ApiInit = {},
  accessToken?: string
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-CPO-App-ID': CPO_APP_ID,
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(init.headers || {}),
  };

  const response = await fetch(`${root}${path}`, { ...init, headers });

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await response.json().catch(() => undefined);

  if (!response.ok) {
    const failure = body as ApiError | undefined;
    throw new AuthApiError(
      failure?.error?.message ?? 'Request failed',
      response.status,
      failure?.error?.code ?? 'unknown_error'
    );
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Refresh (single in-flight refresh, per handoff doc section 8)
// ---------------------------------------------------------------------------

let refreshInFlight: Promise<CustomerTokenResponse> | null = null;

export async function refreshSession(): Promise<CustomerTokenResponse> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    throw new AuthApiError('No refresh token available', 401, 'invalid_refresh_token');
  }

  if (!refreshInFlight) {
    refreshInFlight = request<CustomerTokenResponse>(USER_APP_AUTH_ROOT, '/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: currentRefreshToken }),
    })
      .then((next) => {
        setSession(next);
        return next;
      })
      .catch((err) => {
        if (err instanceof AuthApiError && err.code === 'invalid_refresh_token') {
          clearSession();
        }
        throw err;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Authenticated request against a given route root; auto-refreshes once on 401 unauthorized. */
export async function authedRequest<T>(root: string, path: string, init: ApiInit = {}): Promise<T> {
  const token = getAccessToken();
  try {
    return await request<T>(root, path, init, token || undefined);
  } catch (err) {
    if (err instanceof AuthApiError && err.code === 'unauthorized') {
      const refreshed = await refreshSession();
      return request<T>(root, path, init, refreshed.access_token);
    }
    throw err;
  }
}
