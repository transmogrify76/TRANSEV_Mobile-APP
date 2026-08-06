import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { FaHome, FaFilePdf, FaSortUp, FaSortDown, FaCalendarAlt, FaChargingStation, FaFilter, FaTimes, FaRupeeSign, FaReceipt, FaBug } from 'react-icons/fa';
import { format } from 'date-fns';
import { API_BASE, API_AUTH_KEY } from '../config';
import { getUserId } from '../services/session';

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
}

interface Pagination {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface Filters {
  sortOrder: 'asc' | 'desc';
  fromDate: string;
  toDate: string;
  chargerid: string;
}

interface Charger {
  uid: string;
}

const BillList: React.FC = () => {
  const history = useHistory();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<Filters>({
    sortOrder: 'desc',
    fromDate: '',
    toDate: '',
    chargerid: '',
  });
  const [page, setPage] = useState(1);
  const limit = 10;

  // Demo mode state
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [chargers, setChargers] = useState<Charger[]>([]);
  const [chargersLoading, setChargersLoading] = useState(true);

  const userid = getUserId() || '';

  // Compute totals from current bills
  const totalAmount = bills.reduce((sum, bill) => sum + parseFloat(bill.totalamount || '0'), 0);
  const totalBills = bills.length;

  // Fetch chargers for dropdown (still used in normal mode)
  useEffect(() => {
    const fetchChargers = async () => {
      try {
        const response = await fetch(`${API_BASE}/admin/listofcharges`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apiauthkey: API_AUTH_KEY,
          },
        });
        const data = await response.json();
        if (data && data.data) {
          setChargers(data.data);
        } else {
          setChargers([]);
        }
      } catch (err) {
        console.error('Error fetching chargers:', err);
      } finally {
        setChargersLoading(false);
      }
    };
    fetchChargers();
  }, []);

  useEffect(() => {
    if (!isDemoMode && !userid) {
      history.push('/login');
      return;
    }
    fetchBills();
  }, [filters, page, userid, isDemoMode]);

  const fetchBills = async () => {
    setLoading(true);
    setError('');
    try {
      let payload: any;
      if (isDemoMode) {
        // Demo mode: send { demo: true }
        payload = { demo: true };
      } else {
        // Normal mode: send user filters
        payload = {
          userid,
          sortOrder: filters.sortOrder,
          fromDate: filters.fromDate || undefined,
          toDate: filters.toDate || undefined,
          chargerid: filters.chargerid || undefined,
          page,
          limit,
        };
      }

      const response = await axios.post(
        `${API_BASE}/users/getbilldata`,
        payload,
        {
          headers: { apiauthkey: API_AUTH_KEY },
        }
      );

      // Demo response may not have pagination; we'll create a dummy one
      if (isDemoMode) {
        setBills(response.data.data || []);
        setPagination({
          totalRecords: response.data.data?.length || 0,
          totalPages: 1,
          currentPage: 1,
          pageSize: response.data.data?.length || 0,
          hasNextPage: false,
          hasPreviousPage: false,
        });
      } else {
        setBills(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const toggleSortOrder = () => {
    setFilters((prev) => ({
      ...prev,
      sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }));
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const clearFilters = () => {
    setFilters({ sortOrder: 'desc', fromDate: '', toDate: '', chargerid: '' });
    setPage(1);
  };

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
    setPage(1);
    setFilters({ sortOrder: 'desc', fromDate: '', toDate: '', chargerid: '' });
  };

  const downloadPDF = (bill: Bill) => {
    history.push(`/bill-detail/${bill.uid}`);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  const hasActiveFilters = () => {
    return filters.fromDate || filters.toDate || filters.chargerid || filters.sortOrder !== 'desc';
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50">
      {/* Header */}
      <div className="flex-none p-4 pb-0">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-4 md:p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FaReceipt className="text-brand-600 text-2xl" />
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
                My Bills
              </h1>
            </div>
            <div className="flex gap-2">
              {/* Demo Mode Toggle Button */}
              <button
                onClick={toggleDemoMode}
                className={`flex items-center gap-1 px-3 py-2 rounded-full transition ${
                  isDemoMode
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <FaBug className="text-sm" />
                <span className="text-sm font-medium">{isDemoMode ? 'Demo Mode ON' : 'Demo Mode'}</span>
              </button>
              <button
                onClick={() => history.push('/dashboard')}
                className="p-2 md:p-3 bg-brand-600 hover:bg-brand-700 rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <FaHome className="text-white text-lg md:text-xl" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-4 flex items-center gap-3">
              <div className="p-3 bg-brand-100 rounded-full">
                <FaReceipt className="text-brand-600 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Bills</p>
                <p className="text-2xl font-bold text-gray-800">{pagination?.totalRecords ?? totalBills}</p>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-4 flex items-center gap-3">
              <div className="p-3 bg-brand-100 rounded-full">
                <FaRupeeSign className="text-brand-600 text-xl" />
              </div>
              <div>
                <p className="text-gray-500 text-sm">Total Amount</p>
                <p className="text-2xl font-bold text-gray-800">₹{totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Filters Card (only show in normal mode) */}
          {!isDemoMode && (
            <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <FaFilter className="text-brand-600" />
                <h2 className="text-lg font-semibold text-gray-700">Filter Bills</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort by Date</label>
                  <button
                    onClick={toggleSortOrder}
                    className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition text-gray-900"
                  >
                    <span>{filters.sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
                    {filters.sortOrder === 'desc' ? <FaSortDown /> : <FaSortUp />}
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <FaCalendarAlt className="text-brand-500" /> From
                  </label>
                  <input
                    type="date"
                    value={filters.fromDate}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-300 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <FaCalendarAlt className="text-brand-500" /> To
                  </label>
                  <input
                    type="date"
                    value={filters.toDate}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-300 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <FaChargingStation className="text-brand-500" /> Charger
                  </label>
                  <select
                    value={filters.chargerid}
                    onChange={(e) => handleFilterChange('chargerid', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-300 focus:border-brand-300 text-gray-900"
                    disabled={chargersLoading}
                  >
                    <option value="">All Chargers</option>
                    {chargers.map((charger) => (
                      <option key={charger.uid} value={charger.uid} className="text-gray-900">
                        {charger.uid}
                      </option>
                    ))}
                  </select>
                  {chargersLoading && (
                    <p className="text-xs text-gray-400 mt-1">Loading chargers...</p>
                  )}
                </div>
              </div>
              {hasActiveFilters() && (
                <div className="mt-4 text-right">
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 transition"
                  >
                    <FaTimes /> Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Demo Mode Info Banner */}
          {isDemoMode && (
            <div className="bg-brand-50 border-l-4 border-brand-500 p-4 rounded-lg">
              <p className="text-brand-700 text-sm">
                <FaBug className="inline mr-2" />
                You are viewing demo bills. Click "Demo Mode" again to return to your real bills.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
              <p>{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
              <p className="ml-3 text-brand-600">Loading bills...</p>
            </div>
          )}

          {/* Empty State */}
          {!loading && bills.length === 0 && !error && (
            <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-12 text-center">
              <FaChargingStation className="text-4xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">No bills found.</p>
              <p className="text-gray-400">Try adjusting your filters or {!isDemoMode && 'recharge your wallet to see transactions.'}</p>
            </div>
          )}

          {/* Bills Table */}
          {bills.length > 0 && (
            <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-brand-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-brand-800 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-brand-800 uppercase tracking-wider">Charger ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-brand-800 uppercase tracking-wider">Energy (kWh)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-brand-800 uppercase tracking-wider">Amount (₹)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-brand-800 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(bill.createdAt)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
                          {bill.chargerid}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {bill.energyconsumption}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-brand-700">
                          ₹{bill.totalamount}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <button
                            onClick={() => downloadPDF(bill)}
                            className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 transition"
                          >
                            <FaFilePdf /> <span>PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination (only in normal mode) */}
              {!isDemoMode && pagination && pagination.totalPages > 1 && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.currentPage - 1) * pagination.pageSize + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRecords)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.totalRecords}</span> results
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={!pagination.hasPreviousPage}
                      className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                      className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillList;


// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { jwtDecode } from 'jwt-decode';
// import { useHistory } from 'react-router-dom';
// import {
//   FaHome,
//   FaFilePdf,
//   FaSortUp,
//   FaSortDown,
//   FaCalendarAlt,
//   FaChargingStation,
//   FaFilter,
//   FaTimes,
//   FaRupeeSign,
//   FaReceipt,
// } from 'react-icons/fa';
// import { format } from 'date-fns';
// import { API_BASE, API_AUTH_KEY } from '../config';

// interface DecodedToken {
//   userid: string;
// }

// interface Bill {
//   id: string;
//   uid: string;
//   userid: string;
//   chargerid: string;
//   username: string;
//   walletid: string;
//   lasttransaction: string;
//   balancededuct: string;
//   energyconsumption: string;
//   chargingtime: string;
//   taxableamount: string;
//   gstamount: string;
//   totalamount: string;
//   associatedadminid: string;
//   createdAt: string;
//   updatedAt: string;
// }

// interface Pagination {
//   totalRecords: number;
//   totalPages: number;
//   currentPage: number;
//   pageSize: number;
//   hasNextPage: boolean;
//   hasPreviousPage: boolean;
// }

// interface Filters {
//   sortOrder: 'asc' | 'desc';
//   fromDate: string;
//   toDate: string;
//   chargerid: string;
// }

// interface Charger {
//   uid: string;
// }

// const BillList: React.FC = () => {
//   const history = useHistory();
//   const [bills, setBills] = useState<Bill[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState('');
//   const [pagination, setPagination] = useState<Pagination | null>(null);
//   const [filters, setFilters] = useState<Filters>({
//     sortOrder: 'desc',
//     fromDate: '',
//     toDate: '',
//     chargerid: '',
//   });
//   const [page, setPage] = useState(1);
//   const limit = 10;

//   const [chargers, setChargers] = useState<Charger[]>([]);
//   const [chargersLoading, setChargersLoading] = useState(true);

//   const token = localStorage.getItem('token');
//   const decoded: DecodedToken | null = token ? jwtDecode(token) : null;
//   const userid = decoded?.userid || '';

//   // Compute totals from current bills
//   const totalAmount = bills.reduce((sum, bill) => sum + parseFloat(bill.totalamount || '0'), 0);
//   const totalBills = bills.length;

//   // Fetch chargers for dropdown
//   useEffect(() => {
//     const fetchChargers = async () => {
//       try {
//         const response = await fetch(`${API_BASE}/admin/listofcharges`, {
//           method: 'GET',
//           headers: {
//             'Content-Type': 'application/json',
//             apiauthkey: API_AUTH_KEY,
//           },
//         });
//         const data = await response.json();
//         if (data && data.data) {
//           setChargers(data.data);
//         } else {
//           setChargers([]);
//         }
//       } catch (err) {
//         console.error('Error fetching chargers:', err);
//       } finally {
//         setChargersLoading(false);
//       }
//     };
//     fetchChargers();
//   }, []);

//   useEffect(() => {
//     if (!userid) {
//       history.push('/login');
//       return;
//     }
//     fetchBills();
//   }, [filters, page, userid]);

//   const fetchBills = async () => {
//     setLoading(true);
//     setError('');
//     try {
//       const response = await axios.post(
//         `${API_BASE}/users/getbilldata`,
//         {
//           userid,
//           sortOrder: filters.sortOrder,
//           fromDate: filters.fromDate || undefined,
//           toDate: filters.toDate || undefined,
//           chargerid: filters.chargerid || undefined,
//           page,
//           limit,
//         },
//         {
//           headers: { apiauthkey: API_AUTH_KEY },
//         }
//       );
//       setBills(response.data.data);
//       setPagination(response.data.pagination);
//     } catch (err: any) {
//       setError(err.response?.data?.message || 'Failed to load bills');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleFilterChange = (key: keyof Filters, value: string) => {
//     setFilters((prev) => ({ ...prev, [key]: value }));
//     setPage(1);
//   };

//   const toggleSortOrder = () => {
//     setFilters((prev) => ({
//       ...prev,
//       sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc',
//     }));
//     setPage(1);
//   };

//   const handlePageChange = (newPage: number) => {
//     setPage(newPage);
//   };

//   const clearFilters = () => {
//     setFilters({ sortOrder: 'desc', fromDate: '', toDate: '', chargerid: '' });
//     setPage(1);
//   };

//   const downloadPDF = (bill: Bill) => {
//     history.push(`/bill-detail/${bill.uid}`);
//   };

//   const formatDate = (dateStr: string) => {
//     try {
//       return format(new Date(dateStr), 'dd MMM yyyy HH:mm');
//     } catch {
//       return dateStr;
//     }
//   };

//   // Helper to determine if any filter is active
//   const hasActiveFilters = () => {
//     return filters.fromDate || filters.toDate || filters.chargerid || filters.sortOrder !== 'desc';
//   };

//   return (
//     // Main container: full viewport height, scrollable content
//     <div className="h-screen bg-gradient-to-br from-brand-50 via-white to-blue-50 flex flex-col">
//       {/* Header with fixed height, ensures scrolling area is below */}
//       <div className="flex-none p-6 pb-0">
//         <div className="max-w-7xl mx-auto">
//           <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-4 md:p-6 flex justify-between items-center">
//             <div className="flex items-center gap-3">
//               <FaReceipt className="text-brand-600 text-2xl" />
//               <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
//                 My Bills
//               </h1>
//             </div>
//             <button
//               onClick={() => history.push('/dashboard')}
//               className="p-2 md:p-3 bg-brand-600 hover:bg-brand-700 rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
//             >
//               <FaHome className="text-white text-lg md:text-xl" />
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Scrollable content */}
//       <div className="flex-1 overflow-y-auto p-6">
//         <div className="max-w-7xl mx-auto space-y-6">
//           {/* Summary Cards */}
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-4 flex items-center gap-3">
//               <div className="p-3 bg-brand-100 rounded-full">
//                 <FaReceipt className="text-brand-600 text-xl" />
//               </div>
//               <div>
//                 <p className="text-gray-500 text-sm">Total Bills</p>
//                 <p className="text-2xl font-bold text-gray-800">{pagination?.totalRecords ?? totalBills}</p>
//               </div>
//             </div>
//             <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-4 flex items-center gap-3">
//               <div className="p-3 bg-brand-100 rounded-full">
//                 <FaRupeeSign className="text-brand-600 text-xl" />
//               </div>
//               <div>
//                 <p className="text-gray-500 text-sm">Total Amount</p>
//                 <p className="text-2xl font-bold text-gray-800">₹{totalAmount.toFixed(2)}</p>
//               </div>
//             </div>
//           </div>

//           {/* Filters Card */}
//           <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-4 md:p-6">
//             <div className="flex items-center gap-2 mb-4">
//               <FaFilter className="text-brand-600" />
//               <h2 className="text-lg font-semibold text-gray-700">Filter Bills</h2>
//             </div>

//             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//               {/* Sort Order */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Sort by Date</label>
//                 <button
//                   onClick={toggleSortOrder}
//                   className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition text-gray-900"
//                 >
//                   <span>{filters.sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
//                   {filters.sortOrder === 'desc' ? <FaSortDown /> : <FaSortUp />}
//                 </button>
//               </div>

//               {/* Date From */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
//                   <FaCalendarAlt className="text-brand-500" /> From
//                 </label>
//                 <input
//                   type="date"
//                   value={filters.fromDate}
//                   onChange={(e) => handleFilterChange('fromDate', e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-300 text-gray-900 bg-white"
//                 />
//               </div>

//               {/* Date To */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
//                   <FaCalendarAlt className="text-brand-500" /> To
//                 </label>
//                 <input
//                   type="date"
//                   value={filters.toDate}
//                   onChange={(e) => handleFilterChange('toDate', e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-300 text-gray-900 bg-white"
//                 />
//               </div>

//               {/* Charger Dropdown */}
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
//                   <FaChargingStation className="text-brand-500" /> Charger
//                 </label>
//                 <select
//                   value={filters.chargerid}
//                   onChange={(e) => handleFilterChange('chargerid', e.target.value)}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-brand-300 focus:border-brand-300 text-gray-900"
//                   disabled={chargersLoading}
//                 >
//                   <option value="">All Chargers</option>
//                   {chargers.map((charger) => (
//                     <option key={charger.uid} value={charger.uid} className="text-gray-900">
//                       {charger.uid}
//                     </option>
//                   ))}
//                 </select>
//                 {chargersLoading && (
//                   <p className="text-xs text-gray-400 mt-1">Loading chargers...</p>
//                 )}
//               </div>
//             </div>

//             {/* Clear Filters Button */}
//             {hasActiveFilters() && (
//               <div className="mt-4 text-right">
//                 <button
//                   onClick={clearFilters}
//                   className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 transition"
//                 >
//                   <FaTimes /> Clear all filters
//                 </button>
//               </div>
//             )}
//           </div>

//           {/* Error Message */}
//           {error && (
//             <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
//               <p>{error}</p>
//             </div>
//           )}

//           {/* Loading State */}
//           {loading && (
//             <div className="flex justify-center items-center py-12">
//               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
//               <p className="ml-3 text-brand-600">Loading bills...</p>
//             </div>
//           )}

//           {/* Empty State */}
//           {!loading && bills.length === 0 && !error && (
//             <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-12 text-center">
//               <FaChargingStation className="text-4xl text-gray-300 mx-auto mb-4" />
//               <p className="text-gray-500 text-lg">No bills found.</p>
//               <p className="text-gray-400">Try adjusting your filters or recharge your wallet to see transactions.</p>
//             </div>
//           )}

//           {/* Bills Table */}
//           {bills.length > 0 && (
//             <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg overflow-hidden">
//               <div className="overflow-x-auto">
//                 <table className="min-w-full divide-y divide-gray-200">
//                   <thead className="bg-brand-50 sticky top-0">
//                     <tr>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-brand-800 uppercase tracking-wider">Date</th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-brand-800 uppercase tracking-wider">Charger ID</th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-brand-800 uppercase tracking-wider">Energy (kWh)</th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-brand-800 uppercase tracking-wider">Amount (₹)</th>
//                       <th className="px-4 py-3 text-left text-xs font-medium text-brand-800 uppercase tracking-wider">Actions</th>
//                     </tr>
//                   </thead>
//                   <tbody className="bg-white divide-y divide-gray-200">
//                     {bills.map((bill) => (
//                       <tr key={bill.id} className="hover:bg-gray-50 transition">
//                         <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
//                           {formatDate(bill.createdAt)}
//                         </td>
//                         <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600">
//                           {bill.chargerid}
//                         </td>
//                         <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
//                           {bill.energyconsumption}
//                         </td>
//                         <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-brand-700">
//                           ₹{bill.totalamount}
//                         </td>
//                         <td className="px-4 py-3 whitespace-nowrap text-sm">
//                           <button
//                             onClick={() => downloadPDF(bill)}
//                             className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 transition"
//                           >
//                             <FaFilePdf /> <span>PDF</span>
//                           </button>
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>

//               {/* Pagination */}
//               {pagination && pagination.totalPages > 1 && (
//                 <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
//                   <div className="text-sm text-gray-700">
//                     Showing <span className="font-medium">{(pagination.currentPage - 1) * pagination.pageSize + 1}</span> to{' '}
//                     <span className="font-medium">
//                       {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRecords)}
//                     </span>{' '}
//                     of <span className="font-medium">{pagination.totalRecords}</span> results
//                   </div>
//                   <div className="flex gap-2">
//                     <button
//                       onClick={() => handlePageChange(pagination.currentPage - 1)}
//                       disabled={!pagination.hasPreviousPage}
//                       className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                       Previous
//                     </button>
//                     <button
//                       onClick={() => handlePageChange(pagination.currentPage + 1)}
//                       disabled={!pagination.hasNextPage}
//                       className="px-3 py-1 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                       Next
//                     </button>
//                   </div>
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BillList;