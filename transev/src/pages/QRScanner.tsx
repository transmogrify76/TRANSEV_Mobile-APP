import React, { useState } from 'react';
import QrReader from 'react-qr-barcode-scanner';
import Modal from './Modal';
import { FaQrcode, FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import { getUserId as getStoredUserId } from '../services/session';

const QRScannerComponent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [scannedData, setScannedData] = useState<any>(null);
  const [availableConnectors, setAvailableConnectors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [scanning, setScanning] = useState(true);

  const STATUS_API = "https://dev-ocpphalapi.transev.site/api/status";
  const OCPP_API_KEY = "J9YtyNYdbLD8N4qMwU2WQrr9XV2SJn4Q3qrCLEcHa8wwaZC34xhAd3RotuYdHwiB";

  const getUserId = (): string | null => getStoredUserId();

  const handleError = (err: any) => {
    setError(err?.message || "Scanning failed");
    setScanning(false);
  };

  const fetchChargerStatus = async (uid: string) => {
    const response = await fetch(STATUS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": OCPP_API_KEY,
      },
      body: JSON.stringify({ uid }),
    });

    const result = await response.json();
    if (!response.ok || !result.connectors) {
      throw new Error(result?.error || "Charger status fetch failed");
    }

    const connectors = Object.entries(result.connectors)
      .filter(([_, conn]: any) => conn.status === "Available")
      .map(([key]) => key);

    return {
      isOperative: result.status === "Active",
      connectors,
    };
  };

  const handleUpdate = async (_: any, result: any) => {
    if (!result?.text) return;
    setScanning(false);
    try {
      const parsed = JSON.parse(result.text);
      const uid = parsed.uid;

      const { connectors } = await fetchChargerStatus(uid);
      setScannedData(parsed);
      setAvailableConnectors(connectors);
      setModalOpen(true);
    } catch (err: any) {
      setError(`QR Parse/Status Error: ${err.message}`);
    } finally {
      setScanning(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl w-full max-w-md mx-auto overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <FaQrcode className="text-white text-2xl" />
            <h2 className="text-xl font-bold text-white">Scan Charger QR</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition p-1"
          >
            <FaTimes className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 text-sm text-center mb-4">
            Align the QR code within the frame to start charging
          </p>

          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
              <FaExclamationTriangle className="text-red-500 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Scanner Container */}
          <div className="relative rounded-xl overflow-hidden shadow-lg border-2 border-brand-200 bg-black/5">
            <div className="relative">
              <QrReader
                delay={300}
                onError={handleError}
                onUpdate={handleUpdate}
              />
              {/* Animated scanning line */}
              {scanning && !error && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-1 bg-brand-500 animate-scan"></div>
                  <div className="absolute inset-0 border-2 border-brand-400 rounded-xl animate-pulse"></div>
                </div>
              )}
            </div>
            {/* Guide frame - no blur, just a border and icon */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 border-2 border-brand-400 rounded-lg shadow-lg bg-transparent flex items-center justify-center">
                <FaQrcode className="text-brand-500 text-5xl opacity-40" />
              </div>
            </div>
          </div>

          {/* Scanned Data Card */}
          {scannedData && (
            <div className="mt-5 bg-brand-50 border border-brand-200 rounded-xl p-4 animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-green-600" />
                <h3 className="font-semibold text-brand-800">Charger Detected</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p><strong className="text-gray-700">Name:</strong> <span className="text-gray-900">{scannedData?.ChargerName}</span></p>
                <p><strong className="text-gray-700">UID:</strong> <span className="font-mono text-gray-900">{scannedData?.uid}</span></p>
                {scannedData?.Chargertype && (
                  <p><strong className="text-gray-700">Type:</strong> {scannedData.Chargertype}</p>
                )}
                {scannedData?.Total_Capacity && (
                  <p><strong className="text-gray-700">Capacity:</strong> {scannedData.Total_Capacity}</p>
                )}
                {scannedData?.Connector_type && (
                  <p><strong className="text-gray-700">Connector:</strong> {scannedData.Connector_type}</p>
                )}
                {scannedData?.full_address && (
                  <p><strong className="text-gray-700">Address:</strong> {scannedData.full_address}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  chargerId={scannedData?.uid}
  connectors={availableConnectors}
/>
    </div>
  );
};

export default QRScannerComponent;