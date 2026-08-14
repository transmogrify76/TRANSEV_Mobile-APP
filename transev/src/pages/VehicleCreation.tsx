import React, { useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { FaArrowLeft, FaCar } from 'react-icons/fa';

const inputClass =
  'block w-full px-4 py-2.5 border border-ink-100 rounded-xl bg-ink-50 focus:bg-white text-ink-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition';
const labelClass = 'block text-sm font-semibold text-ink-700 mb-1.5';

const VehicleCreation: React.FC = () => {
  const history = useHistory();
  const [vehicleName, setVehicleName] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');
  const [vehicleLicense, setVehicleLicense] = useState<string>('');
  const [vehicleOwnerEmail, setVehicleOwnerEmail] = useState<string>('');
  const [vehicleType, setVehicleType] = useState<string>('');
  const [vehicleCategory, setVehicleCategory] = useState<string>('');
  const [vehiclevin, setVehicleVin] = useState<string>('');
  const [vehiclerange, setVehicleRange] = useState<string>('');
  const [vehiclebatterycapacity, setVehicleBatteryCapacity] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const apiKey = 'aBcD1eFgH2iJkLmNoPqRsTuVwXyZ012345678jasldjalsdjurewouroewiru';
      const adminuid = '5mrv';

      if (!apiKey) {
        alert('API key is not defined. Please check your environment variables.');
        setIsSubmitting(false);
        return;
      }

      const response = await axios.post(
        'https://be.cms.ocpp.transev.site/admin/createav',
        {
          vehiclename: vehicleName,
          vehiclemodel: vehicleModel,
          vehiclelicense: vehicleLicense,
          vehicleowner: vehicleOwnerEmail,
          vehicletype: vehicleType,
          vehiclecategory: vehicleCategory,
          adminuid: adminuid,
          vehiclevin: vehiclevin,
          vehiclerange: vehiclerange,
          vehiclebatterycapacity: vehiclebatterycapacity,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            apiauthkey: apiKey,
          },
        }
      );

      setSuccessMessage(response.data.message);

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

        if (error.response?.status === 404) {
          setErrorMessage('No user found with this email. Please check the email address.');
        }
      } else {
        setErrorMessage('Something went wrong!');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    vehicleName && vehicleModel && vehicleLicense && vehicleOwnerEmail && vehicleType && vehicleCategory;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-brand-50 via-white to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-ink-100/60">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => history.push('/dashboard')}
            className="p-2.5 rounded-full bg-ink-50 text-ink-700 hover:bg-ink-100 transition flex-shrink-0"
            aria-label="Back to dashboard"
          >
            <FaArrowLeft className="text-base" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight">Register Vehicle</h1>
            <p className="text-xs sm:text-sm text-ink-400">Add a vehicle to your account</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 sm:px-6 py-6 pb-10">
        <div className="bg-white rounded-2.5xl shadow-soft p-5 sm:p-6">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center mb-4">
            <FaCar className="text-xl text-brand-600" />
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className={labelClass}>Vehicle Name</label>
              <input
                type="text"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                required
                className={inputClass}
                placeholder="Enter vehicle name"
              />
            </div>

            <div>
              <label className={labelClass}>Vehicle Model</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                required
                className={inputClass}
                placeholder="Enter vehicle model"
              />
            </div>

            <div>
              <label className={labelClass}>Vehicle License</label>
              <input
                type="text"
                value={vehicleLicense}
                onChange={(e) => setVehicleLicense(e.target.value)}
                required
                className={inputClass}
                placeholder="Enter vehicle license number"
              />
            </div>

            <div>
              <label className={labelClass}>Vehicle Owner Email</label>
              <input
                type="email"
                value={vehicleOwnerEmail}
                onChange={(e) => setVehicleOwnerEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="Enter owner's email address"
              />
            </div>

            <div>
              <label className={labelClass}>Vehicle Type</label>
              <input
                type="text"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                required
                className={inputClass}
                placeholder="Enter vehicle type"
              />
            </div>

            <div>
              <label className={labelClass}>Vehicle Category</label>
              <input
                type="text"
                value={vehicleCategory}
                onChange={(e) => setVehicleCategory(e.target.value)}
                required
                className={inputClass}
                placeholder="Enter vehicle category"
              />
            </div>

            <div>
              <label className={labelClass}>VIN (Vehicle Identification Number)</label>
              <input
                type="text"
                value={vehiclevin}
                onChange={(e) => setVehicleVin(e.target.value)}
                className={inputClass}
                placeholder="Enter VIN"
              />
            </div>

            <div>
              <label className={labelClass}>Vehicle Range</label>
              <input
                type="text"
                value={vehiclerange}
                onChange={(e) => setVehicleRange(e.target.value)}
                className={inputClass}
                placeholder="Enter vehicle range"
              />
            </div>

            <div>
              <label className={labelClass}>Battery Capacity</label>
              <input
                type="text"
                value={vehiclebatterycapacity}
                onChange={(e) => setVehicleBatteryCapacity(e.target.value)}
                className={inputClass}
                placeholder="Enter battery capacity"
              />
            </div>

            {successMessage && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
                <p className="text-green-700 text-sm text-center">{successMessage}</p>
              </div>
            )}
            {errorMessage && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <p className="text-red-700 text-sm text-center">{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-2xl shadow-glow transition disabled:opacity-50 disabled:shadow-none"
            >
              {isSubmitting ? 'Creating...' : 'Create Vehicle'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VehicleCreation;