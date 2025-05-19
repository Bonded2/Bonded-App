import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getGeoMetadata } from './LocationService';

// Create context
export const GeoMetadataContext = createContext(null);

/**
 * Provider component for geolocation metadata
 * Manages fetching and caching of location data
 */
export const GeoMetadataProvider = ({ children }) => {
  // State for storing the metadata
  const [geoMetadata, setGeoMetadata] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Function to refresh metadata on demand
  const refreshMetadata = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const metadata = await getGeoMetadata();
      setGeoMetadata(metadata);
    } catch (err) {
      console.error('Error fetching geolocation metadata:', err);
      setError(err.message || 'Failed to get location data');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Initialize on mount
  useEffect(() => {
    // Check if we already have cached metadata in session storage
    const cachedMetadata = sessionStorage.getItem('bonded_geo_metadata');
    
    if (cachedMetadata) {
      try {
        const parsed = JSON.parse(cachedMetadata);
        setGeoMetadata(parsed);
      } catch (err) {
        console.warn('Failed to parse cached geo metadata');
      }
    }
    
    // Fetch fresh metadata anyway, but no need to block rendering
    refreshMetadata();
  }, [refreshMetadata]);
  
  // Whenever metadata changes, update the cache
  useEffect(() => {
    if (geoMetadata) {
      sessionStorage.setItem('bonded_geo_metadata', JSON.stringify(geoMetadata));
    }
  }, [geoMetadata]);
  
  // Context value
  const contextValue = {
    metadata: geoMetadata,
    isLoading,
    error,
    refreshMetadata,
  };
  
  return (
    <GeoMetadataContext.Provider value={contextValue}>
      {children}
    </GeoMetadataContext.Provider>
  );
};

export default GeoMetadataProvider; 