import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TopAppBar } from '../../components/TopAppBar';
import { MediaScannerModal } from "../../components/MediaScanner";
import LocationPanel from '../../features/geolocation/LocationPanel';
import { useGeoMetadata } from '../../features/geolocation/hooks/useGeoMetadata';

export const MediaImport = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showGeolocationData, setShowGeolocationData] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const { metadata, refreshMetadata } = useGeoMetadata();
  
  // Refresh geolocation when component mounts
  useEffect(() => {
    refreshMetadata();
  }, [refreshMetadata]);
  
  // Handle opening modal
  const handleOpenMediaScanner = () => {
    setIsModalOpen(true);
  };
  
  // Handle files added to timeline
  const handleFilesAdded = (filesWithMetadata) => {
    console.log('Files added to timeline with metadata:', filesWithMetadata);
    
    // In a real app, this would store the files in your backend
    // For this demo, we'll store them in state to display
    setRecentFiles(prev => [...filesWithMetadata, ...prev].slice(0, 10));
    
    // Show success notification
    alert(`Successfully added ${filesWithMetadata.length} files to your timeline!`);
    
    // Close the modal
    setIsModalOpen(false);
  };
  
  // Common styles
  const cardStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: "0.5rem",
    padding: "1rem",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)",
    marginBottom: "1.5rem"
  };

  const headingStyle = {
    fontSize: "1.25rem",
    fontWeight: "600",
    marginBottom: "1rem",
    fontFamily: "Trocchi, serif",
    color: "#2C4CDF"
  };

  const buttonStyle = {
    backgroundColor: "#B9FF46",
    color: "#2C4CDF",
    padding: "0.5rem 1rem",
    borderRadius: "0.25rem",
    border: "none",
    cursor: "pointer",
    transition: "background-color 0.2s ease"
  };

  return (
    <div className="media-scanner-utility">
      <TopAppBar title="Media Import" showBackButton={true} />
      
      <div className="content p-4">
        <div className="flex flex-col space-y-6">
          <div style={cardStyle}>
            <h2 style={headingStyle}>Import Media to Timeline</h2>
            <p style={{color: "#333333", marginBottom: "1rem"}}>
              Import photos, documents, and media files from your device to your relationship timeline.
            </p>
            <p style={{color: "#666666", marginBottom: "1.5rem", fontSize: "0.875rem"}}>
              All files will be automatically tagged with your current location metadata to help verify your relationship status.
            </p>
            
            <button 
              onClick={handleOpenMediaScanner}
              style={buttonStyle}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#a8e63f"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#B9FF46"}
            >
              Open Media Scanner
            </button>
          </div>
          
          {recentFiles.length > 0 && (
            <div style={cardStyle}>
              <h2 style={headingStyle}>Recently Added Files</h2>
              <div className="mt-2 flex flex-col gap-2">
                {recentFiles.map((fileData, index) => (
                  <div 
                    key={index} 
                    style={{
                      backgroundColor: "rgba(44, 76, 223, 0.1)",
                      padding: "0.75rem",
                      borderRadius: "0.25rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}
                  >
                    <div>
                      <p className="text-sm" style={{color: "#333333", fontWeight: "500"}}>{fileData.file.name}</p>
                      <p style={{fontSize: "0.75rem", color: "#666666"}}>
                        {new Date(fileData.timestamp || fileData.file.lastModified).toLocaleDateString()}{' '}
                        {fileData.metadata?.deviceLocation?.lat && (
                          <span>• Location verified ✓</span>
                        )}
                      </p>
                    </div>
                    <div style={{fontSize: "0.75rem", color: "#2C4CDF"}}>
                      {(fileData.file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div style={cardStyle}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={headingStyle}>Location Information</h2>
              <button
                onClick={() => setShowGeolocationData(!showGeolocationData)}
                style={buttonStyle}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#a8e63f"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#B9FF46"}
              >
                {showGeolocationData ? 'Hide Details' : 'Show Details'}
              </button>
            </div>
            
            {showGeolocationData ? (
              <LocationPanel />
            ) : (
              <div>
                <p style={{color: "#333333", marginBottom: "0.5rem"}}>
                  Your current location data will be attached to any files you import.
                </p>
                
                {metadata && (
                  <div style={{
                    backgroundColor: "rgba(44, 76, 223, 0.1)", 
                    padding: "0.75rem",
                    borderRadius: "0.25rem",
                    marginTop: "0.5rem",
                    fontSize: "0.875rem",
                    color: "#333333"
                  }}>
                    <div style={{display: "flex", alignItems: "center", marginBottom: "0.5rem"}}>
                      <span style={{fontWeight: "500", width: "8rem"}}>Current location:</span>
                      <span>
                        {metadata.resolvedLocation?.city || metadata.ipLocation?.city || 'Unknown'}{metadata.resolvedLocation?.country && (
                          <img 
                            src={`https://flagcdn.com/16x12/${metadata.resolvedLocation.country.toLowerCase()}.png`}
                            alt={metadata.resolvedLocation.countryName || ''}
                            style={{marginLeft: "0.5rem", verticalAlign: "middle"}}
                            width="16"
                            height="12"
                          />
                        )}
                      </span>
                    </div>
                    <div style={{display: "flex", alignItems: "center"}}>
                      <span style={{fontWeight: "500", width: "8rem"}}>VPN detected:</span>
                      <span style={{color: metadata.vpnCheck ? '#FF704D' : '#4CAF50'}}>
                        {metadata.vpnCheck ? 'Yes ⚠️' : 'No ✓'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {isModalOpen && (
        <MediaScannerModal
          onClose={() => setIsModalOpen(false)}
          onFilesAdded={handleFilesAdded}
        />
      )}
    </div>
  );
};

// For backward compatibility
export const MediaScannerDemo = MediaImport; 