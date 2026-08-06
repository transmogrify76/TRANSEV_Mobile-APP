import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom'; // Import useHistory
import { FaHome } from 'react-icons/fa'; // Import the home icon from react-icons

const HelpAndSupport: React.FC = () => {
  const history = useHistory(); // Initialize useHistory
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [userMessage, setUserMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const response = await axios.post('https://be.cms.ocpp.transev.site/admin/has', {
        name,
        email,
        phonenumber: phoneNumber,
        usermessage: userMessage,
      }, {
        headers: {
          'apiauthkey': "aBcD1eFgH2iJkLmNoPqRsTuVwXyZ012345678jasldjalsdjurewouroewiru",
        },
      });

      setSuccessMessage(response.data.message);
      setName('');
      setEmail('');
      setPhoneNumber('');
      setUserMessage('');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(error.response?.data?.message || 'An error occurred. Please try again.');
      } else {
        setErrorMessage('An error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-brand-100 via-brand-200 to-blue-100 relative">
      {/* Home Icon */}
      
      <div className="w-full max-w-md bg-white bg-opacity-60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 h-[100vh] overflow-y-auto">
      <FaHome
        className="absolute top-4 left-4 text-3xl text-brand-800 cursor-pointer hover:text-brand-600 transition duration-300 ease-in-out"
        onClick={() => history.push('/dashboard')} // Navigate to /dashboard
      />
        <h2 className="text-4xl font-bold text-center text-brand-800 mb-6">Help & Support</h2>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-lg font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
              placeholder="Enter your name"
            />
          </div>

         
          <div>
            <label className="block text-lg font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
              placeholder="Enter your email"
            />
          </div>

          
          <div>
            <label className="block text-lg font-medium text-gray-700">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              required
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
              placeholder="Enter your phone number"
            />
          </div>

         
          <div>
            <label className="block text-lg font-medium text-gray-700">Your Message</label>
            <textarea
              value={userMessage}
              onChange={e => setUserMessage(e.target.value)}
              required
              className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
              placeholder="Type your message here"
              rows={4}
            />
          </div>

          
          <button
            type="submit"
            className="w-full bg-brand-500 text-white font-bold py-3 rounded-full shadow-lg hover:bg-brand-600 transition duration-300 ease-in-out"
          >
            Send Message
          </button>
        </form>

        
        {successMessage && <p className="text-green-500 text-center mt-4">{successMessage}</p>}
        {errorMessage && <p className="text-red-500 text-center mt-4">{errorMessage}</p>}
        
        <button
          className="w-full mt-4 bg-brand-400 text-white font-bold py-3 rounded-full shadow-lg hover:bg-brand-500 transition duration-300 ease-in-out"
          onClick={() => history.push('/viewhelp')} 
        >
          Past Messages
        </button>
      </div>
    </div>
  );
};

export default HelpAndSupport;
