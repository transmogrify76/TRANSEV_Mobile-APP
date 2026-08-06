import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaHome } from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import { getUserId } from '../services/session';

interface Booking {
    uid: string;
    chargeruid: string;
    useruid: string;
    isbooked: boolean;
    createdAt: string;
    updatedAt: string;
}

interface ChargerDetail {
    uid: string;
    // Add other relevant fields from your charger details if needed
}

const MyBookingsList: React.FC = () => {
    const history = useHistory();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [chargerDetails, setChargerDetails] = useState<ChargerDetail[]>([]);
    const [message, setMessage] = useState('');

    // Fetch bookings from the API
    const fetchBookings = async () => {
        const apiUrl = 'https://be.cms.ocpp.transev.site/users/getbookings'; // Adjust the URL as necessary
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
            const response = await axios.post(apiUrl, { userid: userId }, {
                headers: {
                    'apiauthkey': 'aBcD1eFgH2iJkLmNoPqRsTuVwXyZ012345678jasldjalsdjurewouroewiru',
                },
            });
            
            setBookings(response.data.bookings);
            setChargerDetails(response.data.chargerDetails); // Assuming this contains the charger details
        } catch (error) {
            console.error(error);
            if (axios.isAxiosError(error)) {
                setMessage(error.response?.data?.message || 'Failed to fetch bookings.');
            } else {
                setMessage('An unexpected error occurred. Please try again.');
            }
        }
    };

    useEffect(() => {
        fetchBookings();
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-brand-100 via-brand-200 to-blue-100">
            <div className="w-full max-w-lg bg-white bg-opacity-60 backdrop-blur-xl rounded-3xl shadow-2xl p-8 relative">
                <button
                    onClick={() => history.push('/dashboard')}
                    className="absolute top-4 left-4 p-2 bg-brand-500 rounded-full shadow-md hover:bg-brand-600 transition duration-300"
                >
                    <FaHome className="text-white" />
                </button>

                <h2 className="text-4xl font-bold text-center text-brand-800 mb-6">My Bookings</h2>

                {message && <p className="text-red-500 text-center mb-4">{message}</p>}

                {bookings.length > 0 ? (
                    <ul className="space-y-4">
                        {bookings.map(booking => (
                            <li key={booking.uid} className="p-4 bg-brand-50 rounded shadow-md">
                                <h3 className="font-semibold">Charger UID: {booking.chargeruid}</h3>
                                <p>User UID: {booking.useruid}</p>
                                <p>Status: {booking.isbooked ? 'Booked' : 'Not Booked'}</p>
                                <p>Created At: {new Date(booking.createdAt).toLocaleString()}</p>
                                <p>Updated At: {new Date(booking.updatedAt).toLocaleString()}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center">No bookings found.</p>
                )}
            </div>
        </div>
    );
};

export default MyBookingsList;
