import React, { useEffect, useState } from 'react';
import {
  FaSearch,
  FaHeart,
  FaWallet,
  FaUser,
  FaQrcode,
  FaBars,
  FaMapMarkerAlt,
  FaTimes,
  FaBolt,
  FaClock,
  FaPlug,
  FaBuilding,
  FaLocationArrow,
} from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import Sidebar from './Sidebar';
import QRScannerComponent from './QRScanner';
import { getChargers, addFavoriteCharger, removeFavoriteCharger, getChargerPrice } from '../services/customerApi';
import { CustomerCharger, CustomerPriceResponse } from '../types/auth';

const PLACEHOLDER_IMAGE = 'https://transev.in/assets/DC04W-BZzo5Frn.png';

const mapsLinkFor = (charger: CustomerCharger) =>
  charger.hub_latitude != null && charger.hub_longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${charger.hub_latitude},${charger.hub_longitude}`
    : undefined;

const connectorTypesFor = (charger: CustomerCharger) =>
  Array.from(new Set(charger.connectors.map((c) => c.connector_type))).join(', ') || 'Unknown';

const Dashboard: React.FC = () => {
  const history = useHistory();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isScannerOpen, setScannerOpen] = useState(false);
  const [chargers, setChargers] = useState<CustomerCharger[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCharger, setSelectedCharger] = useState<CustomerCharger | null>(null);
  const [selectedPrice, setSelectedPrice] = useState<CustomerPriceResponse | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // "Nearby only" is an explicit opt-in toggle. Off by default: the list
  // shows every published charger. Turning it on asks for the browser's
  // location and re-fetches scoped to lat/lng/radius_km; turning it off (or
  // if location isn't available) falls back to the general list.
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);
  const toggleScanner = () => setScannerOpen(!isScannerOpen);

  const fetchChargers = async (opts?: { lat: number; lng: number; radius: number } | null) => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getChargers(
        opts ? { lat: opts.lat, lng: opts.lng, radius_km: opts.radius } : undefined
      );
       setChargers(result.chargers || []);
    } catch (error) {
      console.error('Error fetching chargers:', error);
      setLoadError('Could not load chargers right now. Pull down to try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load: general list, no location.
  useEffect(() => {
    fetchChargers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestLocationAndFetch = (radius: number) => {
    if (!navigator.geolocation) {
      setLocationError('Location is not available on this device.');
      setNearbyOnly(false);
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setLocating(false);
        fetchChargers({ ...next, radius });
      },
      () => {
        setLocating(false);
        setLocationError('Enable location access to see nearby chargers.');
        setNearbyOnly(false);
        fetchChargers();
      },
      { timeout: 8000 }
    );
  };

  const handleNearbyToggle = () => {
    const next = !nearbyOnly;
    setNearbyOnly(next);
    if (next) {
      if (coords) {
        fetchChargers({ ...coords, radius: radiusKm });
      } else {
        requestLocationAndFetch(radiusKm);
      }
    } else {
      setLocationError('');
      fetchChargers();
    }
  };

  const handleRadiusChange = (radius: number) => {
    setRadiusKm(radius);
    if (nearbyOnly) {
      if (coords) {
        fetchChargers({ ...coords, radius });
      } else {
        requestLocationAndFetch(radius);
      }
    }
  };

  const handleFavoriteToggle = async (charger: CustomerCharger, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextIsFavorite = !charger.is_favorite;
    setChargers((prev) =>
      prev.map((ch) => (ch.id === charger.id ? { ...ch, is_favorite: nextIsFavorite } : ch))
    );
    try {
      if (nextIsFavorite) {
        await addFavoriteCharger(charger.charger_id);
      } else {
        await removeFavoriteCharger(charger.charger_id);
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
      setChargers((prev) =>
        prev.map((ch) => (ch.id === charger.id ? { ...ch, is_favorite: charger.is_favorite } : ch))
      );
    }
  };

  const handleSelectCharger = async (charger: CustomerCharger) => {
    setSelectedCharger(charger);
    setSelectedPrice(null);
    setPriceLoading(true);
    try {
      const price = await getChargerPrice(charger.charger_id);
      setSelectedPrice(price);
    } catch (error) {
      console.error('Error fetching price:', error);
    } finally {
      setPriceLoading(false);
    }
  };

  const filteredChargers = chargers.filter(
    (charger) =>
      charger.charger_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (charger.hub_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-xl shadow-md p-4 flex">
          <div className="w-16 h-16 bg-gray-200 rounded-lg mr-4 flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-1"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-br from-gray-50 to-brand-50 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={toggleSidebar} />}

      {/* Header */}
      <div className="flex-none sticky top-0 z-20 bg-white/80 backdrop-blur-lg shadow-sm">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-full hover:bg-gray-100 transition flex-shrink-0"
            aria-label="Open menu"
          >
            <FaBars className="text-gray-700 text-xl" />
          </button>
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full bg-gray-50 focus:bg-white focus:ring-2 focus:ring-brand-400 focus:border-transparent outline-none transition text-sm sm:text-base"
              placeholder="Search chargers or hubs..."
            />
          </div>
          <button
            onClick={() => history.push('/active-session')}
            className="p-2 rounded-full bg-brand-100 hover:bg-brand-200 transition flex-shrink-0"
            aria-label="Active session"
          >
            <FaBolt className="text-brand-600" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center mb-4">
            <div className="inline-flex bg-gray-100 p-1 rounded-full shadow-sm">
              <button
                onClick={() => setViewMode('list')}
                className={`px-5 sm:px-6 py-1.5 rounded-full text-sm font-medium transition ${
                  viewMode === 'list' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-5 sm:px-6 py-1.5 rounded-full text-sm font-medium transition ${
                  viewMode === 'map' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Map View
              </button>
            </div>
          </div>

          {/* Nearby-only toggle */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <FaLocationArrow className={`flex-shrink-0 ${nearbyOnly ? 'text-brand-600' : 'text-gray-400'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800">Nearby chargers only</p>
                  <p className="text-xs text-gray-500 truncate">
                    {nearbyOnly ? `Within ${radiusKm} km of you` : 'Showing all chargers'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={nearbyOnly}
                onClick={handleNearbyToggle}
                disabled={locating}
                className={`relative inline-flex flex-shrink-0 h-7 w-12 items-center rounded-full transition-colors disabled:opacity-60 ${
                  nearbyOnly ? 'bg-brand-600' : 'bg-gray-300'
                }`}
                aria-label="Toggle nearby chargers only"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    nearbyOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {nearbyOnly && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-0.5">
                {[5, 10, 25, 50].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRadiusChange(r)}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition ${
                      radiusKm === r ? 'bg-brand-100 text-brand-700 border border-brand-300' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            )}

            {locating && (
              <p className="text-xs text-brand-600 mt-2 flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                Getting your location...
              </p>
            )}
            {locationError && !locating && (
              <p className="text-xs text-amber-600 mt-2">{locationError}</p>
            )}
          </div>

          {loading ? (
            <SkeletonLoader />
          ) : loadError ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-3">{loadError}</p>
              <button
                onClick={() => (nearbyOnly && coords ? fetchChargers({ ...coords, radius: radiusKm }) : fetchChargers())}
                className="px-4 py-2 bg-brand-600 text-white rounded-full text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : viewMode === 'map' ? (
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200" style={{ height: '65vh' }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3683.5341636237147!2d88.50827541536385!3d22.57175068517253!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a020afe3fa83dab%3A0xda5c16b563780319!2sShapoorji%20Pallonji%20Shukhobrishti%20Housing%20Complex!5e0!3m2!1sen!2sin!4v1718888888888!5m2!1sen!2sin"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Charger Map"
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChargers.length === 0 ? (
                <div className="text-center py-12">
                  <FaBolt className="mx-auto text-4xl text-gray-300 mb-3" />
                  <p className="text-gray-500">No chargers found matching your search.</p>
                </div>
              ) : (
                filteredChargers.map((charger) => (
                  <div
                    key={charger.id}
                    onClick={() => handleSelectCharger(charger)}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden border border-gray-100"
                  >
                    <div className="flex p-3 sm:p-4">
                      <img
                        src={PLACEHOLDER_IMAGE}
                        alt={charger.charger_id}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover mr-3 sm:mr-4 shadow-sm flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                              {charger.hub_name || charger.charger_id}
                            </h3>
                            <p className="text-xs text-gray-400 truncate">{charger.charger_id}</p>
                          </div>
                          <button
                            onClick={(e) => handleFavoriteToggle(charger, e)}
                            className="p-2 -mt-1 -mr-1 flex-shrink-0"
                            aria-label="Toggle favorite"
                          >
                            <FaHeart
                              className={`text-xl transition ${
                                charger.is_favorite ? 'text-red-500' : 'text-gray-400 hover:text-red-400'
                              }`}
                            />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600 mt-2">
                          {charger.distance_km != null && (
                            <div className="flex items-center">
                              <FaMapMarkerAlt className="mr-1 text-gray-400 text-xs flex-shrink-0" />
                              <span>{charger.distance_km.toFixed(1)} km</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <FaBolt className="mr-1 text-gray-400 text-xs flex-shrink-0" />
                            <span>{charger.max_power_kw} kW</span>
                          </div>
                          <div className="flex items-center min-w-0">
                            <FaPlug className="mr-1 text-gray-400 text-xs flex-shrink-0" />
                            <span className="truncate">{connectorTypesFor(charger)}</span>
                          </div>
                          <div className="flex items-center">
                            <FaClock className="mr-1 text-gray-400 text-xs flex-shrink-0" />
                            <span>{charger.twenty_four_seven_open_status ? '24/7' : 'Specific hours'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-2 sm:px-4 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-10 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <button onClick={() => history.push('/dashboard')} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-brand-600 transition">
          <FaMapMarkerAlt className="text-lg" />
          <span className="text-[11px] font-medium">Find</span>
        </button>
        <button onClick={() => history.push('/wallet')} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-gray-400 hover:text-brand-600 transition">
          <FaWallet className="text-lg" />
          <span className="text-[11px] font-medium">Wallet</span>
        </button>

        {/* Raised center QR action */}
        <button
          onClick={toggleScanner}
          className="relative -translate-y-4 w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow flex items-center justify-center active:scale-95 transition"
          aria-label="Scan QR code"
        >
          <FaQrcode className="text-2xl" />
        </button>

        <button onClick={() => history.push('/userprofile')} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-gray-400 hover:text-brand-600 transition">
          <FaUser className="text-lg" />
          <span className="text-[11px] font-medium">Profile</span>
        </button>
        <button onClick={toggleSidebar} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-gray-400 hover:text-brand-600 transition">
          <FaBars className="text-lg" />
          <span className="text-[11px] font-medium">Menu</span>
        </button>
      </div>

      {/* Charger Details Modal */}
      {selectedCharger && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 px-5 py-4 flex justify-between items-center">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 truncate pr-2">
                {selectedCharger.hub_name || selectedCharger.charger_id}
              </h2>
              <button
                onClick={() => setSelectedCharger(null)}
                className="p-2 rounded-full hover:bg-gray-100 transition flex-shrink-0"
                aria-label="Close"
              >
                <FaTimes className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <InfoRow icon={<FaBuilding />} label="Public ID" value={selectedCharger.charger_id} />
              {selectedCharger.distance_km != null && (
                <InfoRow icon={<FaMapMarkerAlt />} label="Distance" value={`${selectedCharger.distance_km.toFixed(1)} km`} />
              )}
              <InfoRow icon={<FaClock />} label="Timings" value={selectedCharger.twenty_four_seven_open_status ? '24/7' : 'Specific hours'} />
              <InfoRow icon={<FaBolt />} label="Max Power" value={`${selectedCharger.max_power_kw} kW`} />
              <InfoRow icon={<FaPlug />} label="Connectors" value={connectorTypesFor(selectedCharger)} />
              <InfoRow icon={<FaBuilding />} label="Hub" value={selectedCharger.hub_name || 'N/A'} />
              <InfoRow icon={<FaMapMarkerAlt />} label="Address" value={selectedCharger.hub_address || 'Address not available'} />
              <InfoRow
                icon={<FaBolt />}
                label="Rate"
                value={
                  priceLoading
                    ? 'Loading...'
                    : selectedPrice?.status === 'AVAILABLE'
                    ? `\u20b9${selectedPrice.price_per_kwh}/kWh`
                    : 'Not available right now'
                }
              />
            </div>
            <div className="border-t border-gray-100 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <button
                onClick={() => {
                  const link = mapsLinkFor(selectedCharger);
                  if (link) window.open(link, '_blank');
                }}
                disabled={!mapsLinkFor(selectedCharger)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <FaMapMarkerAlt />
                <span>Get Directions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isScannerOpen && <QRScannerComponent onClose={toggleScanner} />}
    </div>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 text-gray-600">
    <div className="mt-0.5 flex-shrink-0">{icon}</div>
    <div className="min-w-0">
      <span className="text-sm font-medium text-gray-500">{label}:</span>{' '}
      <span className="text-sm break-words">{value}</span>
    </div>
  </div>
);

export default Dashboard;
