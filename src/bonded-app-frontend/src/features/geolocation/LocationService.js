/**
 * LocationService.js
 * 
 * Comprehensive geolocation utility service for the Bonded app.
 * Provides functionality for:
 * - Getting device geolocation
 * - Reverse geocoding coordinates to addresses
 * - IP-based location detection
 * - VPN/proxy detection
 * - Country and city data
 * - Location consistency validation
 * 
 * All API calls use free, CORS-enabled public endpoints
 * All responses are cached in sessionStorage for performance
 */
// Constants for cache keys
const CACHE_KEYS = {
  COUNTRIES: 'bonded_countries',
  CITIES_PREFIX: 'bonded_cities_',
  IP_DATA: 'bonded_ip_data',
  REVERSE_GEO: 'bonded_reverse_geo',
};
// API endpoints - all CORS-friendly and no API key required
const APIS = {
  COUNTRIES: 'https://restcountries.com/v3.1/all',
  REVERSE_GEO: 'https://nominatim.openstreetmap.org/reverse',
  IP_INFO: 'https://ipwho.is',
  CITY_AUTOCOMPLETE: 'https://photon.komoot.io/api/',
};
// Flag icon base URL
const FLAG_BASE_URL = 'https://flagcdn.com/16x12';
/**
 * Gets the current device location using the browser's geolocation API
 * 
 * @returns {Promise<{lat: number, lng: number}>} Location coordinates
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    // Check if browser supports geolocation
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    // Get current position with high accuracy
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};
/**
 * Performs reverse geocoding to convert coordinates to address information
 * Uses OSM Nominatim API (CORS-friendly, no API key required)
 * 
 * @param {Object} coordinates - {lat, lng} coordinates
 * @returns {Promise<Object>} Location details including country, city, etc.
 */
export const reverseGeocode = async (coordinates) => {
  try {
    const { lat, lng } = coordinates;
    // Create cache key from coordinates (rounded to 4 decimal places for consistency)
    const cacheKey = `${CACHE_KEYS.REVERSE_GEO}_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    // Check cache first
    const cachedData = sessionStorage.getItem(cacheKey);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    // Prepare request with proper headers to respect Nominatim usage policy
    const url = `${APIS.REVERSE_GEO}?lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': navigator.language || 'en',
        'User-Agent': 'BondedApp/1.0 (https://bonded.app)'
      }
    });
    if (!response.ok) {
      throw new Error(`Reverse geocoding failed: ${response.status}`);
    }
    const data = await response.json();
    // Format the response into a consistent structure
    const locationData = {
      country: data.address.country_code?.toUpperCase() || '',
      countryName: data.address.country || '',
      region: data.address.state || data.address.county || '',
      city: data.address.city || data.address.town || data.address.village || '',
      postcode: data.address.postcode || '',
      fullAddress: data.display_name || '',
      osm_id: data.osm_id,
      raw: data,
    };
    // Cache the result
    sessionStorage.setItem(cacheKey, JSON.stringify(locationData));
    return locationData;
  } catch (error) {
    // Return minimal fallback object in case of failure
    return {
      country: '',
      countryName: '',
      region: '',
      city: '',
      fullAddress: '',
      error: error.message
    };
  }
};
/**
 * Get IP-based location data and check for VPN/proxy
 * Uses ipwho.is API (CORS-friendly, no API key required)
 * 
 * @returns {Promise<Object>} IP location data and VPN detection results
 */
export const getIpLocation = async () => {
  try {
    // Check cache first
    const cachedData = sessionStorage.getItem(CACHE_KEYS.IP_DATA);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    // Fetch from API
    const response = await fetch(APIS.IP_INFO);
    if (!response.ok) {
      throw new Error(`IP location lookup failed: ${response.status}`);
    }
    const data = await response.json();
    // Detect potential VPN/proxy based on connection type
    const isVpn = data.connection?.type === 'hosting' || 
                 data.connection?.type === 'proxy' || 
                 data.connection?.org?.toLowerCase().includes('vpn') ||
                 data.security?.vpn === true;
    // Format the response
    const ipData = {
      ip: data.ip,
      country: data.country_code,
      countryName: data.country,
      region: data.region,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone?.id || '',
      isVpn,
      vpnDetail: isVpn ? 'VPN or proxy detected' : 'No VPN detected',
      isp: data.connection?.isp || '',
      raw: data
    };
    // Cache the result
    sessionStorage.setItem(CACHE_KEYS.IP_DATA, JSON.stringify(ipData));
    return ipData;
  } catch (error) {
    // Return minimal fallback object in case of failure
    return {
      ip: '',
      country: '',
      countryName: '',
      region: '',
      city: '',
      isVpn: false,
      vpnDetail: 'Could not determine VPN status',
      error: error.message
    };
  }
};
/**
 * Validates consistency between device location and IP location
 * 
 * @param {Object} deviceCoords - {lat, lng} from navigator.geolocation
 * @param {Object} ipLocation - IP location data from getIpLocation()
 * @returns {Object} Validation result with distance and consistency flag
 */
export const validateLocationConsistency = (deviceCoords, ipLocation) => {
  try {
    // If we don't have both coordinates, we can't validate
    if (!deviceCoords?.lat || !deviceCoords?.lng || 
        !ipLocation?.latitude || !ipLocation?.longitude) {
      return { 
        isConsistent: true, 
        distance: null, 
        message: 'Location validation skipped - insufficient data' 
      };
    }
    // Calculate distance between the two locations
    const distance = calculateDistance(
      deviceCoords.lat, deviceCoords.lng,
      ipLocation.latitude, ipLocation.longitude
    );
    // Within 100km is considered consistent
    const isConsistent = distance <= 100;
    return {
      isConsistent,
      distance: Math.round(distance * 10) / 10, // Round to 1 decimal place
      message: isConsistent 
        ? `Location verified (within ${Math.round(distance)}km)` 
        : `Location discrepancy detected (${Math.round(distance)}km apart)`
    };
  } catch (error) {
    // Default to accepting the location in case of errors
    return { 
      isConsistent: true, 
      distance: null, 
      message: 'Location validation failed',
      error: error.message 
    };
  }
};
/**
 * Get a list of all countries with flag images
 * 
 * @returns {Promise<Array>} Array of country objects {value, label, flag}
 */
export const getAllCountries = async () => {
  try {
    // Check cache first
    const cachedCountries = sessionStorage.getItem(CACHE_KEYS.COUNTRIES);
    if (cachedCountries) {
      return JSON.parse(cachedCountries);
    }
    // Fetch from API
    const response = await fetch(APIS.COUNTRIES);
    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }
    const data = await response.json();
    // Format country data
    const countries = data
      .map(country => ({
        value: country.cca2,
        label: country.name.common,
        flag: `${FLAG_BASE_URL}/${country.cca2.toLowerCase()}.png`,
        region: country.region,
        subregion: country.subregion,
        latlng: country.latlng
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    // Cache the results
    sessionStorage.setItem(CACHE_KEYS.COUNTRIES, JSON.stringify(countries));
    return countries;
  } catch (error) {
    // Return a minimal fallback list
    return [
      { value: 'US', label: 'United States', flag: `${FLAG_BASE_URL}/us.png` },
      { value: 'CA', label: 'Canada', flag: `${FLAG_BASE_URL}/ca.png` },
      { value: 'GB', label: 'United Kingdom', flag: `${FLAG_BASE_URL}/gb.png` },
      { value: 'AU', label: 'Australia', flag: `${FLAG_BASE_URL}/au.png` },
      { value: 'IN', label: 'India', flag: `${FLAG_BASE_URL}/in.png` },
    ];
  }
};
/**
 * Get cities for a specific country or matching a search term
 * Uses Photon API (OpenStreetMap data, CORS-friendly)
 * 
 * @param {string} query - Search term for city
 * @param {string} countryCode - Optional ISO country code to limit results
 * @returns {Promise<Array>} Array of city objects
 */
export const getCities = async (query, countryCode) => {
  try {
    if (!query && !countryCode) return [];
    // Create a cache key
    const cacheKey = `${CACHE_KEYS.CITIES_PREFIX}${countryCode || ''}_${query || ''}`;
    // Check cache first
    const cachedCities = sessionStorage.getItem(cacheKey);
    if (cachedCities) {
      return JSON.parse(cachedCities);
    }
    // Build query parameters
    let params = new URLSearchParams();
    if (query) params.append('q', query);
    params.append('limit', '10');
    // Add country filter if specified
    if (countryCode) {
      params.append('osm_tag', `place:city`);
      params.append('boundary.country', countryCode.toLowerCase());
    }
    // Fetch from Photon API
    const response = await fetch(`${APIS.CITY_AUTOCOMPLETE}?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch cities');
    }
    const data = await response.json();
    // Format city data
    const cities = data.features.map(feature => {
      const props = feature.properties;
      return {
        value: props.osm_id,
        label: props.name,
        region: props.state || props.county || '',
        country: props.country || '',
        countryCode: props.countrycode?.toUpperCase() || '',
        coordinates: feature.geometry.coordinates.reverse() // [lat, lng] instead of [lng, lat]
      };
    });
    // Cache the results
    sessionStorage.setItem(cacheKey, JSON.stringify(cities));
    return cities;
  } catch (error) {
    return [];
  }
};
/**
 * Get full geolocation metadata for a file
 * Combines device location, IP location, and validation
 * 
 * @returns {Promise<Object>} Complete location metadata
 */
export const getGeoMetadata = async () => {
  try {
    // Start with getting device location and IP in parallel
    const [deviceLocationPromise, ipLocationPromise] = await Promise.allSettled([
      getCurrentLocation().catch(err => {
        return null;
      }),
      getIpLocation().catch(err => {
        return null;
      })
    ]);
    // Extract results from promises
    const deviceLocation = deviceLocationPromise.status === 'fulfilled' ? deviceLocationPromise.value : null;
    const ipLocation = ipLocationPromise.status === 'fulfilled' ? ipLocationPromise.value : null;
    // Get reverse geocoded location if device location is available
    let resolvedLocation = null;
    if (deviceLocation?.lat && deviceLocation?.lng) {
      resolvedLocation = await reverseGeocode(deviceLocation).catch(err => {
        return null;
      });
    }
    // Check location consistency if both are available
    const locationConsistency = deviceLocation && ipLocation 
      ? validateLocationConsistency(deviceLocation, ipLocation)
      : { isConsistent: null, distance: null, message: 'Location validation skipped' };
    // Construct the metadata object
    const metadata = {
      timestamp: new Date().toISOString(),
      deviceLocation: deviceLocation || { lat: null, lng: null },
      resolvedLocation: resolvedLocation || { 
        city: '', 
        country: '', 
        region: '', 
        fullAddress: '' 
      },
      ipLocation: ipLocation || { 
        ip: '', 
        city: '', 
        region: '', 
        country: '',
        isVpn: null
      },
      vpnCheck: ipLocation?.isVpn || null,
      locationMatch: locationConsistency.isConsistent,
      distance: locationConsistency.distance,
      message: locationConsistency.message
    };
    return metadata;
  } catch (error) {
    // Return a minimal metadata object in case of failure
    return {
      timestamp: new Date().toISOString(),
      deviceLocation: { lat: null, lng: null },
      resolvedLocation: { city: '', country: '', region: '', fullAddress: '' },
      ipLocation: { ip: '', city: '', region: '', country: '' },
      vpnCheck: null,
      locationMatch: null,
      distance: null,
      error: error.message
    };
  }
};
/* UTILITY FUNCTIONS */
/**
 * Calculate distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
};
/**
 * Convert degrees to radians
 * @param {number} deg - Angle in degrees
 * @returns {number} Angle in radians
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
}; 