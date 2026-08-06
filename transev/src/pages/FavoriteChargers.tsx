import React, { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { home, flash, business, close } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { getFavorites, removeFavoriteCharger, removeFavoriteHub } from '../services/customerApi';
import { CustomerCharger, CustomerHubSummary } from '../types/auth';

const FavoriteChargers: React.FC = () => {
  const history = useHistory();
  const [hubs, setHubs] = useState<CustomerHubSummary[]>([]);
  const [chargers, setChargers] = useState<CustomerCharger[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFavorites();
      setHubs(result.hubs || []);
      setChargers(result.chargers || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError('Could not load your favorites right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleRemoveHub = async (hubId: string) => {
    setHubs((prev) => prev.filter((h) => h.id !== hubId));
    try {
      await removeFavoriteHub(hubId);
    } catch (err) {
      console.error('Error removing favorite hub:', err);
      fetchFavorites(); // resync on failure
    }
  };

  const handleRemoveCharger = async (charger: CustomerCharger) => {
    setChargers((prev) => prev.filter((c) => c.id !== charger.id));
    try {
      await removeFavoriteCharger(charger.charger_id);
    } catch (err) {
      console.error('Error removing favorite charger:', err);
      fetchFavorites(); // resync on failure
    }
  };

  const isEmpty = hubs.length === 0 && chargers.length === 0;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-r from-brand-100 via-brand-200 to-blue-100">
      <div className="w-full max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <div className="relative mb-6 flex items-center justify-center">
          <button
            className="absolute left-0 p-2 sm:p-3 rounded-full bg-brand-500 text-white shadow-lg hover:bg-brand-600 transition duration-300"
            onClick={() => history.push('/dashboard')}
            aria-label="Back to dashboard"
          >
            <IonIcon icon={home} />
          </button>
          <h2 className="text-2xl sm:text-4xl font-bold text-center text-brand-800">My Favorites</h2>
        </div>

        {loading ? (
          <p className="text-center text-brand-700">Loading your favorites...</p>
        ) : error ? (
          <div className="text-center">
            <p className="text-red-500 mb-3">{error}</p>
            <button
              onClick={fetchFavorites}
              className="px-4 py-2 bg-brand-600 text-white rounded-full text-sm font-medium"
            >
              Retry
            </button>
          </div>
        ) : isEmpty ? (
          <p className="text-center text-gray-600">
            You haven't favorited any hubs or chargers yet. Tap the heart icon on a charger to save it here.
          </p>
        ) : (
          <div className="space-y-8">
            {hubs.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-brand-800 mb-3 flex items-center gap-2">
                  <IonIcon icon={business} /> Favorite Hubs
                </h3>
                <ul className="space-y-3">
                  {hubs.map((hub) => (
                    <li
                      key={hub.id}
                      className="bg-white/80 backdrop-blur-xl p-4 shadow-md rounded-2xl flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h4 className="text-gray-800 font-semibold truncate">{hub.name}</h4>
                        <p className="text-gray-600 text-sm break-words">{hub.address}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {hub.charger_count} charger{hub.charger_count === 1 ? '' : 's'} &middot;{' '}
                          {hub.twenty_four_seven_open_status ? '24/7' : 'Specific hours'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveHub(hub.id)}
                        className="p-2 text-gray-400 hover:text-red-500 flex-shrink-0"
                        aria-label="Remove favorite"
                      >
                        <IonIcon icon={close} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {chargers.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-brand-800 mb-3 flex items-center gap-2">
                  <IonIcon icon={flash} /> Favorite Chargers
                </h3>
                <ul className="space-y-3">
                  {chargers.map((charger) => (
                    <li
                      key={charger.charger_id}
                      className="bg-white/80 backdrop-blur-xl p-4 shadow-md rounded-2xl flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h4 className="text-gray-800 font-semibold truncate">
                          {charger.hub_name || charger.charger_id}
                        </h4>
                        <p className="text-gray-600 text-sm">Charger ID: {charger.charger_id}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {charger.max_power_kw} kW &middot; {charger.twenty_four_seven_open_status ? '24/7' : 'Specific hours'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveCharger(charger)}
                        className="p-2 text-gray-400 hover:text-red-500 flex-shrink-0"
                        aria-label="Remove favorite"
                      >
                        <IonIcon icon={close} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoriteChargers;
