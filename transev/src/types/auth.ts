// src/types/auth.ts
// Types matching the new customer app-auth contract
// (docs/contracts/openapi/openapi.yaml -> /api/v1/app/auth/*)

export type ApiErrorCode =
  | 'invalid_request'
  | 'missing_cpo_app_id'
  | 'invalid_credentials'
  | 'invalid_challenge'
  | 'unauthorized'
  | 'invalid_refresh_token'
  | 'signup_unavailable'
  | 'cpo_app_id_mismatch'
  | 'customer_already_registered'
  | 'rate_limited'
  | 'mail_unavailable'
  | 'internal_error'
  | 'session_not_found'
  | 'password_reused'
  | 'invalid_password'
  | 'invalid_current_password'
  | 'unknown_error'
  | string;

export type ApiError = {
  error: { code: ApiErrorCode; message: string };
};

/** Thrown by the auth API client on any non-2xx response. */
export class AuthApiError extends Error {
  status: number;
  code: ApiErrorCode;
  constructor(message: string, status: number, code: ApiErrorCode) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
  }
}

export type ChallengeResponse = {
  challenge_id: string;
  expires_at: string; // UTC RFC 3339
  resend_available_at: string; // UTC RFC 3339
};

export type CustomerTokenResponse = {
  access_token: string;
  access_token_expires_at: string;
  refresh_token: string;
  session_expires_at: string;
  token_type: 'Bearer';
  customer_id: string;
  cpo_id: string;
  cpo_app_id: string;
};

export type CustomerMe = {
  user: {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    is_verified: boolean;
    last_login_at?: string;
  };
  customer: {
    id: string;
    status: 'ACTIVE' | 'BLOCKED';
    user_group_id?: string;
  };
  cpo: {
    id: string;
    business_name: string;
    app_id: string;
    app_id_mode: 'DUMMY' | 'LIVE';
  };
  wallet: {
    id: string;
    balance: string; // exact decimal string
    currency: string;
  };
};

export type CustomerSession = {
  id: string;
  ip_address?: string;
  user_agent: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  is_current: boolean;
};

export type SessionListResponse = {
  sessions: CustomerSession[];
};

export type MessageResponse = {
  message: string;
};

export type SignupStartPayload = {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
};

export type SignupVerifyResponse = {
  customer_id: string;
  cpo_id: string;
  wallet_id: string;
};

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export type UpdateCustomerProfileRequest = {
  full_name: string;
  phone?: string | null; // omit to preserve; null to clear
};

export type CustomerUser = CustomerMe['user'];

// ---------------------------------------------------------------------------
// Published network discovery
// ---------------------------------------------------------------------------

export type CustomerHubSummary = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  twenty_four_seven_open_status: boolean;
  customer_visible: true;
  charger_count: number;
  is_favorite: boolean;
};

export type CustomerNetworkStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'UNDERMAINTENANCE'
  | 'DECOMMISSIONED';

export type CustomerConnector = {
  id: string;
  connector_number: number;
  connector_type: string;
  connector_total_capacity: number;
  status: CustomerNetworkStatus;
  availability: 'UNKNOWN';
};

export type CustomerCharger = {
  id: string;
  hub_id: string;
  charger_id: string; // six-character public ID
  charger_name?: string;
  vendor?: string;
  model?: string;
  max_power_kw: number;
  ocpp_version: string;
  status: CustomerNetworkStatus;
  charger_image_url?: string; // authenticated relative API path, e.g. /api/v1/app/chargers/{charger_id}/image
  charger_type?: string;
  segment?: string;
  sub_segment?: string;
  charger_use_type?: string;
  parking?: string;
  hub_name?: string;
  hub_address?: string;
  hub_latitude?: number;
  hub_longitude?: number;
  twenty_four_seven_open_status?: boolean;
  distance_km?: number;
  availability: 'UNKNOWN';
  is_favorite: boolean;
  connectors: CustomerConnector[];
};

export type CustomerChargerList = {
  chargers: CustomerCharger[];
  next_before?: string;
  next_before_id?: string;
  has_more: boolean;
};

export type CustomerHub = CustomerHubSummary & {
  chargers: CustomerCharger[];
};

export type CustomerHubList = {
  hubs: CustomerHubSummary[];
  next_before?: string;
  next_before_id?: string;
  has_more: boolean;
};

export type CustomerFavorites = {
  hubs: CustomerHubSummary[];
  chargers: CustomerCharger[];
  next_hub_before?: string;
  next_hub_before_id?: string;
  has_more_hubs: boolean;
  next_charger_before?: string;
  next_charger_before_id?: string;
  has_more_chargers: boolean;
};

export type CustomerPriceResponse = {
  status: 'AVAILABLE' | 'UNAVAILABLE';
  effective_at: string;
  currency?: string;
  price_per_kwh?: string;
  idle_fee_per_minute?: string;
  gst?: {
    sgst_rate: string;
    cgst_rate: string;
    igst_rate: string;
  };
  unavailable_reason?: 'no_eligible_tariff';
};

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export type CustomerWalletDetails = {
  id: string;
  balance: string;
  currency: string;
  updated_at: string;
};

export type CustomerWalletResponse = CustomerWalletDetails;

export type CustomerWalletTransaction = {
  id: string;
  amount: string;
  transaction_type: 'CREDIT' | 'DEBIT';
  description: string;
  session_id?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  created_at: string;
};

export type CustomerWalletTransactionList = {
  wallet: CustomerWalletDetails;
  transactions: CustomerWalletTransaction[];
  next_before?: string;
  next_before_id?: string;
  has_more: boolean;
};

export type CustomerRechargeOrder = {
  recharge_order_id: string;
  provider: 'RAZORPAY';
  provider_order_id: string;
  amount: string;
  amount_minor: number;
  currency: 'INR';
  provider_key_id?: string; // present when creating the checkout order
  status: 'PAYMENT_PENDING' | 'PAID';
  created_at: string;
};

export type CustomerRechargeVerifyRequest = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};