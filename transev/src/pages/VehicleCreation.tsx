import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom'; 
import { FaHome } from 'react-icons/fa'; 

const VehicleCreation: React.FC = () => {
  const history = useHistory(); 
  const [vehicleName, setVehicleName] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleLicense, setVehicleLicense] = useState<string>('');
  const [vehicleOwnerEmail, setVehicleOwnerEmail] = useState<string>(''); // Changed from vehicleOwner
  const [vehicleType, setVehicleType] = useState<string>('');
  const [vehicleCategory, setVehicleCategory] = useState<string>('');
  const [vehiclevin, setVehicleVin] = useState<string>('');
  const [vehiclerange, setVehicleRange] = useState<string>('');
  const [vehiclebatterycapacity, setVehicleBatteryCapacity] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const apiKey = "aBcD1eFgH2iJkLmNoPqRsTuVwXyZ012345678jasldjalsdjurewouroewiru";
      const adminuid = "5mrv"; 
      
      if (!apiKey) {
        alert('API key is not defined. Please check your environment variables.');
        return;
      }

      // Add new fields to the request
      const response = await axios.post('https://be.cms.ocpp.transev.site/admin/createav', {
        vehiclename: vehicleName,
        vehiclemodel: vehicleModel,
        vehiclelicense: vehicleLicense,
        vehicleowner: vehicleOwnerEmail, // Now sending email
        vehicletype: vehicleType,
        vehiclecategory: vehicleCategory,
        adminuid: adminuid,
        vehiclevin: vehiclevin,
        vehiclerange: vehiclerange,
        vehiclebatterycapacity: vehiclebatterycapacity,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'apiauthkey': apiKey,
        },
      });

      setSuccessMessage(response.data.message);
      
      // Clear form after successful submission
      setTimeout(() => {
        setVehicleName('');
        setVehicleModel('');
        setVehicleLicense('');
        setVehicleOwnerEmail('');
        setVehicleType('');
        setVehicleCategory('');
        setVehicleVin('');
        setVehicleRange('');
        setVehicleBatteryCapacity('');
      }, 2000);
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.message || 'Something went wrong!';
        setErrorMessage(errorMsg);
        
        // Handle specific error cases
        if (error.response?.status === 404) {
          setErrorMessage('No user found with this email. Please check the email address.');
        }
      } else {
        setErrorMessage('Something went wrong!');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-brand-100 via-brand-200 to-blue-100">
      <div className="w-full h-screen flex items-center justify-center">
        <div className="w-full max-w-md h-[100vh] bg-white bg-opacity-60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 flex flex-col justify-center overflow-hidden">
          
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="https://transev.in/wp-content/uploads/2023/07/logo-160x57.png"
              alt="Logo"
              className="h-14 w-auto"
            />
          </div>

          <h2 className="text-4xl font-bold text-center text-brand-800 mb-6">Create Vehicle</h2>

          {/* Home Button */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={() => history.push('/')}
              className="flex items-center text-brand-500 hover:text-brand-600 transition duration-300 ease-in-out"
            >
              <FaHome className="mr-2" /> Home
            </button>
          </div>

          <div className="overflow-y-auto h-full">
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-lg font-medium text-gray-700">Vehicle Name</label>
                <input
                  type="text"
                  value={vehicleName}
                  onChange={e => setVehicleName(e.target.value)}
                  required
                  className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                  placeholder="Enter vehicle name"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700">Vehicle Model</label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={e => setVehicleModel(e.target.value)}
                  required
                  className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                  placeholder="Enter vehicle model"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700">Vehicle License</label>
                <input
                  type="text"
                  value={vehicleLicense}
                  onChange={e => setVehicleLicense(e.target.value)}
                  required
                  className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                  placeholder="Enter vehicle license number"
                />
              </div>

              {/* Changed to Email Input */}
              <div>
                <label className="block text-lg font-medium text-gray-700">Vehicle Owner Email</label>
                <input
                  type="email"
                  value={vehicleOwnerEmail}
                  onChange={e => setVehicleOwnerEmail(e.target.value)}
                  required
                  className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                  placeholder="Enter owner's email address"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700">Vehicle Type</label>
                <input
                  type="text"
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value)}
                  required
                  className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                  placeholder="Enter vehicle type"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700">Vehicle Category</label>
                <input
                  type="text"
                  value={vehicleCategory}
                  onChange={e => setVehicleCategory(e.target.value)}
                  required
                  className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                  placeholder="Enter vehicle category"
                />
              </div>

              {/* New Fields */}
              <div>
                <label className="block text-lg font-medium text-gray-700">VIN (Vehicle Identification Number)</label>
                <input
                  type="text"
                  value={vehiclevin}
                  onChange={e => setVehicleVin(e.target.value)}
                  className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                  placeholder="Enter VIN"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700">Vehicle Range</label>
                <input
                  type="text"
                  value={vehiclerange}
                  onChange={e => setVehicleRange(e.target.value)}
                  className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                  placeholder="Enter vehicle range"
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-gray-700">Battery Capacity</label>
                <input
                  type="text"
                  value={vehiclebatterycapacity}
                  onChange={e => setVehicleBatteryCapacity(e.target.value)}
                  className="mt-2 block w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 font-semibold shadow-md focus:outline-none focus:ring-4 focus:ring-brand-300"
                  placeholder="Enter battery capacity"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-500 text-white font-bold py-3 rounded-full shadow-lg hover:bg-brand-600 transition duration-300 ease-in-out"
                disabled={!vehicleName || !vehicleModel || !vehicleLicense || !vehicleOwnerEmail || !vehicleType || !vehicleCategory}
              >
                Create Vehicle
              </button>
            </form>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-center font-medium">{errorMessage}</p>
            </div>
          )}
          {successMessage && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-center font-medium">{successMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleCreation;