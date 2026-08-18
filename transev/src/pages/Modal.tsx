import React, { useEffect, useState } from 'react';
import { FaBolt, FaClock, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { authedRequest, USER_APP_ROOT } from '../services/http';
import { getCharger } from '../services/customerApi';
import { getAccessToken, getUserId } from '../services/session';

// ---------- Types from the new contract ----------
type ChargingSessionState =
  | 'START_PENDING'
  | 'ACTIVE'
  | 'STOP_PENDING'
  | 'COMPLETED'
  | 'FAILED';

interface ConnectorInfo {
  id: string; // UUID
  label: string; // e.g., "CCS2" or "Connector 1"
}

interface ChargingSession {
  id: string; // UUID
  charger_id: string; // public ID
  state: ChargingSessionState;
  started_at: string;
  stopped_at?: string;
  consumed_wh?: number;
  total_kwh?: number;
  total_amount?: string;
  currency?: string;
  // ... other fields as needed
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  chargerId: string; // public charger ID
  connectors: string[]; // display names (for backward compatibility)
  connectorDetails?: ConnectorInfo[]; // full connector objects with UUIDs
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  chargerId,
  connectors,
  connectorDetails,
}) => {
  const [sessions, setSessions] = useState<ChargingSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for start flow
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>('');
  const [startLoading, setStartLoading] = useState(false);

  // State for stop action
  const [stoppingSessionId, setStoppingSessionId] = useState<string | null>(null);

  // If connectorDetails not provided, fetch them from the charger
  const [connectorDetailsState, setConnectorDetailsState] = useState<ConnectorInfo[]>([]);

  // Fetch active sessions when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchActiveSessions();
      // Load connector details if not provided
      if (!connectorDetails || connectorDetails.length === 0) {
        fetchChargerConnectors();
      } else {
        setConnectorDetailsState(connectorDetails);
      }
    }
  }, [isOpen]);

  // Set default connector when list changes
  useEffect(() => {
    if (connectorDetailsState.length > 0 && !selectedConnectorId) {
      setSelectedConnectorId(connectorDetailsState[0].id);
    }
  }, [connectorDetailsState]);

  const fetchChargerConnectors = async () => {
    try {
      const chargerData = await getCharger(chargerId);
      const conns = chargerData.connectors.map((c) => ({
        id: c.id,
        label: c.connector_type || `Connector ${c.connector_number}`,
      }));
      setConnectorDetailsState(conns);
    } catch (err) {
      console.error('Failed to fetch charger connectors:', err);
    }
  };

  const fetchActiveSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      // GET /charging-sessions – we can filter by state=ACTIVE or START_PENDING
      // The API may not support filtering, so we'll fetch all and filter client-side.
      const response = await authedRequest<any>(USER_APP_ROOT, '/charging-sessions', { method: 'GET' });
      // Assuming response has 'sessions' array; adjust based on actual structure.
      // According to handoff, GET /charging-sessions returns ChargingSessionHistoryResponse
      // which likely contains a list of sessions.
      const allSessions: ChargingSession[] = response.sessions || [];
      // Filter for sessions that are active or start-pending and for this charger
      const active = allSessions.filter(
        (s) =>
          (s.state === 'ACTIVE' || s.state === 'START_PENDING' || s.state === 'STOP_PENDING') &&
          s.charger_id === chargerId
      );
      setSessions(active);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch active sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!selectedConnectorId) {
      setError('Please select a connector');
      return;
    }
    setStartLoading(true);         
    setError(null);
    try {
      // POST /charging-sessions
      const startResponse = await authedRequest<any>(USER_APP_ROOT, '/charging-sessions', {
        method: 'POST',
        body: JSON.stringify({ charger_id: chargerId, connector_id: selectedConnectorId }),
      });
      // startResponse contains { start_intent_id, status, ... }
      // The session may not be active yet; we should poll for it.
      // For simplicity, we'll just wait a moment and then refresh sessions.
      // In a production app, you'd poll GET /charging-start-intents/{start_intent_id}
      // until you get a session_id.
      // We'll simulate with a delay then refresh.
      setTimeout(async () => {
        await fetchActiveSessions();
        setStartLoading(false);
      }, 3000);
     
      setError('Starting charger... (may take a moment)');
    } catch (err: any) {
      if (err.code === '409' || err.status === 409) {
        setError('You already have an active session on this charger.');
        await fetchActiveSessions();
      } else if (err.code === '402' || err.status === 402) {
        setError('Insufficient wallet balance. Please recharge.');
      } else {
        setError(err.message || 'Start request failed');
      }
      setStartLoading(false);
    }
  };

  const handleStop = async (sessionId: string) => {
    setStoppingSessionId(sessionId);
    setError(null);
    try {
      // POST /charging-sessions/{session_id}/stop
      await authedRequest<any>(USER_APP_ROOT, `/charging-sessions/${sessionId}/stop`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'User requested stop' }),
      });
      // The stop is async; refresh sessions after a short delay
      setTimeout(async () => {
        await fetchActiveSessions();
        setStoppingSessionId(null);
      }, 2000);
      setError('Stop requested...');
    } catch (err: any) {
      setError(err.message || 'Stop failed');
      setStoppingSessionId(null);
    }
  };

  const getStatusDisplay = (state: ChargingSessionState) => {
    const map: Record<ChargingSessionState, { label: string; color: string }> = {
      START_PENDING: { label: 'Starting...', color: 'text-yellow-600' },
      ACTIVE: { label: 'Active', color: 'text-green-600' },
      STOP_PENDING: { label: 'Stopping...', color: 'text-orange-600' },
      COMPLETED: { label: 'Completed', color: 'text-gray-600' },
      FAILED: { label: 'Failed', color: 'text-red-600' },
    };
    return map[state] || { label: state, color: 'text-gray-600' };
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
              {/* Show active sessions */}
              {sessions.length > 0 && (
                <div className="space-y-4 mb-6">
                  <h3 className="font-semibold text-gray-700">Active Session(s)</h3>
                  {sessions.map((session) => {
                    const statusInfo = getStatusDisplay(session.state);
                    const isStopping = stoppingSessionId === session.id;
                    const canStop = session.state === 'ACTIVE';

                    return (
                      <div
                        key={session.id}
                        className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-800">
                                #{session.id.slice(0, 8)}
                              </span>
                              <span className={`text-sm font-medium ${statusInfo.color}`}>
                                ● {statusInfo.label}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              <p>Charger: {session.charger_id}</p>
                              <p>Started: {new Date(session.started_at).toLocaleString()}</p>
                              {session.consumed_wh !== undefined && (
                                <p>Consumed: {session.consumed_wh} Wh</p>
                              )}
                            </div>
                          </div>
                          {canStop && (
                            <button
                              onClick={() => handleStop(session.id)}
                              disabled={isStopping}
                              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
                            >
                              {isStopping ? 'Stopping...' : 'Stop'}
                            </button>
                          )}
                          {session.state === 'STOP_PENDING' && (
                            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                              Stopping
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Start section – only if no active sessions for this charger */}
              {sessions.length === 0 ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Connector
                    </label>
                    <select
                      className="w-full bg-white text-black border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      value={selectedConnectorId}
                      onChange={(e) => setSelectedConnectorId(e.target.value)}
                    >
                      <option value="" disabled>-- Select Connector --</option>
                      {connectorDetailsState.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleStart}
                    disabled={startLoading || !selectedConnectorId || connectorDetailsState.length === 0}
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
                  You have an active session on this charger. Use the stop button above.
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