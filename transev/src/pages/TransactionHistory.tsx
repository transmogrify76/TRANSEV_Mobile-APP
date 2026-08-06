import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getAccessToken, getUserId, clearSession } from '../services/session';
import {
  FaHome,
  FaWallet,
  FaRupeeSign,
  FaSpinner,
  FaArrowLeft,
  FaArrowRight,
  FaDownload,
} from 'react-icons/fa';
import { pdf } from '@react-pdf/renderer';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// ---------- Types (unchanged) ----------
export type MoneyHistoryFilter = 'all' | 'wallet_recharge' | 'charging_debit';
export type MoneyTransactionType = 'WALLET_RECHARGE' | 'CHARGING_DEBIT';
export type MoneyTransactionDirection = 'CREDIT' | 'DEBIT';

export interface BillingParty {
  id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
}

export interface BillingIssuer extends BillingParty {
  designation: string | null;
  gstin: string | null;
}

export interface BillingCharger {
  id: string | null;
  name: string | null;
  serial_number: string | null;
  address: string | null;
  connector_type: string | null;
  protocol: string | null;
}

export interface BillingChargingDetails {
  session_id: string | null;
  started_at: string | null;
  stopped_at: string | null;
  duration_ms: string | null;
  meter_start_wh: string | null;
  meter_stop_wh: string | null;
  energy_consumed_kwh: string | null;
}

export interface BillingPayment {
  reference: string | null;
  wallet_id: string | null;
}

export interface BillingAmounts {
  taxable: string | null;
  gst: string | null;
  total: string | null;
  balance_deducted: string | null;
  last_transaction: string | null;
}

export interface ChargingBillData {
  id: string | null;
  source: 'USER_BILLING' | 'DERIVED_FROM_TRANSACTION';
  title: 'Customer Bill';
  invoice_number: string;
  issued_at: string;
  updated_at: string;
  currency: 'INR';
  customer: BillingParty;
  issuer: BillingIssuer | null;
  charger: BillingCharger;
  charging: BillingChargingDetails;
  payment: BillingPayment;
  amounts: BillingAmounts;
}

export interface WalletSummary {
  id: string | null;
  current_balance: string | null;
  currency: 'INR';
}

export interface ChargingSessionSummary {
  session_id: string;
  charger_id: string | null;
  started_at: string | null;
  stopped_at: string | null;
  meter_start_wh: string | null;
  meter_stop_wh: string | null;
  consumed_kwh: string | null;
  total_cost: string | null;
}

export interface MoneyTransactionEntry {
  id: string;
  type: MoneyTransactionType;
  direction: MoneyTransactionDirection;
  amount: string | null;
  currency: 'INR';
  payment_id: string | null;
  wallet_id: string | null;
  charger_id: string | null;
  taxable_amount: string | null;
  gst_amount: string | null;
  created_at: string;
  updated_at: string;
  charging_session: ChargingSessionSummary | null;
  bill: ChargingBillData | null;
}

export interface MoneyHistoryPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_previous: boolean;
  has_next: boolean;
}

export interface MoneyHistoryResponse {
  message: string;
  wallet: WalletSummary | null;
  data: MoneyTransactionEntry[];
  pagination: MoneyHistoryPagination;
  filter: {
    type: MoneyHistoryFilter;
  };
}

class MoneyHistoryAPIError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'MoneyHistoryAPIError';
    this.status = status;
  }
}

// ---------- API client ----------
const CMS_BASE_URL = 'https://be.cms.ocpp.transev.site';

async function getMoneyTransactionHistory({
  token,
  page = 1,
  limit = 20,
  type = 'all',
  signal,
}: {
  token: string;
  page?: number;
  limit?: number;
  type?: MoneyHistoryFilter;
  signal?: AbortSignal;
}): Promise<MoneyHistoryResponse> {
  if (!token) {
    throw new Error('App-user token is required');
  }
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    type,
  });
  const response = await fetch(
    `${CMS_BASE_URL}/users/moneytransactionhistory?${query.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal,
    },
  );
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
        ? body.message
        : 'Unable to load transaction history';
    throw new MoneyHistoryAPIError(response.status, message);
  }
  return body as MoneyHistoryResponse;
}

// ---------- Helpers ----------
const getUserIdFromToken = (): string | null => getUserId();

// Safe INR formatter – handles null and non‑numeric strings
const formatINR = (amount: string | null | undefined): string => {
  if (!amount) return '—';
  const normalized = amount.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return normalized;
  const [whole, fraction = ''] = normalized.split('.');
  try {
    const groupedWhole = new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(BigInt(whole));
    const paise = fraction.padEnd(2, '0').slice(0, 2);
    return `₹${groupedWhole}.${paise}`;
  } catch {
    return `₹${normalized}`;
  }
};

const transactionTitle = (tx: MoneyTransactionEntry): string => {
  return tx.type === 'WALLET_RECHARGE' ? 'Wallet Recharge' : 'EV Charging';
};

const transactionSign = (tx: MoneyTransactionEntry): '+' | '−' => {
  return tx.direction === 'CREDIT' ? '+' : '−';
};

const transactionStatusText = (tx: MoneyTransactionEntry): string => {
  return tx.type === 'WALLET_RECHARGE' ? 'Recharge successful' : 'Charging completed';
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

// ---------- PDF styles for @react-pdf/renderer (optimized for one page) ----------
const pdfStyles = StyleSheet.create({
  page: {
    padding: 25, // reduced from 40
    fontSize: 8, // reduced from 10
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#006666',
    padding: 10, // reduced from 15
    marginBottom: 12, // reduced from 20
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    color: '#ffffff',
  },
  companyName: {
    fontSize: 18, // reduced from 22
    fontWeight: 'bold',
    color: '#ffffff',
  },
  companyTagline: {
    fontSize: 8, // reduced from 9
    color: '#e0e0e0',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 12, // reduced from 14
    fontWeight: 'bold',
    color: '#ffffff',
  },
  invoiceNumber: {
    fontSize: 8, // reduced from 9
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 10, // reduced from 12
    fontWeight: 'bold',
    marginTop: 6, // reduced from 12
    marginBottom: 4, // reduced from 6
    backgroundColor: '#006666',
    color: '#ffffff',
    padding: 3,
    paddingLeft: 6,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5, // thinner border
    borderBottomColor: '#eeeeee',
    paddingVertical: 2, // reduced from 3
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
  },
  value: {
    width: '70%',
  },
  table: {
    marginTop: 4, // reduced from 6
    marginBottom: 6, // reduced from 12
  },
  amountRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#dddddd',
    paddingVertical: 2, // reduced from 4
  },
  amountLabel: {
    width: '40%',
    fontWeight: 'bold',
  },
  amountValue: {
    width: '60%',
    textAlign: 'right',
  },
  footer: {
    marginTop: 15, // reduced from 30
    fontSize: 7, // reduced from 8
    color: '#888888',
    textAlign: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    paddingTop: 6, // reduced from 10
  },
});

// ---------- PDF Document Component ----------
const InvoicePDF = ({ bill }: { bill: ChargingBillData }) => {
  const textOrDash = (value: string | null | undefined): string =>
    value?.trim() || '—';

  const formatDateTime = (value: string | null | undefined): string => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  };

  const formatDuration = (ms: string | null | undefined): string => {
    if (!ms) return '—';
    const totalMs = Number(ms);
    if (!isFinite(totalMs) || totalMs < 0) return ms;
    const totalMinutes = Math.floor(totalMs / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        {/* Header */}
        <View style={pdfStyles.header}>
          <View style={pdfStyles.headerLeft}>
            <Text style={pdfStyles.companyName}>TransEV</Text>
            <Text style={pdfStyles.companyTagline}>Electric Vehicle Charging Network</Text>
          </View>
          <View style={pdfStyles.headerRight}>
            <Text style={pdfStyles.invoiceTitle}>INVOICE</Text>
            <Text style={pdfStyles.invoiceNumber}>#{textOrDash(bill.invoice_number)}</Text>
            <Text style={pdfStyles.invoiceNumber}>Date: {formatDateTime(bill.issued_at)}</Text>
          </View>
        </View>

        {/* Customer */}
        <Text style={pdfStyles.sectionTitle}>BILL TO</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Name</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.customer.name)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Customer ID</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.customer.id)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Email</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.customer.email)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Phone</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.customer.phone)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Address</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.customer.address)}</Text>
          </View>
        </View>

        {/* Operator (if exists) */}
        {bill.issuer && (
          <>
            <Text style={pdfStyles.sectionTitle}>CHARGING OPERATOR</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.row}>
                <Text style={pdfStyles.label}>Name</Text>
                <Text style={pdfStyles.value}>{textOrDash(bill.issuer.name)}</Text>
              </View>
              <View style={pdfStyles.row}>
                <Text style={pdfStyles.label}>Email</Text>
                <Text style={pdfStyles.value}>{textOrDash(bill.issuer.email)}</Text>
              </View>
              <View style={pdfStyles.row}>
                <Text style={pdfStyles.label}>Phone</Text>
                <Text style={pdfStyles.value}>{textOrDash(bill.issuer.phone)}</Text>
              </View>
              <View style={pdfStyles.row}>
                <Text style={pdfStyles.label}>Address</Text>
                <Text style={pdfStyles.value}>{textOrDash(bill.issuer.address)}</Text>
              </View>
              <View style={pdfStyles.row}>
                <Text style={pdfStyles.label}>GSTIN</Text>
                <Text style={pdfStyles.value}>{textOrDash(bill.issuer.gstin)}</Text>
              </View>
            </View>
          </>
        )}

        {/* Charging Session Details */}
        <Text style={pdfStyles.sectionTitle}>CHARGING SESSION DETAILS</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Session ID</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.charging.session_id)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Charger Name</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.charger.name)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Charger ID</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.charger.id)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Serial Number</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.charger.serial_number)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Location</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.charger.address)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Connector Type</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.charger.connector_type)}</Text>
          </View>
          {/* Protocol omitted to save space – uncomment if needed */}
          {/*
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Protocol</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.charger.protocol)}</Text>
          </View>
          */}
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Started At</Text>
            <Text style={pdfStyles.value}>{formatDateTime(bill.charging.started_at)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Stopped At</Text>
            <Text style={pdfStyles.value}>{formatDateTime(bill.charging.stopped_at)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Duration</Text>
            <Text style={pdfStyles.value}>{formatDuration(bill.charging.duration_ms)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Meter Start (Wh)</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.charging.meter_start_wh)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Meter Stop (Wh)</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.charging.meter_stop_wh)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Energy Consumed (kWh)</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.charging.energy_consumed_kwh)}</Text>
          </View>
        </View>

        {/* Payment Reference */}
        <Text style={pdfStyles.sectionTitle}>PAYMENT REFERENCE</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Reference</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.payment.reference)}</Text>
          </View>
          <View style={pdfStyles.row}>
            <Text style={pdfStyles.label}>Wallet ID</Text>
            <Text style={pdfStyles.value}>{textOrDash(bill.payment.wallet_id)}</Text>
          </View>
        </View>

        {/* Amount Breakdown */}
        <Text style={pdfStyles.sectionTitle}>AMOUNT BREAKDOWN</Text>
        <View style={pdfStyles.table}>
          <View style={pdfStyles.amountRow}>
            <Text style={pdfStyles.amountLabel}>Taxable Amount</Text>
            <Text style={pdfStyles.amountValue}>{formatINR(bill.amounts.taxable)}</Text>
          </View>
          <View style={pdfStyles.amountRow}>
            <Text style={pdfStyles.amountLabel}>GST</Text>
            <Text style={pdfStyles.amountValue}>{formatINR(bill.amounts.gst)}</Text>
          </View>
          <View style={pdfStyles.amountRow}>
            <Text style={pdfStyles.amountLabel}>Total Amount</Text>
            <Text style={pdfStyles.amountValue}>{formatINR(bill.amounts.total)}</Text>
          </View>
          <View style={pdfStyles.amountRow}>
            <Text style={pdfStyles.amountLabel}>Wallet Deduction</Text>
            <Text style={pdfStyles.amountValue}>{formatINR(bill.amounts.balance_deducted)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={pdfStyles.footer}>
          This document was generated electronically. It is a valid record of the charging transaction.
          {'\n'}Invoice #{textOrDash(bill.invoice_number)} · Generated on{' '}
          {new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' })}
        </Text>
      </Page>
    </Document>
  );
};

// ---------- Generate PDF using @react-pdf/renderer ----------
async function generateChargingBillPDF(bill: ChargingBillData): Promise<void> {
  console.log('📄 Generating PDF with @react-pdf/renderer:', bill);
  if (!bill) throw new Error('Bill data is null or undefined');

  try {
    // Render the PDF document to a blob
    const blob = await pdf(<InvoicePDF bill={bill} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (bill.invoice_number || 'bill').replace(/[^a-zA-Z0-9._-]/g, '_');
    link.download = `invoice_${safeName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    console.log('✅ PDF saved successfully');
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
}

// ---------- Main Component (unchanged) ----------
const TransactionHistory: React.FC = () => {
  const history = useHistory();
  const token = getAccessToken() || '';
  const userid = getUserIdFromToken();

  const [response, setResponse] = useState<MoneyHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filter, setFilter] = useState<MoneyHistoryFilter>('all');
  const [downloadingBillId, setDownloadingBillId] = useState<string | null>(null);

  const fetchData = useCallback(
    async (abortSignal?: AbortSignal) => {
      if (!token) {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setUnauthorized(false);
      try {
        const result = await getMoneyTransactionHistory({
          token,
          page,
          limit,
          type: filter,
          signal: abortSignal,
        });
        setResponse(result);
      } catch (err: any) {
        if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
        if (err instanceof MoneyHistoryAPIError && err.status === 401) {
          setUnauthorized(true);
          setResponse(null);
          toast.error('Session expired. Please login again.');
        } else {
          setError(err.message || 'Failed to load transactions');
        }
      } finally {
        setLoading(false);
      }
    },
    [token, page, limit, filter],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleFilterChange = (newFilter: MoneyHistoryFilter) => {
    if (newFilter !== filter) {
      setFilter(newFilter);
      setPage(1);
    }
  };

  const goToPage = (newPage: number) => {
    if (newPage >= 1 && response?.pagination && newPage <= response.pagination.total_pages) {
      setPage(newPage);
    }
  };

  const downloadBill = async (bill: ChargingBillData) => {
    console.log('🔽 Download button clicked for bill:', bill);
    if (!bill) {
      toast.error('No bill data available');
      return;
    }

    setDownloadingBillId(bill.id);
    try {
      await generateChargingBillPDF(bill);
      toast.success('Bill downloaded successfully');
    } catch (err: any) {
      console.error('❌ Download failed:', err);
      toast.error(`Could not generate bill: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloadingBillId(null);
    }
  };

  useEffect(() => {
    if (unauthorized) {
      clearSession();
      history.push('/login');
    }
  }, [unauthorized, history]);

  // ----- Render (unchanged) -----
  const renderTransactionCard = (tx: MoneyTransactionEntry) => {
    const sign = transactionSign(tx);
    const amount = formatINR(tx.amount);
    const title = transactionTitle(tx);
    const status = transactionStatusText(tx);
    const date = formatDate(tx.created_at);
    const isCredit = tx.direction === 'CREDIT';

    return (
      <div
        key={tx.id}
        className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 mb-4"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">{title}</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {isCredit ? 'Credit' : 'Debit'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{status}</p>
            {tx.type === 'CHARGING_DEBIT' && tx.charging_session && (
              <div className="mt-1 text-sm text-gray-500">
                <p>
                  <span className="font-medium">Charger:</span>{' '}
                  {tx.charging_session.charger_id || tx.charger_id || 'Unknown'}
                </p>
                <p>
                  <span className="font-medium">Energy:</span>{' '}
                  {tx.charging_session.consumed_kwh
                    ? `${tx.charging_session.consumed_kwh} kWh`
                    : '—'}
                </p>
              </div>
            )}
            {tx.type === 'WALLET_RECHARGE' && tx.payment_id && (
              <p className="text-xs text-gray-400 mt-1">Payment: {tx.payment_id}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">{date}</p>
          </div>
          <div className="flex flex-col items-end">
            <p
              className={`text-lg font-bold ${
                isCredit ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {sign} {amount}
            </p>
            {tx.type === 'CHARGING_DEBIT' && (
              <div className="text-xs text-gray-400 mt-1">
                {tx.taxable_amount && (
                  <span>Taxable: {formatINR(tx.taxable_amount)}</span>
                )}
                {tx.gst_amount && (
                  <span className="ml-2">GST: {formatINR(tx.gst_amount)}</span>
                )}
              </div>
            )}
            {tx.type === 'CHARGING_DEBIT' && tx.bill && (
              <button
                onClick={() => {
                  console.log('👆 User clicked Download Bill for transaction:', tx.id);
                  downloadBill(tx.bill!);
                }}
                disabled={downloadingBillId === tx.bill.id}
                className="mt-2 text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1 rounded-full flex items-center gap-1 transition disabled:opacity-50"
              >
                {downloadingBillId === tx.bill.id ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaDownload />
                )}
                {downloadingBillId === tx.bill.id ? 'Generating...' : 'Download Bill'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading && !response) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50">
        <FaSpinner className="animate-spin text-brand-600 text-4xl" />
      </div>
    );
  }

  if (error && !response) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md w-full text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 px-6 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const walletBalance = response?.wallet?.current_balance
    ? formatINR(response.wallet.current_balance)
    : '₹—';
  const transactions = response?.data || [];
  const pagination = response?.pagination;

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-brand-50 via-white to-blue-50 p-4">
      <div className="max-w-md mx-auto pb-4">
        <div className="mb-4">
          <button
            onClick={() => history.push('/dashboard')}
            className="p-3 bg-brand-600 rounded-full shadow-lg hover:bg-brand-700 transition-all duration-200"
          >
            <FaHome className="text-white text-xl" />
          </button>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-6">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-brand-100 text-sm">Wallet Balance</p>
                <p className="text-3xl font-bold tracking-tight">{walletBalance}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <FaWallet className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex bg-gray-100 rounded-full p-1 mb-6">
              {(['all', 'wallet_recharge', 'charging_debit'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => handleFilterChange(type)}
                  className={`flex-1 py-2 text-sm font-medium rounded-full transition ${
                    filter === type
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'wallet_recharge' ? 'Recharges' : 'Charging'}
                </button>
              ))}
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-8">
                <FaRupeeSign className="mx-auto text-4xl text-gray-300 mb-3" />
                <p className="text-gray-500">No transactions yet</p>
                <p className="text-gray-400 text-sm">Your financial history will appear here</p>
              </div>
            ) : (
              <>
                {transactions.map((tx) => renderTransactionCard(tx))}
                {pagination && pagination.total_pages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={() => goToPage(pagination.page - 1)}
                      disabled={!pagination.has_previous || loading}
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      <FaArrowLeft className="text-gray-600" />
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {pagination.page} of {pagination.total_pages}
                    </span>
                    <button
                      onClick={() => goToPage(pagination.page + 1)}
                      disabled={!pagination.has_next || loading}
                      className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      <FaArrowRight className="text-gray-600" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;