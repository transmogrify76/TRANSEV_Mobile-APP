import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { getAccessToken, getUserId } from '../services/session';
import { toast } from 'react-toastify';
import {
  FaHome,
  FaBolt,
  FaClock,
  FaSync,
  FaWifi,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
} from 'react-icons/fa';

// ---------- Types ----------
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

// WebSocket types
type LiveTransactionStatus = 'RUNNING' | 'COMPLETED';

interface LiveTransaction {
  id: number;
  uuiddb: string;
  charger_id: string;
  connector_id: number;
  meter_start: number;
  meter_stop: number | null;
  total_consumption: number | null;
  start_time: string;
  stop_time: string | null;
  id_tag: string;
  transaction_id: string;
  is_single_session: boolean;
  max_kwh: number | null;
  limit_stop_requested: boolean;
}

interface LiveTransactionSnapshot {
  event: 'transaction_snapshot';
  status: LiveTransactionStatus;
  transaction: LiveTransaction;
  observed_at: string;
}

// ---------- API Helpers ----------
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

async function requestStop(
  token: string,
  transaction: CurrentChargingTransaction,
): Promise<any> {
  return postCms(
    '/users/chargerstop',
    token,
    {
      chargerid: transaction.chargerid,
      userid: transaction.userid,
      transactionid: transaction.transactionid,
    },
  );
}

// ---------- WebSocket Connection ----------
function connectLiveTransaction(params: {
  transactionId: string;
  idTag: string;
  onSnapshot: (snapshot: LiveTransactionSnapshot) => void;
  onDisconnected?: () => void;
  onError?: () => void;
}): WebSocket {
  const query = new URLSearchParams({
    transaction_id: params.transactionId,
    id_tag: params.idTag,
  });
  const socket = new WebSocket(
    `wss://dev-ocpphalapi.transev.site/frontend/ws/transaction?${query.toString()}`,
  );
  socket.onopen = () => {
    console.info(`Live socket connected for tx ${params.transactionId}`);
  };
  socket.onmessage = (event) => {
    try {
      const snapshot = JSON.parse(event.data) as LiveTransactionSnapshot;
      if (snapshot.event !== 'transaction_snapshot') {
        console.warn('Unknown transaction event', snapshot);
        return;
      }
      params.onSnapshot(snapshot);
    } catch (error) {
      console.error('Invalid transaction WebSocket message', error);
    }
  };
  socket.onerror = () => {
    console.error(`Live socket error for tx ${params.transactionId}`);
    params.onError?.();
  };
  socket.onclose = () => {
    console.info(`Live socket disconnected for tx ${params.transactionId}`);
    params.onDisconnected?.();
  };
  return socket;
}

// ---------- Helper ----------
const getUserIdFromToken = (): string | null => getUserId();

