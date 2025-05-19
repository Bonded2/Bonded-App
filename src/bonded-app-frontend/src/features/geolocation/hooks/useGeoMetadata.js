import { useContext } from 'react';
import { GeoMetadataContext } from '../GeoMetadataProvider';
import { getGeoMetadata } from '../LocationService';

/**
 * Custom hook for accessing geolocation metadata
 * Provides access to the current metadata, loading state, and refresh functions
 * 
 * @returns {Object} { metadata, isLoading, error, refreshMetadata, getMetadataForFile }
 */
export const useGeoMetadata = () => {
  // Access the context
  const context = useContext(GeoMetadataContext);
  
  // Make sure we're using this hook inside the GeoMetadataProvider
  if (!context) {
    throw new Error('useGeoMetadata must be used within a GeoMetadataProvider');
  }
  
  // Extract values from context
  const { metadata, isLoading, error, refreshMetadata } = context;
  
  /**
   * Helper function to get metadata for a specific file
   * This is the function to use during file upload to attach metadata to files
   * 
   * @param {File} file - File object to attach metadata to
   * @returns {Promise<Object>} File with attached metadata
   */
  const getMetadataForFile = async (file) => {
    try {
      // Use current cached metadata if available, otherwise fetch fresh metadata
      const geoMetadata = metadata || await getGeoMetadata();
      
      // Create a new object that includes the file and metadata
      // This doesn't modify the original file object
      return {
        file,
        metadata: geoMetadata,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('Error attaching metadata to file:', err);
      // Return the file with minimal metadata in case of failure
      return {
        file,
        metadata: {
          timestamp: new Date().toISOString(),
          error: err.message || 'Failed to get location metadata'
        }
      };
    }
  };
  
  // Return everything from the context plus our helper function
  return {
    metadata,
    isLoading,
    error,
    refreshMetadata,
    getMetadataForFile
  };
};

export default useGeoMetadata; 