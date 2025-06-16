import React, { useState, useEffect } from "react";
import { MediaScanner } from "./MediaScanner";
import { useGeoMetadata } from "../../features/geolocation/hooks/useGeoMetadata";
import "./style.css";
/**
 * Modal wrapper for the MediaScanner component that adds timeline and geolocation integration
 */
export const MediaScannerModal = ({ onClose, onMediaSelected }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  // Get geolocation metadata hook
  const { metadata, isLoading, refreshMetadata, getMetadataForFile } = useGeoMetadata();
  // Refresh metadata when component mounts
  useEffect(() => {
    refreshMetadata();
  }, [refreshMetadata]);
  // Update location status when metadata changes
  useEffect(() => {
    if (isLoading) {
      setLocationStatus("Updating location data...");
    } else if (metadata) {
      const location = metadata.resolvedLocation?.city || metadata.ipLocation?.city || 'Unknown';
      const country = metadata.resolvedLocation?.countryName || metadata.ipLocation?.countryName || '';
      setLocationStatus(`Location: ${location}${country ? `, ${country}` : ''} ${metadata.vpnCheck ? '(VPN detected)' : '✓'}`);
    }
  }, [metadata, isLoading]);
  // Handle media selection from scanner
  const handleMediaSelect = (files) => {
    setSelectedFiles(files);
    setStatus(`${files.length} files selected. Click "Add to Timeline" to complete.`);
  };
  // Reset selection
  const handleReset = () => {
    setSelectedFiles([]);
    setStatus("");
  };
  /**
   * Group files by date for better organization
   */
  const groupFilesByDate = (files) => {
    const groups = {};
    files.forEach(file => {
      // Make sure we have a valid timestamp
      const timestamp = file.timestamp || file.file?.lastModified || Date.now();
      // Create a new Date object
      const date = new Date(timestamp);
      // Format date in a consistent way - YYYY-MM-DD format
      const dateKey = date.toLocaleDateString('en-CA');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(file);
    });
    // Log the grouped files for debugging
    // Sort files within each date group by timestamp
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => {
        const timestampA = a.timestamp || a.file?.lastModified || 0;
        const timestampB = b.timestamp || b.file?.lastModified || 0;
        return timestampB - timestampA; // Sort newest first
      });
    });
    return groups;
  };
  // Process selected files with geolocation data and add to timeline
  const processFilesWithGeolocation = async () => {
    try {
      if (selectedFiles.length === 0) {
        setStatus("Please select at least one file first");
        return;
      }
      setIsProcessing(true);
      setStatus(`Processing ${selectedFiles.length} files with location data...`);
      // First validate all files to make sure they're viable
      const validFiles = selectedFiles.filter(file => {
        // Check if it's actually a valid file
        if (!file || !file.file || !(file.file instanceof Blob)) {
          return false;
        }
        // Additional validation - check if the file has a size and type
        if (!file.file.size || file.file.size <= 0) {
          return false;
        }
        // Make sure we have a timestamp
        if (!file.timestamp) {
          // If no timestamp, assign from file.lastModified or current time
          file.timestamp = file.file.lastModified || Date.now();
        }
        return true;
      });
      if (validFiles.length === 0) {
        throw new Error("No valid files selected. Please try again.");
      }
      if (validFiles.length < selectedFiles.length) {
        setStatus(`Warning: ${selectedFiles.length - validFiles.length} invalid files were skipped.`);
      }
      // Refresh geolocation metadata to ensure it's up-to-date
      await refreshMetadata();
      // Ensure we have location data
      if (!metadata) {
        // Wait a bit and try to get metadata again
        setStatus("Waiting for location data...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refreshMetadata();
        if (!metadata) {
          setStatus("Warning: Unable to get location data. Files will be imported without location verification.");
        }
      }
      // Group files by date for better organization before attaching metadata
      const filesByDate = groupFilesByDate(validFiles);
      // Attach metadata to each file
      const filesWithMetadata = validFiles.map(file => {
        return {
          ...file,
          metadata: {
            ...file.metadata,
            currentLocation: metadata,
            timestamp: file.timestamp || file.file.lastModified || Date.now()
          }
        };
      });
      // Call the parent component's onMediaSelected handler
      onMediaSelected(filesWithMetadata, filesByDate);
      setStatus(`Successfully processed ${validFiles.length} files`);
      setIsProcessing(false);
    } catch (error) {
      setStatus(`Error: ${error.message || "Failed to process files"}`);
      setIsProcessing(false);
    }
  };
  return (
    <div className="media-scanner-modal-overlay">
      <div className="media-scanner-modal-container">
        <div className="media-scanner-modal-header">
          <h2>Import Media to Timeline</h2>
          <button 
            className="close-button" 
            onClick={onClose}
            aria-label="Close media scanner"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#FFFFFF"/>
            </svg>
          </button>
        </div>
        <div className="media-scanner-modal-content">
          {locationStatus && (
            <div className="media-scanner-location-status">
              <div className="location-indicator" style={{
                backgroundColor: metadata?.vpnCheck ? '#fff3cd' : '#e8f5e9',
                color: metadata?.vpnCheck ? '#856404' : '#2e7d32',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginRight: '8px'}}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" 
                    fill={metadata?.vpnCheck ? '#856404' : '#2e7d32'}/>
                </svg>
                {locationStatus}
                <button
                  onClick={refreshMetadata}
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: metadata?.vpnCheck ? '#856404' : '#2e7d32',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Refresh location data"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" 
                      fill={metadata?.vpnCheck ? '#856404' : '#2e7d32'}/>
                  </svg>
                </button>
              </div>
            </div>
          )}
          <div className="media-scanner-scrollable">
            <MediaScanner onMediaSelected={handleMediaSelect} />
          </div>
          {status && (
            <div className="media-scanner-status">
              {status}
            </div>
          )}
          <div className="media-scanner-actions">
            <div style={{display: 'flex', gap: '8px'}}>
              <button 
                className="cancel-button" 
                onClick={onClose}
                disabled={isProcessing}
              >
                Cancel
              </button>
              {selectedFiles.length > 0 && (
                <button
                  className="reset-button"
                  onClick={handleReset}
                  disabled={isProcessing}
                  style={{
                    backgroundColor: '#f5f5f5',
                    color: '#333',
                    border: '1px solid #ddd'
                  }}
                >
                  Reset Selection
                </button>
              )}
            </div>
            <button 
              className="process-button" 
              onClick={processFilesWithGeolocation}
              disabled={selectedFiles.length === 0 || isProcessing}
            >
              {isProcessing 
                ? "Processing..." 
                : `Add ${selectedFiles.length > 0 ? selectedFiles.length : ''} to Timeline`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 