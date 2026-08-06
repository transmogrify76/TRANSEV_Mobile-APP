import React, { useEffect, useState } from 'react';
import { FaBolt, FaClock, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { getAccessToken, getUserId } from '../services/session';

// ---------- Types (from the spec) ----------
type TransactionId = string;
type ChargingTransactionStatus =
  | 'ACTIVE'
  | 'STOP_PROCESSING'
  | 'STOP_REQUESTED'
  | 'STOP_RETRYING'
  | 'STOP_FAILED'
  | 'RECONCILE_REQUIRED';

interface CurrentChargingTransaction {
  uid: string | null;
  chargerid: string;
  userid: string;
  transactionid: TransactionId;
  connectorid: string | null;
  max_kwh: string | null;
  status: ChargingTransactionStatus;
  stopattempts: number;
  stoprequestedat: string | null;
  laststoperror: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CurrentTransactionsResponse {
  ongoing: true;
  can_request_stop: boolean;
  stale: boolean;
  age_minutes: number;
  stale_after_minutes: number;
  ambiguous: boolean;
  transaction: CurrentChargingTransaction;
  transaction_count: number;
  ongoing_transactions: CurrentChargingTransaction[];
}

interface NoCurrentTransactionResponse {
  ongoing: false;
  message: string;
  checked_recent_transactions: number;
}

type StopPhase = 'STOP_PENDING' | 'STOP_RETRYING' | 'COMPLETED';

interface StopResult {
  phase: StopPhase;
  transactionid: string;
  status?: string;
  detail?: string;
}

// ---------- API Helpers (using Bearer token) ----------
const BASE_URL = 'https://be.cms.ocpp.transev.site';

class CmsApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly body: any,
  ) {
    super(body?.message || `CMS request failed with ${statusCode}`);
  }
}

async function postCms<T>(
  path: string,
  token: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let result: any = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { message: text };
  }
  if (!response.ok) {
    throw new CmsApiError(response.status, result);
  }
  return result as T;
}

async function getCurrentTransactions(
  token: string,
  userid: string,
): Promise<CurrentTransactionsResponse | NoCurrentTransactionResponse> {
  try {
    return await postCms<CurrentTransactionsResponse>(
      '/users/getongoingtransaction',
      token,
      { userid },
    );
  } catch (error) {
    if (error instanceof CmsApiError && error.statusCode === 404) {
      return error.body as NoCurrentTransactionResponse;
    }
    throw error;
  }
}

async function requestStart(
  token: string,
  chargerid: string,
  userid: string,
  connectorid: string,
) {
  return postCms(
    '/users/chargerstart',
    token,
    {
      chargerid,
      userid,
      useraccept: true,
      connectorid,
    },
  );
}

async function requestStop(
  token: string,
  transaction: CurrentChargingTransaction,
): Promise<StopResult> {
  try {
    const response = await postCms<any>(
      '/users/chargerstop',
      token,
      {
        chargerid: transaction.chargerid,
        userid: transaction.userid,
        transactionid: transaction.transactionid,
      },
    );
    const status = String(response.status || '').toLowerCase();
    if (status === 'completed') {
      return {
        phase: 'COMPLETED',
        transactionid: String(response.transactionid),
      };
    }
    return {
      phase: 'STOP_PENDING',
      transactionid: String(response.transactionid),
      status: response.status || 'processing',
    };
  } catch (error) {
    if (
      error instanceof CmsApiError &&
      error.statusCode === 400 &&
      error.body?.retry_scheduled === true
    ) {
      return {
        phase: 'STOP_RETRYING',
        transactionid: String(error.body.transactionid),
        status: error.body.status || 'error',
        detail: error.body.detail,
      };
    }
    throw error;
  }
}

// ---------- Helper to get userid from the stored session ----------
const getUserIdFromToken = (): string | null => getUserId();