// ---------- Main Component ----------
const ActiveSession: React.FC = () => {
  const history = useHistory();
  const token = getAccessToken() || '';
  const userid = getUserIdFromToken();

  // CMS state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<
    CurrentTransactionsResponse | NoCurrentTransactionResponse | null
  >(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Stop state
  const [stopping, setStopping] = useState<TransactionId | null>(null);

  // Live data per transaction
  const [liveSnapshots, setLiveSnapshots] = useState<Record<TransactionId, LiveTransactionSnapshot | null>>({});

  // Refs for socket management
  const socketsRef = useRef<Map<TransactionId, WebSocket>>(new Map());
  const reconnectTimeoutsRef = useRef<Map<TransactionId, number>>(new Map());
  const reconnectAttemptsRef = useRef<Map<TransactionId, number>>(new Map());

  // Fetch CMS data
  const fetchData = useCallback(async () => {
    if (!userid || !token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getCurrentTransactions(token, userid);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch active sessions');
    } finally {
      setLoading(false);
    }
  }, [userid, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // ----- WebSocket management -----
  const closeSocket = useCallback((transactionId: TransactionId) => {
    const socket = socketsRef.current.get(transactionId);
    if (socket) {
      socket.close(1000, 'Closing socket');
      socketsRef.current.delete(transactionId);
    }
    const timeout = reconnectTimeoutsRef.current.get(transactionId);
    if (timeout) {
      clearTimeout(timeout);
      reconnectTimeoutsRef.current.delete(transactionId);
    }
    reconnectAttemptsRef.current.delete(transactionId);
  }, []);

  const closeAllSockets = useCallback(() => {
    for (const txId of socketsRef.current.keys()) {
      closeSocket(txId);
    }
  }, [closeSocket]);

  const scheduleReconnect = useCallback(
    (transactionId: TransactionId, idTag: string) => {
      const snapshot = liveSnapshots[transactionId];
      if (snapshot?.status === 'COMPLETED') return;

      let attempts = reconnectAttemptsRef.current.get(transactionId) || 0;
      const delays = [1000, 2000, 5000, 10000, 30000];
      const delay = delays[Math.min(attempts, delays.length - 1)];
      attempts++;
      reconnectAttemptsRef.current.set(transactionId, attempts);

      const timeout = setTimeout(() => {
        const ongoing = data?.ongoing === true;
        if (ongoing) {
          const tx = (data as CurrentTransactionsResponse).ongoing_transactions.find(
            (t) => t.transactionid === transactionId,
          );
          if (tx) {
            openSocketForTransaction(tx);
          }
        }
      }, delay);
      reconnectTimeoutsRef.current.set(transactionId, timeout);
    },
    [data, liveSnapshots],
  );

  const openSocketForTransaction = useCallback(
    (transaction: CurrentChargingTransaction) => {
      const txId = transaction.transactionid;
      if (socketsRef.current.has(txId)) return;
      const snapshot = liveSnapshots[txId];
      if (snapshot?.status === 'COMPLETED') return;

      const socket = connectLiveTransaction({
        transactionId: txId,
        idTag: transaction.userid,
        onSnapshot: (snapshot) => {
          setLiveSnapshots((prev) => ({
            ...prev,
            [txId]: snapshot,
          }));
          if (snapshot.status === 'COMPLETED') {
            closeSocket(txId);
            fetchData();
          }
          reconnectAttemptsRef.current.delete(txId);
        },
        onDisconnected: () => {
          if (liveSnapshots[txId]?.status !== 'COMPLETED') {
            scheduleReconnect(txId, transaction.userid);
          }
        },
        onError: () => {},
      });
      socketsRef.current.set(txId, socket);
      reconnectAttemptsRef.current.delete(txId);
    },
    [liveSnapshots, closeSocket, scheduleReconnect, fetchData],
  );

  useEffect(() => {
    if (data?.ongoing === true) {
      const transactions = (data as CurrentTransactionsResponse).ongoing_transactions;
      transactions.forEach((tx) => {
        openSocketForTransaction(tx);
      });
    } else {
      closeAllSockets();
    }
  }, [data, openSocketForTransaction, closeAllSockets]);

  useEffect(() => {
    return () => {
      closeAllSockets();
    };
  }, [closeAllSockets]);

  // ----- Stop handler -----
  const handleStop = async (transaction: CurrentChargingTransaction) => {
    if (stopping) return;
    setStopping(transaction.transactionid);
    try {
      await requestStop(token, transaction);
      toast.info('Stop request sent. Waiting for charger to complete...');
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      toast.error(err.message || 'Stop request failed');
    } finally {
      setStopping(null);
    }
  };

  // ----- Helpers -----
  const getCmsStatusDisplay = (status: ChargingTransactionStatus) => {
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

  // ----- Render transaction card (matches Wallet history style) -----
  const renderTransaction = (tx: CurrentChargingTransaction) => {
    const txId = tx.transactionid;
    const snapshot = liveSnapshots[txId];
    const isStopping = stopping === txId;
    const canStop = tx.status === 'ACTIVE' && data?.ongoing && (data as CurrentTransactionsResponse).can_request_stop;

    const liveStatus = snapshot?.status;
    const isLiveActive = liveStatus === 'RUNNING';
    const isLiveCompleted = liveStatus === 'COMPLETED';
    const consumedKwh = snapshot?.transaction?.total_consumption ?? null;
    const meterStop = snapshot?.transaction?.meter_stop ?? null;
    const startTime = snapshot?.transaction?.start_time ?? tx.createdAt;
    const stopTime = snapshot?.transaction?.stop_time ?? null;

    return (
      <div
        key={txId}
        className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 mb-4"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
          {/* Left: transaction details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-800">#{txId}</span>
              {snapshot && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    isLiveActive
                      ? 'bg-green-100 text-green-700'
                      : isLiveCompleted
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isLiveActive ? 'LIVE' : isLiveCompleted ? 'DONE' : '…'}
                </span>
              )}
              {!snapshot && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <FaWifi className="text-gray-300" /> connecting
                </span>
              )}
              <span className={`text-xs font-medium ${getCmsStatusDisplay(tx.status).color}`}>
                • {getCmsStatusDisplay(tx.status).label}
              </span>
            </div>

            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-gray-600">
              <p><span className="font-medium">Charger:</span> {tx.chargerid}</p>
              <p><span className="font-medium">Connector:</span> {tx.connectorid || 'N/A'}</p>
              {snapshot && (
                <>
                  <p>
                    <span className="font-medium">Consumed:</span>{' '}
                    <span className="font-mono">{consumedKwh !== null ? `${consumedKwh.toFixed(3)} kWh` : '—'}</span>
                  </p>
                  <p>
                    <span className="font-medium">Meter:</span>{' '}
                    <span className="font-mono">{meterStop !== null ? `${meterStop} Wh` : '—'}</span>
                  </p>
                </>
              )}
              <p><span className="font-medium">Started:</span> {new Date(startTime).toLocaleString()}</p>
              {stopTime && <p><span className="font-medium">Stopped:</span> {new Date(stopTime).toLocaleString()}</p>}
            </div>

            {tx.laststoperror && (
              <p className="text-red-500 text-sm mt-1">Error: {tx.laststoperror}</p>
            )}
          </div>

          {/* Right: stop button / status badge */}
          <div className="flex flex-col items-end gap-2">
            {canStop && !isLiveCompleted && (
              <button
                onClick={() => handleStop(tx)}
                disabled={isStopping}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStopping ? (
                  <FaSpinner className="animate-spin inline mr-1" />
                ) : null}
                {isStopping ? 'Stopping...' : 'Stop'}
              </button>
            )}
            {(isLiveCompleted || tx.status === 'STOP_PROCESSING' || tx.status === 'STOP_REQUESTED') && (
              <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                {isLiveCompleted ? 'Completed' : 'Stopping...'}
              </span>
            )}
            {snapshot?.status === 'COMPLETED' && (
              <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1">
                <FaCheckCircle /> Done
              </span>
            )}
          </div>
        </div>

        {/* Live status bar */}
        {snapshot && isLiveActive && (
          <div className="mt-3 pt-2 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <FaBolt className="text-brand-500" /> {consumedKwh !== null ? `${consumedKwh.toFixed(2)} kWh` : '—'}
            </span>
            <span className="flex items-center gap-1">
              <FaClock /> {new Date(snapshot.observed_at).toLocaleTimeString()}
            </span>
            {snapshot.transaction.limit_stop_requested && (
              <span className="text-orange-600 flex items-center gap-1">
                <FaExclamationTriangle /> limit reached
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // ----- Main render -----
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50">
        <FaSpinner className="animate-spin text-brand-600 text-4xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-blue-50 p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md w-full text-center">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            className="mt-4 px-6 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isOngoing = data?.ongoing === true;
  const ongoingData = data as CurrentTransactionsResponse;

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-brand-50 via-white to-blue-50 p-4">
      <div className="max-w-md mx-auto pb-4">
        {/* Back button (like Wallet's Home) */}
        <div className="mb-4">
          <button
            onClick={() => history.push('/dashboard')}
            className="p-3 bg-brand-600 rounded-full shadow-lg hover:bg-brand-700 transition-all duration-200"
          >
            <FaHome className="text-white text-xl" />
          </button>
        </div>

        {/* Main card */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden">
          {/* Header similar to Wallet balance card */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-6">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-brand-100 text-sm">Active Sessions</p>
                <p className="text-2xl font-bold tracking-tight">
                  {isOngoing ? `${ongoingData.transaction_count} session${ongoingData.transaction_count > 1 ? 's' : ''}` : 'None'}
                </p>
              </div>
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="bg-white/20 p-3 rounded-full hover:bg-white/30 transition"
              >
                <FaSync className="text-white text-xl" />
              </button>
            </div>
            {isOngoing && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/80">
                {ongoingData.ambiguous && <span className="bg-yellow-500/30 px-2 py-0.5 rounded">Multiple</span>}
                {ongoingData.stale && <span className="bg-orange-500/30 px-2 py-0.5 rounded">Stale</span>}
                {!ongoingData.ambiguous && ongoingData.can_request_stop && (
                  <span className="bg-green-500/30 px-2 py-0.5 rounded">Stop available</span>
                )}
                {socketsRef.current.size > 0 && (
                  <span className="bg-brand-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                    <FaWifi /> Live
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {!isOngoing ? (
              <div className="text-center py-8">
                <FaBolt className="mx-auto text-4xl text-gray-300 mb-3" />
                <p className="text-gray-500">No active charging session</p>
                <p className="text-gray-400 text-sm">Scan a charger to start</p>
              </div>
            ) : (
              <div className="space-y-1">
                {ongoingData.ongoing_transactions.map((tx) => renderTransaction(tx))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveSession;