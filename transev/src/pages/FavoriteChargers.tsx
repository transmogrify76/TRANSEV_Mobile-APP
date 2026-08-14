// src/pages/FavoriteChargers.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { arrowBack, flash, business, heartDislike, heart, locationOutline, flashOutline, timeOutline, alertCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { getFavorites, removeFavoriteCharger, removeFavoriteHub, fetchChargerImageObjectUrl } from '../services/customerApi';
import { CustomerCharger, CustomerHubSummary, CustomerNetworkStatus } from '../types/auth';

type Tab = 'chargers' | 'hubs';

const titleFor = (charger: CustomerCharger) => charger.charger_name || charger.hub_name || charger.charger_id;

const connectorDetailsFor = (charger: CustomerCharger) =>
  charger.connectors.length
    ? charger.connectors.map((c) => `${c.connector_type} \u00b7 ${c.connector_total_capacity} kW`).join(', ')
    : 'Unknown';

// CMS administrative listing status - NOT live OCPP/HAL availability. Only
// worth flagging in the UI when it's something other than the normal case.
const LISTING_STATUS_LABEL: Record<CustomerNetworkStatus, string> = {
  ACTIVE: 'Active listing',
  INACTIVE: 'Inactive listing',
  SUSPENDED: 'Suspended listing',
  UNDERMAINTENANCE: 'Under maintenance',
  DECOMMISSIONED: 'Decommissioned',
};

const isNoteworthyStatus = (status: CustomerNetworkStatus) => status !== 'ACTIVE';

/**
 * `charger_image_url` is an authenticated relative path, not a public image
 * URL, so a plain <img> can't use it directly. Fetches it as a blob object
 * URL and falls back to the bolt icon badge while loading, on error, or when
 * the charger has no image.
 */
const ChargerThumb: React.FC<{ charger: CustomerCharger }> = ({ charger }) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    setSrc(null);

    if (charger.charger_image_url) {
      fetchChargerImageObjectUrl(charger.charger_image_url)
        .then((url) => {
          if (cancelled) {
            URL.revokeObjectURL(url);
            return;
          }
          objectUrl = url;
          setSrc(url);
        })
        .catch(() => {
          /* keep the icon fallback */
        });
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [charger.charger_image_url]);

  if (src) {
    return (
      <img
        src={src}
        alt={titleFor(charger)}
        className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 bg-ink-50"
      />
    );
  }

  return (
    <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
      <IonIcon icon={flashOutline} className="text-xl text-brand-600" />
    </div>
  );
};

const FavoriteChargers: React.FC = () => {
  const history = useHistory();
  const [hubs, setHubs] = useState<CustomerHubSummary[]>([]);
  const [chargers, setChargers] = useState<CustomerCharger[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('chargers');
  const [removingId, setRemovingId] = useState<string | null>(null);

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

  // Default to whichever tab actually has content once data arrives.
  useEffect(() => {
    if (!loading && chargers.length === 0 && hubs.length > 0) {
      setTab('hubs');
    }
  }, [loading, chargers.length, hubs.length]);

  const handleRemoveHub = async (hub: CustomerHubSummary) => {
    setRemovingId(hub.id);
    setHubs((prev) => prev.filter((h) => h.id !== hub.id));
    try {
      await removeFavoriteHub(hub.id);
    } catch (err) {
      console.error('Error removing favorite hub:', err);
      fetchFavorites(); // resync on failure
    } finally {
      setRemovingId(null);
    }
  };

  const handleRemoveCharger = async (charger: CustomerCharger) => {
    setRemovingId(charger.id);
    setChargers((prev) => prev.filter((c) => c.id !== charger.id));
    try {
      await removeFavoriteCharger(charger.charger_id);
    } catch (err) {
      console.error('Error removing favorite charger:', err);
      fetchFavorites(); // resync on failure
    } finally {
      setRemovingId(null);
    }
  };

  const isEmpty = hubs.length === 0 && chargers.length === 0;

  const counts = useMemo(
    () => ({ chargers: chargers.length, hubs: hubs.length }),
    [chargers.length, hubs.length]
  );

  return (
    <div className="h-[100dvh] overflow-y-auto bg-gradient-to-b from-brand-50 via-white to-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-ink-100/60">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => history.push('/dashboard')}
            className="p-2.5 rounded-full bg-ink-50 text-ink-700 hover:bg-ink-100 transition flex-shrink-0"
            aria-label="Back to dashboard"
          >
            <IonIcon icon={arrowBack} className="text-lg" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight">My Favorites</h1>
            <p className="text-xs sm:text-sm text-ink-400">Your saved chargers &amp; hubs, one tap away</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-6 pb-10">
        {/* Tabs */}
        {!loading && !error && !isEmpty && (
          <div className="inline-flex bg-ink-50 p-1 rounded-full mb-5 w-full sm:w-auto">
            <button
              onClick={() => setTab('chargers')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition ${
                tab === 'chargers' ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-400'
              }`}
            >
              <IonIcon icon={flash} />
              Chargers
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === 'chargers' ? 'bg-brand-100 text-brand-700' : 'bg-ink-200 text-ink-500'
                }`}
              >
                {counts.chargers}
              </span>
            </button>
            <button
              onClick={() => setTab('hubs')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold transition ${
                tab === 'hubs' ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-400'
              }`}
            >
              <IonIcon icon={business} />
              Hubs
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  tab === 'hubs' ? 'bg-brand-100 text-brand-700' : 'bg-ink-200 text-ink-500'
                }`}
              >
                {counts.hubs}
              </span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2.5xl shadow-soft p-4 flex gap-4">
                <div className="w-12 h-12 rounded-2xl bg-ink-100 flex-shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-ink-100 rounded w-2/3" />
                  <div className="h-3 bg-ink-100 rounded w-1/2" />
                  <div className="h-3 bg-ink-100 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4">
              <IonIcon icon={heartDislike} className="text-2xl text-red-400" />
            </div>
            <p className="text-ink-500 mb-4">{error}</p>
            <button
              onClick={fetchFavorites}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-full text-sm font-semibold shadow-glow hover:bg-brand-700 transition"
            >
              Try again
            </button>
          </div>
        ) : isEmpty ? (
          <div className="text-center py-16 px-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-brand-50 flex items-center justify-center mb-5">
              <IonIcon icon={heart} className="text-3xl text-brand-400" />
            </div>
            <h3 className="text-ink-800 font-semibold text-lg mb-1.5">No favorites yet</h3>
            <p className="text-ink-400 text-sm max-w-xs mx-auto mb-6">
              Tap the heart on any charger from the map to save it here for quick access later.
            </p>
            <button
              onClick={() => history.push('/dashboard')}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-full text-sm font-semibold shadow-glow hover:bg-brand-700 transition"
            >
              Find chargers
            </button>
          </div>
        ) : tab === 'chargers' ? (
          counts.chargers === 0 ? (
            <EmptyTabState
              icon={flash}
              message="No favorite chargers yet."
              actionLabel="Browse chargers"
              onAction={() => history.push('/dashboard')}
            />
          ) : (
            <ul className="space-y-3">
              {chargers.map((charger) => (
                <li
                  key={charger.id}
                  className={`bg-white rounded-2.5xl shadow-soft hover:shadow-card p-4 flex items-start gap-3.5 transition-all duration-200 ${
                    removingId === charger.id ? 'opacity-40 scale-[0.98]' : ''
                  }`}
                >
                  <ChargerThumb charger={charger} />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-ink-900 font-semibold truncate">{titleFor(charger)}</h4>
                    <p className="text-ink-400 text-xs mt-0.5">ID: {charger.charger_id}</p>
                    {isNoteworthyStatus(charger.status) && (
                      <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
                        <IonIcon icon={alertCircleOutline} className="text-[10px]" />
                        {LISTING_STATUS_LABEL[charger.status]}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-ink-500">
                      <span className="inline-flex items-center gap-1">
                        <IonIcon icon={flashOutline} className="text-sm text-ink-300" />
                        {charger.max_power_kw} kW
                      </span>
                      <span className="inline-flex items-center gap-1 truncate">
                        <IonIcon icon={timeOutline} className="text-sm text-ink-300" />
                        {charger.twenty_four_seven_open_status ? '24/7' : 'Specific hours'}
                      </span>
                      <span className="inline-flex items-center gap-1 truncate max-w-full">
                        {connectorDetailsFor(charger)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCharger(charger)}
                    disabled={removingId === charger.id}
                    className="p-2 rounded-full text-brand-500 hover:bg-red-50 hover:text-red-500 transition flex-shrink-0"
                    aria-label="Remove favorite"
                  >
                    <IonIcon icon={heart} className="text-xl" />
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : counts.hubs === 0 ? (
          <EmptyTabState
            icon={business}
            message="No favorite hubs yet."
            actionLabel="Browse chargers"
            onAction={() => history.push('/dashboard')}
          />
        ) : (
          <ul className="space-y-3">
            {hubs.map((hub) => (
              <li
                key={hub.id}
                className={`bg-white rounded-2.5xl shadow-soft hover:shadow-card p-4 flex items-start gap-3.5 transition-all duration-200 ${
                  removingId === hub.id ? 'opacity-40 scale-[0.98]' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <IonIcon icon={business} className="text-xl text-brand-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-ink-900 font-semibold truncate">{hub.name}</h4>
                  <p className="text-ink-400 text-xs mt-0.5 flex items-start gap-1">
                    <IonIcon icon={locationOutline} className="text-sm flex-shrink-0 mt-0.5" />
                    <span className="break-words">{hub.address}</span>
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-ink-500">
                    <span>
                      {hub.charger_count} charger{hub.charger_count === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IonIcon icon={timeOutline} className="text-sm text-ink-300" />
                      {hub.open_24_hours ? '24/7' : 'Specific hours'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveHub(hub)}
                  disabled={removingId === hub.id}
                  className="p-2 rounded-full text-brand-500 hover:bg-red-50 hover:text-red-500 transition flex-shrink-0"
                  aria-label="Remove favorite"
                >
                  <IonIcon icon={heart} className="text-xl" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

const EmptyTabState: React.FC<{
  icon: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}> = ({ icon, message, actionLabel, onAction }) => (
  <div className="text-center py-14 px-4">
    <div className="w-16 h-16 mx-auto rounded-full bg-ink-50 flex items-center justify-center mb-4">
      <IonIcon icon={icon} className="text-2xl text-ink-300" />
    </div>
    <p className="text-ink-400 text-sm mb-5">{message}</p>
    <button
      onClick={onAction}
      className="px-5 py-2.5 bg-brand-600 text-white rounded-full text-sm font-semibold shadow-glow hover:bg-brand-700 transition"
    >
      {actionLabel}
    </button>
  </div>
);

export default FavoriteChargers;