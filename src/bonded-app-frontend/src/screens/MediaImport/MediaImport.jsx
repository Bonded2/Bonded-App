import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TopAppBar } from '../../components/TopAppBar';
import { MediaScannerModal } from "../../components/MediaScanner";
import LocationPanel from '../../features/geolocation/LocationPanel';
import { useGeoMetadata } from '../../features/geolocation/hooks/useGeoMetadata';
import TelegramExportUpload from '../../components/TelegramExportUpload/TelegramExportUpload';
import "./style.css";
export const MediaImport = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showGeolocationData, setShowGeolocationData] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const [importSuccess, setImportSuccess] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const { metadata, refreshMetadata } = useGeoMetadata();
  // Refresh geolocation when component mounts
  useEffect(() => {
    refreshMetadata();
  }, [refreshMetadata]);
  // Handle opening modal
  const handleOpenMediaScanner = () => {
    setIsModalOpen(true);
  };
  // Navigate to timeline
  const handleViewTimeline = () => {
    navigate('/timeline-created', { 
      state: { 
        fromMediaImport: true, 
        mediaCount: recentFiles.length,
        dateRange: recentFiles.length > 0 ? 
          `${new Date(recentFiles[recentFiles.length-1].timestamp || recentFiles[recentFiles.length-1].file.lastModified).toLocaleDateString()} - ${new Date(recentFiles[0].timestamp || recentFiles[0].file.lastModified).toLocaleDateString()}` : 
          null 
      }
    });
  };
  // Handle files added to timeline with AI filtering
  const handleFilesAdded = async (filesWithMetadata) => {
    try {
      setIsModalOpen(false);
      
      // Import AI filtering service and timeline service
      const { aiEvidenceFilter } = await import('../../services/index.js');
      const { timelineService } = await import('../../services/timelineService.js');
      
      let processedCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      
      // Process each file through AI filtering pipeline
      for (const fileData of filesWithMetadata) {
        try {
          processedCount++;
          
          // Create proper image element for AI processing
          const imageElement = await createImageFromFile(fileData.file);
          
          // Run through AI filtering (NSFW + OCR + Text classification)
          const filterResult = await aiEvidenceFilter.filterImage(imageElement, fileData.metadata);
          
          if (filterResult.approved) {
            approvedCount++;
            
            // Create timeline entry for approved content
            const timelineEntry = {
              id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: filterResult.details.ocrExtraction?.text ? 'photo_with_text' : 'photo',
              content: {
                file: fileData.file,
                filename: fileData.file.name,
                fileType: fileData.file.type,
                fileSize: fileData.file.size,
                extractedText: filterResult.details.ocrExtraction?.text || null
              },
              metadata: {
                ...fileData.metadata,
                source: 'media_import',
                aiProcessed: true,
                aiResult: filterResult,
                nsfwFiltered: true,
                processingTime: filterResult.processing_time || 0
              },
              timestamp: new Date(fileData.timestamp || fileData.file.lastModified).toISOString(),
              uploadStatus: 'pending'
            };
            
            // Add to timeline service
            await timelineService.addTimelineEntry(timelineEntry);
            
          } else {
            rejectedCount++;
            console.log(`File rejected: ${fileData.file.name} - ${filterResult.reasoning}`);
          }
          
        } catch (error) {
          rejectedCount++;
          console.error(`Error processing file ${fileData.file.name}:`, error);
        }
      }
      
      // Show results
      const message = `Processed ${processedCount} files: ${approvedCount} approved, ${rejectedCount} filtered out`;
      setProcessingStatus(message);
      
      // Auto-clear status after 5 seconds
      setTimeout(() => {
        setProcessingStatus('');
      }, 5000);
      
      if (approvedCount > 0) {
        setRecentFiles(prev => [...prev, ...filesWithMetadata.slice(0, approvedCount)]);
        setImportSuccess(true);
      }
      
    } catch (error) {
      console.error('Error in handleFilesAdded:', error);
      setProcessingStatus(`Error processing files: ${error.message}`);
    }
  };

  // Helper function to create image element from file
  const createImageFromFile = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(img.src);
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  };

  // Legacy function for backward compatibility
  const handleFilesAddedLegacy = (filesWithMetadata) => {
    // Group files by date for timeline organization
    const groupedByDate = {};
    filesWithMetadata.forEach(fileData => {
      const file = fileData.file;
      // Use the file's timestamp or lastModified date
      const timestamp = fileData.timestamp || file.lastModified;
      const date = new Date(timestamp);
      // Format for grouping: use more specific format to avoid all files going into one day
      // Convert to YYYY-MM-DD format but ensure it's using local timezone
      const dateKey = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format for grouping
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(fileData);
    });
    // Save to localStorage in the same format TimelineCreated expects
    try {
      // Get existing content
      const TIMESTAMP_CONTENT_KEY = 'bonded_timestamp_content';
      const TIMELINE_DATA_KEY = 'bonded_timeline_data';
      const allContent = JSON.parse(localStorage.getItem(TIMESTAMP_CONTENT_KEY) || '{}');
      const existingTimelineData = JSON.parse(localStorage.getItem(TIMELINE_DATA_KEY) || '[]');
      const newTimelineEntries = [];
      let updatedExistingEntries = 0;
      let newlyCreatedEntries = 0;
      let totalFilesProcessed = 0;
      // Process each date group
      Object.keys(groupedByDate).forEach(dateKey => {
        const files = groupedByDate[dateKey];
        totalFilesProcessed += files.length;
        // Format date in the display format expected by the timeline
        const displayDate = formatDateForDisplay(new Date(dateKey));
        // Check if this date already exists in timeline
        const existingEntryIndex = existingTimelineData.findIndex(item => {
          // If dates match exactly or close enough
          return item.date === displayDate;
        });
        // Find a valid file for thumbnail
        const validFileForThumbnail = findValidFileForThumbnail(files);
        let imageUrl = null;
        if (validFileForThumbnail) {
          try {
            // Ensure the file is valid before creating URL
            if (validFileForThumbnail.file instanceof Blob) {
              imageUrl = URL.createObjectURL(validFileForThumbnail.file);
            } else {
            }
          } catch (err) {
            imageUrl = null;
          }
        }
        if (existingEntryIndex >= 0) {
          // Update existing entry
          const existingEntry = existingTimelineData[existingEntryIndex];
          existingEntry.photos = (existingEntry.photos || 0) + files.length;
          updatedExistingEntries++;
          // Update image only if none exists and we have a valid new one
          if (!existingEntry.image && imageUrl) {
            existingEntry.image = imageUrl;
          }
          // Get location from files
          const location = getLocationFromFiles(files);
          if (location && !existingEntry.location) {
            existingEntry.location = location;
          }
        } else if (files.length > 0) {
          // Create new timeline entry
          const newEntry = {
            id: Date.now() + Math.random(), // Ensure unique ID
            date: displayDate,
            photos: files.length,
            messages: 0,
            location: getLocationFromFiles(files) || "Imported Media",
            hasMessageIcon: false,
            image: imageUrl, // Use thumbnail if available, otherwise null
            timestamp: new Date(dateKey).getTime(),
            source: 'device media',
            uploadStatus: 'completed',
          };
          newTimelineEntries.push(newEntry);
          newlyCreatedEntries++;
        }
        // Update content for this date
        const dateContent = allContent[displayDate] || [];
        // Add new files as content items
        const newContentItems = files.map(fileData => {
          // Try to create object URL safely
          let fileImageUrl = null;
          try {
            if (fileData.file instanceof Blob) {
              fileImageUrl = URL.createObjectURL(fileData.file);
            } else {
            }
          } catch (err) {
          }
          return {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: getFileType(fileData.file?.type || "unknown"),
            name: fileData.file?.name || "Unknown File",
            source: "Device Media",
            location: fileData.metadata?.resolvedLocation?.city || "Imported",
            date: displayDate,
            imageUrl: fileImageUrl,
            timestamp: fileData.timestamp || (fileData.file?.lastModified || Date.now()),
            size: fileData.file?.size || 0,
            path: fileData.file?.path || 'Imported'
          };
        });
        allContent[displayDate] = [...dateContent, ...newContentItems];
      });
      // Combine existing timeline with new entries and sort
      const updatedTimelineData = [...existingTimelineData, ...newTimelineEntries]
        .sort((a, b) => {
          const timestampA = a.timestamp || new Date(a.date).getTime();
          const timestampB = b.timestamp || new Date(b.date).getTime();
          return timestampB - timestampA; // Newest first
        });
      // Save to localStorage
      localStorage.setItem(TIMELINE_DATA_KEY, JSON.stringify(updatedTimelineData));
      localStorage.setItem(TIMESTAMP_CONTENT_KEY, JSON.stringify(allContent));
    } catch (err) {
    }
    // In a real app, this would store the files in your backend
    // For this demo, we'll store them in state to display
    setRecentFiles(prev => [...filesWithMetadata, ...prev].slice(0, 10));
    // Set success state
    setImportSuccess(true);
    // Close the modal
    setIsModalOpen(false);
  };
  /**
   * Find a valid file that can be used for creating a thumbnail
   */
  const findValidFileForThumbnail = (files) => {
    if (!files || files.length === 0) return null;
    // First try to find an image file
    const imageFile = files.find(file => 
      file && file.file instanceof Blob && file.file.type.startsWith('image/')
    );
    // If found, return it
    if (imageFile) return imageFile;
    // Otherwise find any valid blob
    const validFile = files.find(file => 
      file && file.file instanceof Blob
    );
    return validFile || null;
  };
  /**
   * Format a date for display in the timeline
   */
  const formatDateForDisplay = (date) => {
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };
  /**
   * Get file type based on MIME type
   */
  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return 'photo';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('application/pdf')) {
      return 'document';
    } else {
      return 'file';
    }
  };
  /**
   * Extract location information from files
   */
  const getLocationFromFiles = (files) => {
    try {
      // Find a file with location data
      const fileWithLocation = files.find(file => 
        file.metadata?.resolvedLocation?.city || 
        file.metadata?.ipLocation?.city
      );
      if (fileWithLocation) {
        const metadata = fileWithLocation.metadata;
        // Prefer device location over IP location
        if (metadata.resolvedLocation?.city) {
          const city = metadata.resolvedLocation.city;
          const country = metadata.resolvedLocation.countryName;
          // Format as "City, Country" or just "City" if country is not available
          if (country && country !== city) {
            return `${city}, ${country}`;
          }
          return city;
        } else if (metadata.ipLocation?.city) {
          const city = metadata.ipLocation.city;
          const country = metadata.ipLocation.countryName;
          if (country && country !== city) {
            return `${city}, ${country}`;
          }
          return city;
        }
      }
      // Default location if none found
      return "Imported Media";
    } catch (error) {
      return "Imported Media";
    }
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
  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#2C4CDF",
    color: "white",
    marginLeft: "0.5rem"
  };
  return (
    <div className="media-scanner-utility">
      <TopAppBar title="Media Import" showBackButton={true} />
      <div className="content p-4">
        <div className="flex flex-col space-y-6">
          {importSuccess && (
            <div style={{
              backgroundColor: "rgba(76, 175, 80, 0.2)",
              color: "#4CAF50",
              padding: "0.75rem",
              borderRadius: "0.25rem",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span>Successfully added {recentFiles.length} files to your timeline!</span>
              <button 
                style={secondaryButtonStyle}
                onClick={handleViewTimeline}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1A3BC9"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2C4CDF"}
              >
                View Timeline
              </button>
            </div>
          )}
          <div style={cardStyle}>
            <h2 style={headingStyle}>Import Media to Timeline</h2>
            <p style={{color: "#333333", marginBottom: "1rem"}}>
              Import photos, documents, and media files from your device to your relationship timeline.
            </p>
            <p style={{color: "#666666", marginBottom: "1.5rem", fontSize: "0.875rem"}}>
              All files will be automatically tagged with your current location metadata to help verify your relationship status.
            </p>
            <div style={{display: "flex"}}>
              <button 
                onClick={handleOpenMediaScanner}
                style={buttonStyle}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#a8e63f"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#B9FF46"}
              >
                Open Media Scanner
              </button>
              <button 
                onClick={handleViewTimeline}
                style={secondaryButtonStyle}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#1A3BC9"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#2C4CDF"}
              >
                View Timeline
              </button>
            </div>
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
      
      {/* Processing Status */}
      {processingStatus && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#4ade80',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 10000,
          maxWidth: '400px',
          fontSize: '14px'
        }}>
          {processingStatus}
        </div>
      )}
      
      {isModalOpen && (
        <MediaScannerModal
          onClose={() => setIsModalOpen(false)}
          onMediaSelected={handleFilesAdded}
        />
      )}
    </div>
  );
}; 