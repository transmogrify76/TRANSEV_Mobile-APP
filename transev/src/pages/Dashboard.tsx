// src/pages/Dashboard.tsx
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
  FaTag,
  FaParking,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { useHistory } from 'react-router-dom';
import Sidebar from './Sidebar';
import QRScannerComponent from './QRScanner';
import {
  getChargers,
  addFavoriteCharger,
  removeFavoriteCharger,
  getChargerPrice,
  fetchChargerImageObjectUrl,
} from '../services/customerApi';
import { CustomerCharger, CustomerNetworkStatus, CustomerPriceResponse } from '../types/auth';

const mapsLinkFor = (charger: CustomerCharger) =>
  charger.hub_latitude != null && charger.hub_longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${charger.hub_latitude},${charger.hub_longitude}`
    : undefined;

const connectorTypesFor = (charger: CustomerCharger) =>
  Array.from(new Set(charger.connectors.map((c) => c.connector_type))).join(', ') || 'Unknown';

const connectorDetailsFor = (charger: CustomerCharger) =>
  charger.connectors.length
    ? charger.connectors.map((c) => `${c.connector_type} \u00b7 ${c.connector_total_capacity} kW`).join(', ')
    : 'Unknown';

const titleFor = (charger: CustomerCharger) => charger.charger_name || charger.hub_name || charger.charger_id;

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
const ChargerThumb: React.FC<{ charger: CustomerCharger; size?: 'sm' | 'lg' }> = ({ charger, size = 'sm' }) => {
  const [src, setSrc] = useState<string | null>(null);
  const dim = size === 'lg' ? 'w-14 h-14' : 'w-12 h-12';

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
        className={`${dim} rounded-2xl object-cover flex-shrink-0 bg-ink-50`}
      />
    );
  }

  return (
    <div className={`${dim} rounded-2xl bg-brand-50 flex items-center justify-center flex-shrink-0`}>
      <FaBolt className={size === 'lg' ? 'text-xl text-brand-600' : 'text-lg text-brand-600'} />
    </div>
  );
};

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
    if (selectedCharger?.id === charger.id) {
      setSelectedCharger({ ...charger, is_favorite: nextIsFavorite });
    }
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
      if (selectedCharger?.id === charger.id) {
        setSelectedCharger({ ...charger, is_favorite: charger.is_favorite });
      }
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
    <div className="animate-pulse space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2.5xl shadow-soft p-4 flex gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-ink-100 flex-shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-ink-100 rounded w-2/3" />
            <div className="h-3 bg-ink-100 rounded w-1/2" />
            <div className="h-3 bg-ink-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-gradient-to-b from-brand-50 via-white to-white overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      {isSidebarOpen && <div className="fixed inset-0 bg-black opacity-50 z-40" onClick={toggleSidebar} />}

      {/* Header */}
      <div className="flex-none sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-ink-100/60">
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3.5">
          <button
            onClick={toggleSidebar}
            className="p-2.5 rounded-full bg-ink-50 text-ink-700 hover:bg-ink-100 transition flex-shrink-0"
            aria-label="Open menu"
          >
            <FaBars className="text-base" />
          </button>
          <div className="relative flex-1 min-w-0">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <FaSearch className="text-ink-300 text-sm" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-ink-100 rounded-full bg-ink-50 focus:bg-white focus:ring-2 focus:ring-brand-300 focus:border-transparent outline-none transition text-sm sm:text-base placeholder:text-ink-300"
              placeholder="Search chargers or hubs..."
            />
          </div>
          <button
            onClick={() => history.push('/active-session')}
            className="p-2.5 rounded-full bg-brand-50 hover:bg-brand-100 transition flex-shrink-0"
            aria-label="Active session"
          >
            <FaBolt className="text-brand-600 text-sm" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 pb-24">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center mb-4">
            <div className="inline-flex bg-ink-50 p-1 rounded-full">
              <button
                onClick={() => setViewMode('list')}
                className={`px-5 sm:px-6 py-1.5 rounded-full text-sm font-semibold transition ${
                  viewMode === 'list' ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-400'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-5 sm:px-6 py-1.5 rounded-full text-sm font-semibold transition ${
                  viewMode === 'map' ? 'bg-white text-brand-700 shadow-soft' : 'text-ink-400'
                }`}
              >
                Map View
              </button>
            </div>
          </div>

          {/* Nearby-only toggle */}
          <div className="bg-white rounded-2.5xl shadow-soft px-4 py-3.5 mb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    nearbyOnly ? 'bg-brand-100' : 'bg-ink-50'
                  }`}
                >
                  <FaLocationArrow className={`text-sm ${nearbyOnly ? 'text-brand-600' : 'text-ink-300'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">Nearby chargers only</p>
                  <p className="text-xs text-ink-400 truncate">
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
                  nearbyOnly ? 'bg-brand-600' : 'bg-ink-200'
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
              <div className="flex gap-2 mt-3.5 overflow-x-auto pb-0.5">
                {[5, 10, 25, 50].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRadiusChange(r)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                      radiusKm === r ? 'bg-brand-600 text-white shadow-glow' : 'bg-ink-50 text-ink-500'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            )}

            {locating && (
              <p className="text-xs text-brand-600 mt-3 flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                Getting your location...
              </p>
            )}
            {locationError && !locating && (
              <p className="text-xs text-amber-600 mt-3">{locationError}</p>
            )}
          </div>

          {loading ? (
            <SkeletonLoader />
          ) : loadError ? (
            <div className="text-center py-14">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-50 flex items-center justify-center mb-4">
                <FaBolt className="text-2xl text-red-400" />
              </div>
              <p className="text-ink-500 mb-4">{loadError}</p>
              <button
                onClick={() => (nearbyOnly && coords ? fetchChargers({ ...coords, radius: radiusKm }) : fetchChargers())}
                className="px-5 py-2.5 bg-brand-600 text-white rounded-full text-sm font-semibold shadow-glow hover:bg-brand-700 transition"
              >
                Retry
              </button>
            </div>
          ) : viewMode === 'map' ? (
            <div className="rounded-2.5xl overflow-hidden shadow-card" style={{ height: '65vh' }}>
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
            <div className="space-y-3">
              {filteredChargers.length === 0 ? (
                <div className="text-center py-14">
                  <div className="w-16 h-16 mx-auto rounded-full bg-ink-50 flex items-center justify-center mb-4">
                    <FaBolt className="text-2xl text-ink-300" />
                  </div>
                  <p className="text-ink-400 text-sm">No chargers found matching your search.</p>
                </div>
              ) : (
                filteredChargers.map((charger) => (
                  <div
                    key={charger.id}
                    onClick={() => handleSelectCharger(charger)}
                    className="bg-white rounded-2.5xl shadow-soft hover:shadow-card cursor-pointer transition-all duration-200 p-4 flex items-start gap-3.5"
                  >
                    <ChargerThumb charger={charger} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-ink-900 truncate">
                            {titleFor(charger)}
                          </h3>
                          <p className="text-xs text-ink-400 mt-0.5">ID: {charger.charger_id}</p>
                        </div>
                        <button
                          onClick={(e) => handleFavoriteToggle(charger, e)}
                          className="p-1.5 -mt-1 -mr-1 rounded-full hover:bg-red-50 transition flex-shrink-0"
                          aria-label="Toggle favorite"
                        >
                          <FaHeart
                            className={`text-lg transition ${
                              charger.is_favorite ? 'text-red-500' : 'text-ink-200 hover:text-red-300'
                            }`}
                          />
                        </button>
                      </div>
                      {isNoteworthyStatus(charger.status) && (
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
                          <FaExclamationTriangle className="text-[9px]" />
                          {LISTING_STATUS_LABEL[charger.status]}
                        </span>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-ink-500">
                        {charger.distance_km != null && (
                          <span className="inline-flex items-center gap-1">
                            <FaMapMarkerAlt className="text-ink-300 text-[10px]" />
                            {charger.distance_km.toFixed(1)} km
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <FaBolt className="text-ink-300 text-[10px]" />
                          {charger.max_power_kw} kW
                        </span>
                        <span className="inline-flex items-center gap-1 truncate">
                          <FaPlug className="text-ink-300 text-[10px]" />
                          {connectorTypesFor(charger)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FaClock className="text-ink-300 text-[10px]" />
                          {charger.twenty_four_seven_open_status ? '24/7' : 'Specific hours'}
                        </span>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-ink-100 px-2 sm:px-4 flex items-center justify-around shadow-[0_-4px_20px_rgba(30,41,26,0.06)] z-10 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <button onClick={() => history.push('/dashboard')} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-brand-600 transition">
          <FaMapMarkerAlt className="text-lg" />
          <span className="text-[11px] font-medium">Find</span>
        </button>
        <button onClick={() => history.push('/wallet')} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-ink-300 hover:text-brand-600 transition">
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

        <button onClick={() => history.push('/userprofile')} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-ink-300 hover:text-brand-600 transition">
          <FaUser className="text-lg" />
          <span className="text-[11px] font-medium">Profile</span>
        </button>
        <button onClick={toggleSidebar} className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-ink-300 hover:text-brand-600 transition">
          <FaBars className="text-lg" />
          <span className="text-[11px] font-medium">Menu</span>
        </button>
      </div>

      {/* Charger Details Modal */}
      {selectedCharger && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-2.5xl shadow-card w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm rounded-t-3xl sm:rounded-t-2.5xl border-b border-ink-100 px-5 py-4 flex justify-between items-center gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <ChargerThumb charger={selectedCharger} size="lg" />
                <h2 className="text-base sm:text-lg font-bold text-ink-900 truncate">
                  {titleFor(selectedCharger)}
                </h2>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={(e) => handleFavoriteToggle(selectedCharger, e)}
                  className="p-2.5 rounded-full hover:bg-red-50 transition"
                  aria-label="Toggle favorite"
                >
                  <FaHeart className={`text-lg ${selectedCharger.is_favorite ? 'text-red-500' : 'text-ink-200'}`} />
                </button>
                <button
                  onClick={() => setSelectedCharger(null)}
                  className="p-2.5 rounded-full hover:bg-ink-50 transition"
                  aria-label="Close"
                >
                  <FaTimes className="text-ink-400" />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-1">
              {isNoteworthyStatus(selectedCharger.status) && (
                <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium">
                  <FaExclamationTriangle className="flex-shrink-0" />
                  <span>
                    {LISTING_STATUS_LABEL[selectedCharger.status]} in the CMS - this reflects the operator's
                    listing, not live charger availability.
                  </span>
                </div>
              )}
              <InfoRow icon={<FaBuilding />} label="Public ID" value={selectedCharger.charger_id} />
              {selectedCharger.distance_km != null && (
                <InfoRow icon={<FaMapMarkerAlt />} label="Distance" value={`${selectedCharger.distance_km.toFixed(1)} km`} />
              )}
              <InfoRow icon={<FaClock />} label="Timings" value={selectedCharger.twenty_four_seven_open_status ? '24/7' : 'Specific hours'} />
              <InfoRow icon={<FaBolt />} label="Max Power" value={`${selectedCharger.max_power_kw} kW`} />
              <InfoRow icon={<FaPlug />} label="Connectors" value={connectorDetailsFor(selectedCharger)} />
              {(selectedCharger.charger_type || selectedCharger.segment || selectedCharger.sub_segment) && (
                <InfoRow
                  icon={<FaTag />}
                  label="Type"
                  value={[selectedCharger.charger_type, selectedCharger.segment, selectedCharger.sub_segment]
                    .filter(Boolean)
                    .join(' \u00b7 ')}
                />
              )}
              {selectedCharger.parking && (
                <InfoRow icon={<FaParking />} label="Parking" value={selectedCharger.parking} />
              )}
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
            <div className="border-t border-ink-100 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
              <button
                onClick={() => {
                  const link = mapsLinkFor(selectedCharger);
                  if (link) window.open(link, '_blank');
                }}
                disabled={!mapsLinkFor(selectedCharger)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-glow transition disabled:opacity-50 disabled:shadow-none"
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
  <div className="flex items-start gap-3 py-2">
    <div className="w-8 h-8 rounded-xl bg-ink-50 flex items-center justify-center flex-shrink-0 text-ink-400 text-sm">
      {icon}
    </div>
    <div className="min-w-0 pt-1">
      <span className="text-[11px] uppercase tracking-wide font-semibold text-ink-300">{label}</span>
      <p className="text-sm text-ink-800 break-words">{value}</p>
    </div>
  </div>
);

export default Dashboard;