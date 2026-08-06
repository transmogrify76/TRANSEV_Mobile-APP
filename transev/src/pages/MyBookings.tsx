import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { getUserId } from '../services/session';

interface ChargerDetail {
    uid: string;
}

const MyBookings: React.FC = () => {
    const history = useHistory();
    const [chargerDetails, setChargerDetails] = useState<ChargerDetail[]>([]);
    const [message, setMessage] = useState('');
    const [chargerUID, setChargerUID] = useState('');
    const [isBooked, setIsBooked] = useState(false);
    const [bookingTimeFrom, setBookingTimeFrom] = useState('');
    const [bookingTimeTo, setBookingTimeTo] = useState('');

    const fetchChargerDetails = async () => {
        try {
            const response = await fetch('https://be.cms.ocpp.transev.site/admin/listofcharges', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'apiauthkey': 'aBcD1eFgH2iJkLmNoPqRsTuVwXyZ012345678jasldjalsdjurewouroewiru',
                },
            });
            const data = await response.json();
    
            console.log('API response:', data); 
    
            if (data && data.data) {
                setChargerDetails(data.data); 
            } else {
                console.error('Unexpected response structure:', data);
                
            }
        } catch (error) {
            console.error('Error fetching charger details:', error);
        }
    };
    

    useEffect(() => {
        fetchChargerDetails();
    }, []);

    const handleCreateBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        const apiUrl = 'https://be.cms.ocpp.transev.site/users/createbookings';
        const token = localStorage.getItem('token');

        if (!token) {
            setMessage('User not authenticated.');
            return;
        }

        const userId = getUserId();
        if (!userId) {
            setMessage('User not authenticated.');
            return;
        }

        try {
            const response = await axios.post(apiUrl, {
                chargeruid: chargerUID,
                useruid: userId,
                isbooked: isBooked,
                bookingtimefrom: bookingTimeFrom,
                bookingtimeto: bookingTimeTo,
            }, {
                headers: {
                    'apiauthkey': "aBcD1eFgH2iJkLmNoPqRsTuVwXyZ012345678jasldjalsdjurewouroewiru"
                }
            });

            setMessage(response.data.message);
            setChargerUID('');
            setIsBooked(false);
            setBookingTimeFrom('');
            setBookingTimeTo('');
        } catch (error) {
            console.error(error); 
            if (axios.isAxiosError(error)) {
                setMessage(error.response?.data?.message || 'Failed to create booking.');
            } else {
                setMessage('An unexpected error occurred. Please try again.');
            }
        }
    };
   
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-brand-100 via-brand-200 to-blue-100">
            <div className="w-full max-w-lg bg-white bg-opacity-60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 relative">
                <button 
                    onClick={() => history.push('/dashboard')}
                    className="absolute top-4 left-4 p-2 bg-brand-500 rounded-full shadow-md hover:bg-brand-600 transition duration-300"
                >
                    <FaHome className="text-white" />
                </button>

                <h2 className="text-4xl font-bold text-center text-brand-800 mb-6">Create Booking</h2>

                {message && <p className="text-red-500 text-center mb-4">{message}</p>}

                <form onSubmit={handleCreateBooking}>
                    <div className="mb-4">
                        <label className="block text-brand-700 text-sm font-bold mb-2" htmlFor="chargerUID">
                            Charger Name
                        </label>
                        <select
                            id="chargerUID"
                            value={chargerUID}
                            onChange={(e) => setChargerUID(e.target.value)}
                            required
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="">Select Charger UID</option>
                            {chargerDetails.length > 0 ? (
                                chargerDetails.map(charger => (
                                    <option key={charger.uid} value={charger.uid}>
                                        {charger.uid}
                                    </option>
                                ))
                            ) : (
                                <option value="">No chargers available</option>
                            )}
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-brand-700 text-sm font-bold mb-2" htmlFor="isBooked">
                            Is Booked
                        </label>
                        <select
                            id="isBooked"
                            value={isBooked ? 'true' : 'false'}
                            onChange={(e) => setIsBooked(e.target.value === 'true')}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="false">No</option>
                            <option value="true">Yes</option>
                        </select>
                    </div>
                    <div className="mb-4">
                        <label className="block text-brand-700 text-sm font-bold mb-2" htmlFor="bookingTimeFrom">
                            Booking Time From
                        </label>
                        <input
                            type="datetime-local"
                            id="bookingTimeFrom"
                            value={bookingTimeFrom}
                            onChange={(e) => setBookingTimeFrom(e.target.value)}
                            required
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-brand-700 text-sm font-bold mb-2" htmlFor="bookingTimeTo">
                            Booking Time To
                        </label>
                        <input
                            type="datetime-local"
                            id="bookingTimeTo"
                            value={bookingTimeTo}
                            onChange={(e) => setBookingTimeTo(e.target.value)}
                            required
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="flex items-center justify-center">
                        <button
                            type="submit"
                            className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
                        >
                            Create Booking
                        </button>
                    </div>
                </form>
                
                {/* Add View Bookings Button */}
                <div className="flex items-center justify-center mt-4">
                    <button
                        onClick={() => history.push('/mybookings')}
                        className="mt-4 bg-brand-500 hover:bg-brand-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-300"
                    >
                        View My Bookings
                    </button>

                </div>
            </div>
        </div>
    );
};

export default MyBookings;