// ---------- Modal Component ----------
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  chargerId: string;
  connectors: string[];
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, chargerId, connectors }) => {
  const token = getAccessToken() || '';
  const userid = getUserIdFromToken();

  // State for current transactions
  const [transactions, setTransactions] = useState<CurrentChargingTransaction[]>([]);
  const [canRequestStop, setCanRequestStop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for start flow
  const [selectedConnector, setSelectedConnector] = useState<string>('');
  const [startLoading, setStartLoading] = useState(false);

  // State for stop actions per transaction
  const [stoppingTransactionId, setStoppingTransactionId] = useState<TransactionId | null>(null);

  // Fetch transactions when modal opens
  useEffect(() => {
    if (isOpen && userid && token) {
      fetchTransactions();
    }
  }, [isOpen, userid, token]);

  // Set default connector when list changes
  useEffect(() => {
    if (connectors.length > 0 && !selectedConnector) {
      setSelectedConnector(connectors[0]);
    }
  }, [connectors]);

  const fetchTransactions = async () => {
    if (!userid || !token) {
      setError('Authentication required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getCurrentTransactions(token, userid);
      if (result.ongoing) {
        setTransactions(result.ongoing_transactions);
        setCanRequestStop(result.can_request_stop);
      } else {
        setTransactions([]);
        setCanRequestStop(false);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch active sessions');
    } finally {
      setLoading(false);
    }
  };

  // Start charging
  const handleStart = async () => {
    if (!userid || !token) {
      setError('Authentication required');
      return;
    }
    if (!selectedConnector) {
      setError('Please select a connector');
      return;
    }
    // Before starting, ensure no ongoing transaction
    try {
      const check = await getCurrentTransactions(token, userid);
      if (check.ongoing) {
        setError('You already have an active session. Please stop it first.');
        setTransactions(check.ongoing_transactions);
        setCanRequestStop(check.can_request_stop);
        return;
      }
    } catch (err: any) {
      // if 404, it's fine (no transaction)
      if (err.statusCode !== 404) {
        setError(err.message);
        return;
      }
    }

    setStartLoading(true);
    setError(null);
    try {
      await requestStart(token, chargerId, userid, selectedConnector);
      // After start, refresh transactions (poll until it appears)
      await fetchTransactions();
      // If still no transaction, we might poll again, but for simplicity we show a success message
      // In a real app, you'd poll until transaction appears.
    } catch (err: any) {
      if (err.statusCode === 409) {
        // User already has a transaction - fetch and show
        await fetchTransactions();
        setError('You already have an active session. Use the stop button below.');
      } else if (err.statusCode === 400 && err.body?.message?.includes('balance')) {
        setError('Insufficient wallet balance. Please recharge.');
      } else {
        setError(err.message || 'Start request failed');
      }
    } finally {
      setStartLoading(false);
    }
  };

  // Stop a specific transaction
  const handleStop = async (transaction: CurrentChargingTransaction) => {
    if (!token) {
      setError('Authentication required');
      return;
    }
    if (stoppingTransactionId) return; // already stopping

    setStoppingTransactionId(transaction.transactionid);
    setError(null);
    try {
      const result = await requestStop(token, transaction);
      if (result.phase === 'COMPLETED') {
        // Transaction finished – refresh list
        await fetchTransactions();
        // If no transactions left, close modal or show done
        if (transactions.length === 1) {
          // Only this one was active, so no sessions now
          onClose();
        }
      } else if (result.phase === 'STOP_PENDING') {
        // Show pending – we need to poll/refresh periodically
        // For simplicity, we refresh after a delay
        setTimeout(() => fetchTransactions(), 5000);
        // Also we can keep the transaction displayed with status
        // The refresh will update statuses
        setError(null);
      } else if (result.phase === 'STOP_RETRYING') {
        // Retrying – show message
        setError(`Stop retrying: ${result.detail || ''}`);
        // Refresh after delay to see if it progresses
        setTimeout(() => fetchTransactions(), 10000);
      }
    } catch (err: any) {
      setError(err.message || 'Stop failed');
    } finally {
      setStoppingTransactionId(null);
    }
  };

  // Helper to get status display
  const getStatusDisplay = (status: ChargingTransactionStatus) => {
    const map: Record<ChargingTransactionStatus, { label: string; color: string }> = {
      ACTIVE: { label: 'Active', color: 'text-green-600' },
      STOP_PROCESSING: { label: 'Stopping...', color: 'text-yellow-600' },
      STOP_REQUESTED: { label: 'Stop requested', color: 'text-yellow-600' },
      STOP_RETRYING: { label: 'Retrying stop', color: 'text-orange-600' },
      STOP_FAILED: { label: 'Stop failed', color: 'text-red-600' },
      RECONCILE_REQUIRED: { label: 'Reconcile required', color: 'text-red-600' },
    };
    return map[status] || { label: status, color: 'text-gray-600' };
  };

  // Check if we can stop a transaction
  const canStopTransaction = (tx: CurrentChargingTransaction) => {
    return tx.status === 'ACTIVE' && canRequestStop;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-5 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FaBolt className="text-brand-600" />
            Charger Control
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
          >
            <FaTimes className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
              <FaExclamationTriangle className="text-red-500 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
            </div>
          ) : (
            <>
              {/* Show transactions if any */}
              {transactions.length > 0 && (
                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold text-gray-700">Active Session(s)</h3>
                  {transactions.map((tx) => {
                    const statusInfo = getStatusDisplay(tx.status);
                    const isThisCharger = tx.chargerid === chargerId;
                    const canStop = canStopTransaction(tx);
                    const isStopping = stoppingTransactionId === tx.transactionid;

                    return (
                      <div
                        key={tx.transactionid}
                        className={`bg-gray-50 rounded-xl p-4 border ${
                          isThisCharger ? 'border-brand-300' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">
                                #{tx.transactionid}
                              </span>
                              <span className={`text-sm font-medium ${statusInfo.color}`}>
                                ● {statusInfo.label}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <p>Charger: {tx.chargerid}</p>
                              <p>Connector: {tx.connectorid || 'N/A'}</p>
                              {tx.max_kwh && <p>Max kWh: {tx.max_kwh}</p>}
                              <p className="text-xs text-gray-400">
                                Started: {new Date(tx.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {canStop && (
                            <button
                              onClick={() => handleStop(tx)}
                              disabled={isStopping}
                              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
                            >
                              {isStopping ? 'Stopping...' : 'Stop'}
                            </button>
                          )}
                          {tx.status === 'STOP_PROCESSING' && (
                            <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                              Stopping
                            </span>
                          )}
                          {tx.status === 'STOP_RETRYING' && (
                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                              Retrying
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Start section – only if no transactions OR only for scanned charger? 
                  But spec says: if any transaction exists, do not allow start. */}
              {transactions.length === 0 ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Connector
                    </label>
                    <select
                      className="w-full bg-white text-black border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={selectedConnector}
                      onChange={(e) => setSelectedConnector(e.target.value)}
                    >
                      <option value="" disabled>-- Select Connector --</option>
                      {connectors.map((c) => (
                        <option key={c} value={c}>
                          Connector {parseInt(c) + 1}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleStart}
                    disabled={startLoading || !selectedConnector || !connectors.length}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {startLoading ? (
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    ) : (
                      <>
                        <FaBolt /> Start Charging
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center text-gray-500 text-sm py-4">
                  {transactions.some(tx => tx.chargerid === chargerId) 
                    ? 'This charger is currently in use. You can stop it using the button above.'
                    : 'You have an active session on another charger. Please stop it before starting a new one.'}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;