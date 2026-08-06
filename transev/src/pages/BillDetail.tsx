import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useHistory } from 'react-router-dom';
import { FaHome, FaDownload, FaArrowLeft, FaSpinner } from 'react-icons/fa';
import { format } from 'date-fns';
import { API_BASE, API_AUTH_KEY } from '../config';
import { generateBillPDF } from '../utils/pdfGenerator';

interface Bill {
  id: string;
  uid: string;
  userid: string;
  chargerid: string;
  username: string;
  walletid: string;
  lasttransaction: string;
  balancededuct: string;
  energyconsumption: string;
  chargingtime: string;
  taxableamount: string;
  gstamount: string;
  totalamount: string;
  associatedadminid: string;
  createdAt: string;
  updatedAt: string;
  full_address?: string;
  hubinfo?: { hubname: string };
  charger_type?: string;
}

const BillDetail: React.FC = () => {
  const { billid } = useParams<{ billid: string }>();
  const history = useHistory();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);

  useEffect(() => {
    fetchBillDetail();
  }, [billid]);

  const fetchBillDetail = async () => {
    try {
      const response = await axios.post(
        `${API_BASE}/users/getbilldatabyid`,
        { billid },
        { headers: { apiauthkey: API_AUTH_KEY } }
      );
      setBill(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load bill details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!bill) return;
    setPdfGenerating(true);
    try {
      await generateBillPDF(bill);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        <p className="ml-3 text-brand-600">Loading bill details...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || 'Bill not found'}</p>
        <button
          onClick={() => history.push('/bills')}
          className="ml-4 bg-brand-500 text-white px-4 py-2 rounded"
        >
          Back to Bills
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-brand-100 via-brand-200 to-blue-100 p-6">
      <div className="max-w-2xl mx-auto bg-white bg-opacity-60 backdrop-blur-xl rounded-3xl shadow-2xl p-8">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => history.push('/bills')}
            className="flex items-center text-brand-600 hover:text-brand-800"
          >
            <FaArrowLeft className="mr-1" /> Back
          </button>
          <button
            onClick={() => history.push('/dashboard')}
            className="p-2 bg-brand-500 rounded-full shadow-md hover:bg-brand-600 transition"
          >
            <FaHome className="text-white" />
          </button>
        </div>

        <h1 className="text-3xl font-bold text-brand-800 mb-6">Bill Details</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-sm">Bill ID</p>
              <p className="font-semibold">{bill.uid}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Date</p>
              <p className="font-semibold">{format(new Date(bill.createdAt), 'dd MMM yyyy HH:mm')}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Charger ID</p>
              <p className="font-semibold">{bill.chargerid}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">User</p>
              <p className="font-semibold">{bill.username}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Energy Consumed</p>
              <p className="font-semibold">{bill.energyconsumption} kWh</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Charging Time</p>
              <p className="font-semibold">{bill.chargingtime}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Taxable Amount</p>
              <p className="font-semibold">₹{bill.taxableamount}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">GST Amount</p>
              <p className="font-semibold">₹{bill.gstamount}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 text-sm">Total Amount</p>
              <p className="text-2xl font-bold text-brand-700">₹{bill.totalamount}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 text-sm">Transaction</p>
              <p className="font-mono text-sm">{bill.lasttransaction}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={handleDownloadPDF}
            disabled={pdfGenerating}
            className="bg-brand-500 text-white px-6 py-2 rounded-full flex items-center justify-center space-x-2 mx-auto hover:bg-brand-600 transition disabled:opacity-50"
          >
            {pdfGenerating ? (
              <>
                <FaSpinner className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FaDownload />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillDetail;