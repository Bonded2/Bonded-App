/**
 * Location Service
 * 
 * This utility provides location-related functionality for the Bonded app, including:
 * - Country/city data retrieval
 * - Geolocation services
 * - Location validation and security checks
 * - VPN/proxy detection
 */
// Google API key - replace with your actual API key
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
// API endpoints for location services
const LOCATION_APIS = {
  GOOGLE_GEOCODING: `https://maps.googleapis.com/maps/api/geocode/json?key=${GOOGLE_API_KEY}`,
  GOOGLE_PLACES: `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${GOOGLE_API_KEY}`,
  IP_INFO: 'https://ipinfo.io/json', // Removed token for graceful fallback
  COUNTRIES: 'https://restcountries.com/v3.1/all?fields=name,cca2,flag,region,subregion,latlng',
};
// Country flags base URL
const FLAG_BASE_URL = 'https://flagcdn.com/16x12';
/**
 * Get a list of all countries with flag images
 * @returns {Promise<Array>} Array of country objects with value, label, and flag properties
 */
export const getAllCountries = async () => {
  try {
    // Check if countries are cached in session storage
    const cachedCountries = sessionStorage.getItem('bonded_countries');
    if (cachedCountries) {
      return JSON.parse(cachedCountries);
    }
    // Fetch countries from API with error handling
    const response = await fetch(LOCATION_APIS.COUNTRIES, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'BondedApp/1.0'
      }
    });
    
    if (!response.ok) {
      console.warn(`Countries API returned ${response.status}: ${response.statusText}`);
      throw new Error(`Failed to fetch countries: ${response.status}`);
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
    // Cache in session storage
    sessionStorage.setItem('bonded_countries', JSON.stringify(countries));
    return countries;
  } catch (error) {
    // Return a minimal fallback list for emergencies
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
 * Get cities for a specific country using Google Places API
 * @param {string} countryCode - ISO country code (2 characters)
 * @returns {Promise<Array>} Array of city objects with value and label properties
 */
export const getCitiesByCountry = async (countryCode) => {
  try {
    // Check cache first
    const cacheKey = `bonded_cities_${countryCode}`;
    const cachedCities = sessionStorage.getItem(cacheKey);
    if (cachedCities) {
      return JSON.parse(cachedCities);
    }
    // Note: In a real production app, you would use Google Places API with a proxy server
    // to avoid exposing your API key. For now, we'll still use our mock data
    // since the client-side Places API calls require a proxy due to CORS restrictions
    let cities = [];
    switch (countryCode) {
      case 'US':
        cities = [
          { value: 'NY', label: 'New York', region: 'East Coast' },
          { value: 'LA', label: 'Los Angeles', region: 'West Coast' },
          { value: 'CH', label: 'Chicago', region: 'Midwest' },
          { value: 'HO', label: 'Houston', region: 'South' },
          { value: 'SF', label: 'San Francisco', region: 'West Coast' },
          { value: 'MI', label: 'Miami', region: 'South' },
          { value: 'DA', label: 'Dallas', region: 'South' },
          { value: 'PH', label: 'Philadelphia', region: 'East Coast' },
          { value: 'AT', label: 'Atlanta', region: 'South' },
          { value: 'DC', label: 'Washington DC', region: 'East Coast' },
        ];
        break;
      case 'CA':
        cities = [
          { value: 'TO', label: 'Toronto', region: 'Ontario' },
          { value: 'MO', label: 'Montreal', region: 'Quebec' },
          { value: 'VA', label: 'Vancouver', region: 'British Columbia' },
          { value: 'CA', label: 'Calgary', region: 'Alberta' },
          { value: 'OT', label: 'Ottawa', region: 'Ontario' },
          { value: 'ED', label: 'Edmonton', region: 'Alberta' },
          { value: 'WI', label: 'Winnipeg', region: 'Manitoba' },
          { value: 'QU', label: 'Quebec City', region: 'Quebec' },
          { value: 'HA', label: 'Halifax', region: 'Nova Scotia' },
          { value: 'VI', label: 'Victoria', region: 'British Columbia' },
        ];
        break;
      case 'GB':
        cities = [
          { value: 'LO', label: 'London', region: 'England' },
          { value: 'MA', label: 'Manchester', region: 'England' },
          { value: 'BI', label: 'Birmingham', region: 'England' },
          { value: 'GL', label: 'Glasgow', region: 'Scotland' },
          { value: 'ED', label: 'Edinburgh', region: 'Scotland' },
          { value: 'LI', label: 'Liverpool', region: 'England' },
          { value: 'BR', label: 'Bristol', region: 'England' },
          { value: 'LE', label: 'Leeds', region: 'England' },
          { value: 'CA', label: 'Cardiff', region: 'Wales' },
          { value: 'BE', label: 'Belfast', region: 'Northern Ireland' },
        ];
        break;
      case 'IN':
        cities = [
          { value: 'MU', label: 'Mumbai', region: 'Maharashtra' },
          { value: 'DE', label: 'Delhi', region: 'Delhi' },
          { value: 'BA', label: 'Bangalore', region: 'Karnataka' },
          { value: 'HY', label: 'Hyderabad', region: 'Telangana' },
          { value: 'CH', label: 'Chennai', region: 'Tamil Nadu' },
          { value: 'KO', label: 'Kolkata', region: 'West Bengal' },
          { value: 'PU', label: 'Pune', region: 'Maharashtra' },
          { value: 'JA', label: 'Jaipur', region: 'Rajasthan' },
          { value: 'LU', label: 'Lucknow', region: 'Uttar Pradesh' },
          { value: 'AH', label: 'Ahmedabad', region: 'Gujarat' },
        ];
        break;
      default:
        // For other countries, return a minimal list (would be from API in production)
        cities = [
          { value: 'CA', label: 'Capital', region: 'Capital Region' },
          { value: 'LC', label: 'Largest City', region: 'Main Region' },
        ];
    }
    // Cache the results
    sessionStorage.setItem(cacheKey, JSON.stringify(cities));
    return cities;
  } catch (error) {
    return [];
  }
};
/**
 * Get user's current location using browser's geolocation API
 * @returns {Promise<{lat: number, lng: number}>} Coordinates object
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
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
 * Convert coordinates to human-readable location using Google Geocoding API
 * @param {Object} coordinates - {lat, lng} coordinates
 * @returns {Promise<Object>} Location information including country, city, region
 */
export const reverseGeocode = async (coordinates) => {
  try {
    const { lat, lng } = coordinates;
    
    // Try using OpenStreetMap's Nominatim API (free and no API key required)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=en`,
        {
          headers: {
            'User-Agent': 'BondedApp/1.0 (relationship-verification-app)'
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.address) {
          const address = data.address;
          
          // Extract precise location data
          const locationData = {
            country: address.country_code?.toUpperCase() || 'US',
            city: address.city || address.town || address.village || address.municipality || 'Unknown City',
            region: address.state || address.region || address.province || address.county || 'Unknown Region',
            fullAddress: data.display_name || 'Address not available',
            postcode: address.postcode || '',
            precise: true,
            coordinates: { lat, lng }
          };
          
          return locationData;
        }
      }
    } catch (apiError) {
      console.warn('Nominatim API failed, falling back to coordinate-based detection:', apiError);
    }
    
    // Fallback: Enhanced coordinate-based detection with more precise regions
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let locationData = {
      country: 'US',
      city: 'New York',
      region: 'New York',
      fullAddress: 'Location detected by coordinates',
      postcode: '',
      precise: false,
      coordinates: { lat, lng }
    };
    
    // More precise coordinate-based detection
    if (lat >= 49 && lat <= 83 && lng >= -141 && lng <= -52) {
      // Canada
      locationData = {
        country: 'CA',
        city: lat > 55 ? 'Edmonton' : lat > 49.2 && lng > -123.2 ? 'Vancouver' : 'Toronto',
        region: lat > 55 ? 'Alberta' : lat > 49.2 && lng > -123.2 ? 'British Columbia' : 'Ontario',
        fullAddress: 'Canada',
        postcode: '',
        precise: false,
        coordinates: { lat, lng }
      };
    } else if (lat >= 50 && lat <= 61 && lng >= -8 && lng <= 2) {
      // United Kingdom
      locationData = {
        country: 'GB',
        city: lat > 55 ? 'Edinburgh' : 'London',
        region: lat > 55 ? 'Scotland' : 'England',
        fullAddress: 'United Kingdom',
        postcode: '',
        precise: false,
        coordinates: { lat, lng }
      };
    } else if (lat >= 8 && lat <= 37 && lng >= 68 && lng <= 97) {
      // India
      locationData = {
        country: 'IN',
        city: lat > 28 ? 'Delhi' : lng > 80 ? 'Kolkata' : lng > 75 ? 'Mumbai' : 'Chennai',
        region: lat > 28 ? 'Delhi' : lng > 80 ? 'West Bengal' : lng > 75 ? 'Maharashtra' : 'Tamil Nadu',
        fullAddress: 'India',
        postcode: '',
        precise: false,
        coordinates: { lat, lng }
      };
    } else if (lat >= 25 && lat <= 49 && lng >= -125 && lng <= -66) {
      // United States
      if (lng > -95) {
        // Eastern US
        locationData.city = lat > 40 ? 'New York' : lat > 32 ? 'Atlanta' : 'Miami';
        locationData.region = lat > 40 ? 'New York' : lat > 32 ? 'Georgia' : 'Florida';
      } else if (lng > -115) {
        // Central US
        locationData.city = lat > 40 ? 'Chicago' : lat > 32 ? 'Dallas' : 'Austin';
        locationData.region = lat > 40 ? 'Illinois' : lat > 32 ? 'Texas' : 'Texas';
      } else {
        // Western US
        locationData.city = lat > 40 ? 'Seattle' : lat > 34 ? 'San Francisco' : 'Los Angeles';
        locationData.region = lat > 40 ? 'Washington' : 'California';
      }
    } else if (lat >= -55 && lat <= -10 && lng >= 112 && lng <= 154) {
      // Australia
      locationData = {
        country: 'AU',
        city: lng > 140 ? 'Sydney' : lat < -35 ? 'Melbourne' : lat < -25 ? 'Brisbane' : 'Perth',
        region: lng > 140 ? 'New South Wales' : lat < -35 ? 'Victoria' : lat < -25 ? 'Queensland' : 'Western Australia',
        fullAddress: 'Australia',
        postcode: '',
        precise: false,
        coordinates: { lat, lng }
      };
    }
    
    return locationData;
  } catch (error) {
    throw new Error('Could not determine location from coordinates');
  }
};
/**
 * Detect if the user is using a VPN or proxy
 * @returns {Promise<{isVPN: boolean, detail: string}>} VPN detection result
 */
export const detectVPN = async () => {
  try {
    // In development mode, avoid making real API calls by returning a default response
    if (process.env.NODE_ENV === 'development') {
      return { 
        isVPN: false, 
        detail: 'VPN detection skipped in development mode',
        ipInfo: { ip: '127.0.0.1', city: 'Local', region: 'Development', country: 'US' }
      };
    }
    // First get basic IP info
    const response = await fetch(LOCATION_APIS.IP_INFO);
    if (!response.ok) {
      // Instead of throwing, just return a default response
      return { 
        isVPN: false, 
        detail: 'VPN detection skipped - service unavailable',
        error: `Status: ${response.status}`
      };
    }
    const ipData = await response.json();
    // Simulate VPN detection logic
    // In reality, this would be a call to a service like ipinfo.io or similar
    const isDatacenter = ipData.hostname?.includes('aws') || 
                         ipData.hostname?.includes('azure') || 
                         ipData.hostname?.includes('cloud');
    const suspiciousOrg = ipData.org?.toLowerCase().includes('vpn') ||
                         ipData.org?.toLowerCase().includes('proxy') ||
                         ipData.org?.toLowerCase().includes('hosting');
    return {
      isVPN: isDatacenter || suspiciousOrg,
      detail: isDatacenter ? 'Datacenter IP detected' : 
              suspiciousOrg ? 'VPN service detected' : 'No VPN detected',
      ipInfo: ipData
    };
  } catch (error) {
    // Default to not reporting VPN in case of errors
    return { isVPN: false, detail: 'Unable to verify VPN status', error: error.message };
  }
};
/**
 * Validate location consistency to detect location spoofing
 * @param {Object} coordinates - {lat, lng} from browser geolocation
 * @returns {Promise<{isConsistent: boolean, message: string}>} Validation result
 */
export const validateLocationConsistency = async (coordinates) => {
  try {
    // In development mode, skip validation
    if (process.env.NODE_ENV === 'development') {
      return { 
        isConsistent: true, 
        message: 'Location validation skipped in development mode'
      };
    }
    // Get IP-based location
    const ipResponse = await fetch(LOCATION_APIS.IP_INFO);
    if (!ipResponse.ok) {
      return { 
        isConsistent: true, 
        message: 'Location validation skipped - service unavailable'
      };
    }
    const ipData = await ipResponse.json();
    const ipLocation = ipData.loc ? ipData.loc.split(',').map(Number) : null;
    // If we don't have IP location data, we can't validate
    if (!ipLocation) {
      return { isConsistent: true, message: 'IP location validation skipped' };
    }
    // Get browser-reported location
    const { lat, lng } = coordinates;
    // Calculate distance between IP location and browser location
    const distance = calculateDistance(
      ipLocation[0], ipLocation[1],
      lat, lng
    );
    // If distance is more than 100km, flag as inconsistent
    if (distance > 100) {
      return {
        isConsistent: false,
        message: `Location mismatch detected: Browser location is ${Math.round(distance)}km from your IP location.`,
        distance
      };
    }
    return {
      isConsistent: true,
      message: 'Location verified',
      distance
    };
  } catch (error) {
    // Default to accepting the location in case of errors
    return { isConsistent: true, message: 'Location validation skipped due to error' };
  }
};
/**
 * Calculate distance between two points using the Haversine formula
 * @private
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
 * @private
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
}; 