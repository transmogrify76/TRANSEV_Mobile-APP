import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaHome, FaWallet, FaRupeeSign, FaHistory, FaArrowUp, FaSpinner } from 'react-icons/fa';
import {
  createRechargeOrder,
  getWallet,
  getWalletTransactions,
  verifyRechargeOrder,
} from '../services/customerApi';
import { CustomerWalletTransaction, CustomerWalletDetails } from '../types/auth';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Helper to generate idempotency key
const generateIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

// Define the actual API response shape for wallet
interface WalletApiResponse {
  wallet: CustomerWalletDetails;
}

const Wallet: React.FC = () => {
  const history = useHistory();
  const [balance, setBalance] = useState<string>('0.00');
  const [currency, setCurrency] = useState<string>('INR');
  const [selectedAmount, setSelectedAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<CustomerWalletTransaction[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const fetchBalance = async () => {
    try {
      // Cast the response to the actual shape
     const response = (await getWallet()) as unknown as WalletApiResponse;
      setBalance(response.wallet.balance);
      setCurrency(response.wallet.currency);
    } catch {
      toast.error('Failed to fetch balance');
    }
  };

  const fetchTransactions = async () => {
    setIsFetchingHistory(true);
    setHistoryError('');
    try {
      const result = await getWalletTransactions();
      setTransactions(result.transactions || []);
    } catch {
      setHistoryError('Failed to load transaction history');
    } finally {
      setIsFetchingHistory(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchTransactions();
  }, []);

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      document.body.appendChild(script);
    });

  const handlePayment = async () => {
    if (!selectedAmount) {
      toast.warn('Select an amount');
      return;
    }
    setLoading(true);

    try {
      await loadRazorpayScript();

      const order = await createRechargeOrder(selectedAmount.toFixed(2), generateIdempotencyKey());

      if (!order.provider_key_id) {
        toast.error('Unable to start payment. Please try again.');
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: order.provider_key_id,
        amount: order.amount_minor,
        currency: order.currency,
        name: 'TransEV',
        description: 'Wallet Recharge',
        image: 'https://transev.in/assets/up-B0GM0qzi.png',
        order_id: order.provider_order_id,
        handler: async (response: any) => {
          try {
            await verifyRechargeOrder({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Recharge successful!');
            fetchBalance();
            fetchTransactions();
          } catch (err) {
            console.error('Recharge verification error:', err);
            toast.error('Verification failed. Please contact support if the amount was debited.');
          }
        },
        theme: { color: '#4d6b2d' },
        modal: {
          ondismiss: () => {
            toast.info('Payment cancelled');
          },
        },
      });

      rzp.open();
    } catch (err) {
      console.error('Payment initiation error:', err);
      toast.error('Recharge failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-gradient-to-br from-brand-50 via-white to-blue-50 p-3 sm:p-4">
      <div className="max-w-md mx-auto pb-6">
        {/* Back Button */}
        <div className="mb-4">
          <button
            onClick={() => history.push('/dashboard')}
            className="p-3 bg-brand-600 rounded-full shadow-lg hover:bg-brand-700 transition-all duration-200"
            aria-label="Back to dashboard"
          >
            <FaHome className="text-white text-xl" />
          </button>
        </div>

        {/* Wallet Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 px-5 sm:px-6 py-6">
            <div className="flex items-center justify-between text-white">
              <div className="min-w-0">
                <p className="text-brand-100 text-sm">Your Balance</p>
                <p className="text-3xl sm:text-4xl font-bold tracking-tight truncate">
                  ₹{parseFloat(balance).toFixed(2)}
                </p>
                <p className="text-brand-100 text-xs mt-1">{currency}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-full flex-shrink-0">
                <FaWallet className="text-2xl" />
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {/* Recharge Section */}
            <div className="mb-6">
              <h2 className="text-gray-700 font-semibold mb-3 flex items-center gap-2">
                <FaRupeeSign className="text-brand-600" />
                Recharge Amount
              </h2>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[100, 200, 500, 1000].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => setSelectedAmount(amount)}
                    className={`py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                      selectedAmount === amount
                        ? 'bg-brand-600 text-white shadow-md scale-95'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ₹{amount}
                  </button>
                ))}
              </div>
              <button
                onClick={handlePayment}
                disabled={!selectedAmount || loading}
                className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white py-3 rounded-xl font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FaArrowUp />
                    Pay ₹{selectedAmount}
                  </>
                )}
              </button>
            </div>

            {/* Transaction History */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-gray-700 font-semibold flex items-center gap-2">
                  <FaHistory className="text-brand-600" />
                  Wallet Activity
                </h2>
              </div>

              {isFetchingHistory ? (
                <div className="flex justify-center py-8">
                  <FaSpinner className="animate-spin text-brand-600 text-2xl" />
                </div>
              ) : historyError ? (
                <div className="text-center py-8">
                  <p className="text-red-500 text-sm mb-2">{historyError}</p>
                  <button
                    onClick={fetchTransactions}
                    className="px-4 py-1.5 bg-brand-600 text-white rounded-full text-xs font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <FaHistory className="mx-auto text-gray-300 text-3xl mb-2" />
                  <p className="text-gray-400 text-sm">No wallet activity yet</p>
                  <p className="text-gray-400 text-xs mt-1">Your transactions will appear here</p>
                </div>
              ) : (
                <div className="space-y-3 pr-1">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p
                            className={`font-bold text-base sm:text-lg ${
                              tx.transaction_type === 'CREDIT' ? 'text-green-600' : 'text-gray-800'
                            }`}
                          >
                            {tx.transaction_type === 'CREDIT' ? '+' : '-'} ₹{tx.amount}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{tx.description}</p>
                          <span
                            className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              tx.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : tx.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-gray-500">{formatDate(tx.created_at)}</p>
                          <p className="text-xs text-gray-400">{formatTime(tx.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;