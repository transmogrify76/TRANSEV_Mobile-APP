import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { getUserId } from '../services/session';

const DisputeForm: React.FC = () => {
  const history = useHistory();
  const [customerName, setCustomerName] = useState<string>('');
  const [relatedToEv, setRelatedToEv] = useState<string>(''); 
  const [moreThanOneCharge, setMoreThanOneCharge] = useState<string>(''); 
  const [wrongCharged, setWrongCharged] = useState<string>(''); 
  const [didNotReceiveRefund, setDidNotReceiveRefund] = useState<string>(''); 
  const [paidForOtherMeans, setPaidForOtherMeans] = useState<string>(''); 
  const [disputeTransaction, setDisputeTransaction] = useState<string>(''); 
  const [chargedRegularly, setChargedRegularly] = useState<string>(''); 
  const [notListedAbove, setNotListedAbove] = useState<string>(''); 
  const [transactionDetails, setTransactionDetails] = useState<string>('');
  const [disputeDetails, setDisputeDetails] = useState<string>('');
  const [userid, setuserid] = useState<string>(''); 
  
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    setuserid(getUserId() || '');
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');
  
    try {
      const response = await axios.post('https://be.cms.ocpp.transev.site/admin/dspf', {
        customername: customerName,
        relatedtoev: relatedToEv,
        morethanonecharge: moreThanOneCharge,
        wrongcharged: wrongCharged,
        didnotreceiverefund: didNotReceiveRefund,
        paidforothermeans: paidForOtherMeans,
        disputtransaction: disputeTransaction,
        chargedregularly: chargedRegularly,
        notlistedabove: notListedAbove,
        transactiondetails: transactionDetails,
        disputedetails: disputeDetails,
        associatedadminid: "yyyy",
        userid: userid,
      }, {
        headers: {
          'apiauthkey': "aBcD1eFgH2iJkLmNoPqRsTuVwXyZ012345678jasldjalsdjurewouroewiru",
        },
      });
  
      setSuccessMessage(response.data.message);
      alert('Dispute successfully submitted!');
      history.push('/dashboard');

      setCustomerName('');
      setRelatedToEv('');
      setMoreThanOneCharge(''); 
      setWrongCharged(''); 
      setDidNotReceiveRefund(''); 
      setPaidForOtherMeans(''); 
      setDisputeTransaction('');
      setChargedRegularly(''); 
      setNotListedAbove(''); 
      setTransactionDetails('');
      setDisputeDetails('');
      setuserid('');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || 'An error occurred. Please try again.');
      } else {
        setErrorMessage('An error occurred. Please try again.');
      }
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-brand-100 via-brand-200 to-blue-100">
      <div className="w-full max-w-md bg-white bg-opacity-60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 h-[100vh] overflow-y-auto">
        <h2 className="text-4xl font-bold text-center text-brand-800 mb-6">Dispute Form</h2>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Customer Name Input */}
          <div>
            <label className="block text-lg font-medium text-gray-700">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              required
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
              placeholder="Enter your name"
            />
          </div>

          {/* Related to EV Dropdown */}
          <div>
            <label className="block text-lg font-medium text-gray-700">Related to EV</label>
            <select
              value={relatedToEv}
              onChange={e => setRelatedToEv(e.target.value)}
              required
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
            >
              <option value="">Select</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>

          {/* Reason Checkboxes */}
          <div>
            <label className="block text-lg font-medium text-gray-700">Reason</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={moreThanOneCharge === 'yes'}
                  onChange={e => setMoreThanOneCharge(e.target.checked ? 'yes' : 'no')}
                  className="mr-2"
                />
                <label className="text-lg font-medium text-gray-700">More than one charge?</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={wrongCharged === 'yes'}
                  onChange={e => setWrongCharged(e.target.checked ? 'yes' : 'no')}
                  className="mr-2"
                />
                <label className="text-lg font-medium text-gray-700">Wrong charged?</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={didNotReceiveRefund === 'yes'}
                  onChange={e => setDidNotReceiveRefund(e.target.checked ? 'yes' : 'no')}
                  className="mr-2"
                />
                <label className="text-lg font-medium text-gray-700">Did not receive refund?</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={paidForOtherMeans === 'yes'}
                  onChange={e => setPaidForOtherMeans(e.target.checked ? 'yes' : 'no')}
                  className="mr-2"
                />
                <label className="text-lg font-medium text-gray-700">Paid for other means?</label>
              </div>
            </div>
          </div>

          {/* Dispute Transaction Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={disputeTransaction === 'yes'}
              onChange={e => setDisputeTransaction(e.target.checked ? 'yes' : 'no')}
              className="mr-2"
            />
            <label className="text-lg font-medium text-gray-700">Dispute Transaction?</label>
          </div>

          {/* Charged Regularly Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={chargedRegularly === 'yes'}
              onChange={e => setChargedRegularly(e.target.checked ? 'yes' : 'no')}
              className="mr-2"
            />
            <label className="text-lg font-medium text-gray-700">Charged regularly?</label>
          </div>

          {/* Not Listed Above Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={notListedAbove === 'yes'}
              onChange={e => setNotListedAbove(e.target.checked ? 'yes' : 'no')}
              className="mr-2"
            />
            <label className="text-lg font-medium text-gray-700">Not listed above?</label>
          </div>

          {/* Transaction Details Input */}
          <div>
            <label className="block text-lg font-medium text-gray-700">Transaction Details</label>
            <textarea
              value={transactionDetails}
              onChange={e => setTransactionDetails(e.target.value)}
              required
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
              placeholder="Provide transaction details here..."
            />
          </div>

          {/* Dispute Details Input */}
          <div>
            <label className="block text-lg font-medium text-gray-700">Dispute Details</label>
            <textarea
              value={disputeDetails}
              onChange={e => setDisputeDetails(e.target.value)}
              required
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
              placeholder="Provide dispute details here..."
            />
          </div>

          {errorMessage && <div className="text-red-500 text-center">{errorMessage}</div>}
          {successMessage && <div className="text-green-500 text-center">{successMessage}</div>}

          <button
            type="submit"
            className="mt-4 w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3 px-6 rounded-lg shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
          >
            Submit Dispute
          </button>
        </form>
      </div>
    </div>
  );
};

export default DisputeForm;
