// src/services/customerApi.ts
//
// Client for USER_APP_ROOT ({API_ORIGIN}/api/v1/app): me, profile, published
// network discovery (hubs/chargers), favorites, informational pricing, and
// wallet read/recharge. See USERAPP_FE_HANDOFF_3.md section 5.
//
// NOTE: per that doc's section 13, editing email, RFID/access-token
// management, start/stop charging + live telemetry, refunds/bills beyond
// wallet recharge, and notifications are NOT part of this contract yet.
// Screens for those features intentionally keep talking to the old backend
// (be.cms.ocpp.transev.site) until a routed contract exists.

import { authedRequest, USER_APP_ROOT } from './http';
import {
  CustomerCharger,
  CustomerChargerList,
  CustomerFavorites,
  CustomerHub,
  CustomerHubList,
  CustomerMe,
  CustomerPriceResponse,
  CustomerRechargeOrder,
  CustomerRechargeVerifyRequest,
  CustomerUser,
  CustomerWalletResponse,
  CustomerWalletTransactionList,
  UpdateCustomerProfileRequest,
} from '../types/auth';

function query(params: Record<string, string | number | boolean | undefined>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      usp.set(key, String(value));
    }
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

// ---------------------------------------------------------------------------
// Bootstrap / profile
// ---------------------------------------------------------------------------

export function getMe(): Promise<CustomerMe> {
  return authedRequest<CustomerMe>(USER_APP_ROOT, '/me', { method: 'GET' });
}

export function updateProfile(payload: UpdateCustomerProfileRequest): Promise<CustomerUser> {
  return authedRequest<CustomerUser>(USER_APP_ROOT, '/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// Published network discovery
// ---------------------------------------------------------------------------

export function getHubs(params?: {
  q?: string;
  before?: string;
  before_id?: string;
}): Promise<CustomerHubList> {
  return authedRequest<CustomerHubList>(USER_APP_ROOT, `/hubs${query(params || {})}`, { method: 'GET' });
}

export function getHub(hubId: string): Promise<CustomerHub> {
  return authedRequest<CustomerHub>(USER_APP_ROOT, `/hubs/${hubId}`, { method: 'GET' });
}

export type GetChargersParams = {
  q?: string;
  connector_type?: string;
  min_power_kw?: number;
  max_power_kw?: number;
  open_24_hours?: boolean;
  /** Near-me query - lat and lng are required together. */
  lat?: number;
  lng?: number;
  /** Only valid with lat/lng; >0 and <=100; defaults to 10 server-side. */
  radius_km?: number;
  /** Ordinary list pagination - cannot be combined with lat/lng. */
  before?: string;
  before_id?: string;
};

export function getChargers(params?: GetChargersParams): Promise<CustomerChargerList> {
  return authedRequest<CustomerChargerList>(USER_APP_ROOT, `/chargers${query(params || {})}`, {
    method: 'GET',
  });
}

export function getCharger(chargerId: string): Promise<CustomerCharger> {
  return authedRequest<CustomerCharger>(USER_APP_ROOT, `/chargers/${chargerId}`, { method: 'GET' });
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

export function getFavorites(params?: {
  hub_before?: string;
  hub_before_id?: string;
  charger_before?: string;
  charger_before_id?: string;
}): Promise<CustomerFavorites> {
  return authedRequest<CustomerFavorites>(USER_APP_ROOT, `/favorites${query(params || {})}`, {
    method: 'GET',
  });
}

export function addFavoriteHub(hubId: string): Promise<void> {
  return authedRequest<void>(USER_APP_ROOT, `/favorite-hubs/${hubId}`, { method: 'PUT' });
}

export function removeFavoriteHub(hubId: string): Promise<void> {
  return authedRequest<void>(USER_APP_ROOT, `/favorite-hubs/${hubId}`, { method: 'DELETE' });
}

export function addFavoriteCharger(chargerId: string): Promise<void> {
  return authedRequest<void>(USER_APP_ROOT, `/favorite-chargers/${chargerId}`, { method: 'PUT' });
}

export function removeFavoriteCharger(chargerId: string): Promise<void> {
  return authedRequest<void>(USER_APP_ROOT, `/favorite-chargers/${chargerId}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Informational pricing
// ---------------------------------------------------------------------------

export function getHubPrice(hubId: string): Promise<CustomerPriceResponse> {
  return authedRequest<CustomerPriceResponse>(USER_APP_ROOT, `/hubs/${hubId}/price`, { method: 'GET' });
}

export function getChargerPrice(chargerId: string): Promise<CustomerPriceResponse> {
  return authedRequest<CustomerPriceResponse>(USER_APP_ROOT, `/chargers/${chargerId}/price`, {
    method: 'GET',
  });
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export function getWallet(): Promise<CustomerWalletResponse> {
  return authedRequest<CustomerWalletResponse>(USER_APP_ROOT, '/wallet', { method: 'GET' });
}

export function getWalletTransactions(params?: {
  before?: string;
  before_id?: string;
}): Promise<CustomerWalletTransactionList> {
  return authedRequest<CustomerWalletTransactionList>(
    USER_APP_ROOT,
    `/wallet/transactions${query(params || {})}`,
    { method: 'GET' }
  );
}

/** amount must be an exact decimal string, e.g. "500.00". */
export function createRechargeOrder(amount: string, idempotencyKey: string): Promise<CustomerRechargeOrder> {
  return authedRequest<CustomerRechargeOrder>(USER_APP_ROOT, '/wallet/recharge/orders', {
    method: 'POST',
    body: JSON.stringify({ amount }),
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export function verifyRechargeOrder(
  payload: CustomerRechargeVerifyRequest
): Promise<CustomerRechargeOrder> {
  return authedRequest<CustomerRechargeOrder>(USER_APP_ROOT, '/wallet/recharge/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
