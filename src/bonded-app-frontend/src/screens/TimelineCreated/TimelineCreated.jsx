import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { TimelineTileWrapper } from "../../components/TimelineTileWrapper";
import { AITimelineEntry } from "../../components/AITimelineEntry";
import { TopAppBar } from "../../components/TopAppBar";
import { Chat4 } from "../../icons/Chat4";
import { MenuFrame } from "../../components/MenuFrame/MenuFrame";
import { UploadModal } from "../../components/UploadModal";
import { ExportModal } from "../../components/ExportModal";
import { MediaScanner } from "../../components/MediaScanner";
import { autoAIScanner } from "../../utils/autoAIScanner";
import useBondedServices from "../../hooks/useBondedServices";
import "./style.css";

// LocalStorage keys for storing timeline data
const TIMELINE_DATA_KEY = 'bonded_timeline_data';
const TIMELINE_LAST_UPDATE_KEY = 'bonded_timeline_last_update';
const TIMESTAMP_CONTENT_KEY = 'bonded_timestamp_content';
const AI_TIMELINE_DATA_KEY = 'aiProcessedTimeline';

export const TimelineCreated = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isMediaScannerOpen, setIsMediaScannerOpen] = useState(false);
  const [animatedItems, setAnimatedItems] = useState([]);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importedMediaInfo, setImportedMediaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timelineRef = useRef(null);

  // Use Bonded services hook
  const {
    isInitialized,
    isLoading: servicesLoading,
    timeline: bondedTimeline,
    statistics,
    refreshTimeline,
    processEvidence,
    exportToPDF,
    isUploadDue,
    error: servicesError
  } = useBondedServices();

  // Initialize with empty timeline that will be populated dynamically
  const [timelineData, setTimelineData] = useState([]);
  const [aiTimelineData, setAiTimelineData] = useState([]);
  const [combinedTimelineData, setCombinedTimelineData] = useState([]);

  // Function to load AI timeline data from localStorage
  const loadAITimelineData = useCallback(() => {
    try {
      const savedAIData = localStorage.getItem(AI_TIMELINE_DATA_KEY);
      if (savedAIData) {
        const parsedAIData = JSON.parse(savedAIData);
        if (Array.isArray(parsedAIData)) {
          setAiTimelineData(parsedAIData);
          console.log(`Loaded ${parsedAIData.length} AI timeline entries`);
        }
      } else {
        setAiTimelineData([]);
      }
    } catch (error) {
      console.error('Error loading AI timeline data:', error);
      setAiTimelineData([]);
    }
  }, []);

  // Function to load timeline data from localStorage
  const loadTimelineData = useCallback(() => {
    setLoading(true);
    try {
      const savedData = localStorage.getItem(TIMELINE_DATA_KEY);
      if (savedData) {
        let parsedData;
        try {
          parsedData = JSON.parse(savedData);
        } catch (parseError) {
          console.error("Error parsing timeline data, resetting:", parseError);
          localStorage.removeItem(TIMELINE_DATA_KEY);
          setTimelineData([]);
          setLoading(false);
          return;
        }
        
        // Validate the data structure
        if (!Array.isArray(parsedData)) {
          console.error("Timeline data is not an array, resetting");
          localStorage.removeItem(TIMELINE_DATA_KEY);
          setTimelineData([]);
          setLoading(false);
          return;
        }
        
        // Filter out any entries with invalid data
        let validEntries = parsedData.filter(item => {
          if (!item || typeof item !== 'object') return false;
          if (!item.date || !item.id) return false;
          return true;
        });
        
        // Convert serialized icon back to JSX if needed
        const processedData = validEntries.map(item => {
          // Add default source and uploadStatus if not present for older items
          const newItem = {
            ...item,
            source: item.source || 'manual', // Default source
            uploadStatus: item.uploadStatus || 'completed', // Default status
          };
          if (item.hasMessageIcon) {
            return { ...newItem, icon: <Chat4 className="chat-icon-svg" /> };
          }
          return { ...newItem, icon: null };
        });
        
        // Ensure all entries have timestamps
        const dataWithTimestamps = processedData.map(item => {
          if (!item.timestamp) {
            // Generate a timestamp from the date if not available
            try {
              item.timestamp = new Date(item.date).getTime();
            } catch (e) {
              // Use current time as fallback if date parsing fails
              item.timestamp = Date.now();
            }
          }
          return item;
        });
        
        // Sort by timestamp, newest first
        const sortedData = dataWithTimestamps.sort((a, b) => {
          try {
            return b.timestamp - a.timestamp;
          } catch (e) {
            // Fallback sort by ID if timestamps are invalid
            return 0;
          }
        });
        
        setTimelineData(sortedData);
        console.log(`Loaded ${sortedData.length} timeline entries`);
      } else {
        // Initialize with empty timeline if no data exists
        setTimelineData([]);
        console.log('No timeline data found, initialized with empty array');
      }
    } catch (err) {
      console.error("Error loading timeline data:", err);
      setError("Failed to load timeline data. Please refresh the page.");
      setTimelineData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Combine timeline data and AI timeline data
  const combineTimelineData = useCallback(() => {
    const combined = [];
    
    // Add regular timeline entries
    timelineData.forEach(item => {
      combined.push({
        ...item,
        type: 'regular',
        sortTimestamp: item.timestamp || Date.now()
      });
    });
    
    // Add AI timeline entries
    aiTimelineData.forEach(item => {
      combined.push({
        ...item,
        type: 'ai_processed',
        sortTimestamp: new Date(item.createdAt).getTime()
      });
    });

    // Add Bonded services timeline entries
    bondedTimeline.forEach(item => {
      combined.push({
        ...item,
        type: 'bonded_evidence',
        sortTimestamp: item.timestamp || Date.now()
      });
    });
    
    // Sort by timestamp, newest first
    combined.sort((a, b) => b.sortTimestamp - a.sortTimestamp);
    
    setCombinedTimelineData(combined);
  }, [timelineData, aiTimelineData, bondedTimeline]);

  // Load timeline data on mount
  useEffect(() => {
    loadTimelineData();
    loadAITimelineData();
  }, [loadTimelineData, loadAITimelineData]);

  // Combine data when either timeline changes
  useEffect(() => {
    combineTimelineData();
  }, [combineTimelineData]);

  // Set up auto AI scanner observer
  useEffect(() => {
    const aiScannerObserver = (event, data) => {
      if (event === 'timelineUpdated') {
        // Reload AI timeline data when new entries are added
        loadAITimelineData();
      }
    };

    autoAIScanner.addObserver(aiScannerObserver);

    return () => {
      autoAIScanner.removeObserver(aiScannerObserver);
    };
  }, [loadAITimelineData]);

  // Save timeline data to localStorage whenever it changes
  useEffect(() => {
    if (timelineData.length > 0) {
      try {
        // Convert icon JSX to a serializable flag
        const serializableData = timelineData.map(item => ({
          ...item,
          // source and uploadStatus are already part of item, no need to redefine here unless transforming
          hasMessageIcon: item.icon !== null,
          icon: undefined // Remove non-serializable JSX element
        }));
        
        localStorage.setItem(TIMELINE_DATA_KEY, JSON.stringify(serializableData));
        localStorage.setItem(TIMELINE_LAST_UPDATE_KEY, new Date().toISOString());
      } catch (err) {
        console.error("Error saving timeline data:", err);
      }
    }
  }, [timelineData]);

  // Check if we're coming from MediaScanner or MediaImport with imported media
  useEffect(() => {
    if (location.state?.fromMediaScanner || location.state?.fromMediaImport) {
      const { mediaCount, dateRange } = location.state;
      setImportedMediaInfo({ mediaCount, dateRange });
      setShowImportSuccess(true);
      
      // Reload timeline data to reflect newly imported media
      loadTimelineData();
      
      // Scroll to top if we have new media
      if (timelineRef.current) {
        timelineRef.current.scrollTo(0, 0);
      }
      
      // Auto-hide success message after 5 seconds
      const timer = setTimeout(() => {
        setShowImportSuccess(false);
      }, 5000);
      
      // Clean up location state to prevent showing success on refresh
      window.history.replaceState({}, document.title);
      
      return () => clearTimeout(timer);
    }
  }, [location, loadTimelineData]);
  
  /**
   * Handle media files selected from the MediaScanner
   */
  const handleMediaSelected = (selectedFiles, groupedByDate) => {
    // Create appropriate timeline entries from the selected files
    const newTimelineEntries = [];
    
    // Process each date group
    Object.keys(groupedByDate).forEach(date => {
      const files = groupedByDate[date];
      
      // Check if we already have a timeline entry for this date
      const existingEntry = timelineData.find(item => {
        // Convert the date format from the file to match the timeline format
        const fileDate = formatDateForDisplay(new Date(date));
        return item.date === fileDate;
      });
      
      // Find a valid file for thumbnail
      const validFileForThumbnail = files.find(file => 
        file && file.file instanceof Blob && 
        (file.file.type.startsWith('image/') || file.file.type.startsWith('video/'))
      );
      
      let thumbnailUrl = null;
      if (validFileForThumbnail && validFileForThumbnail.file instanceof Blob) {
        try {
          thumbnailUrl = URL.createObjectURL(validFileForThumbnail.file);
        } catch (err) {
          console.warn("Error creating thumbnail URL:", err);
        }
      }
      
      if (existingEntry) {
        // Update existing entry with new files
        existingEntry.photos = (existingEntry.photos || 0) + files.length;
        existingEntry.source = existingEntry.source || 'device media'; // Preserve existing or set
        existingEntry.uploadStatus = 'completed'; // Assume completion for now
        
        // Update image if it doesn't exist and we have a valid new one
        if (!existingEntry.image && thumbnailUrl) {
          existingEntry.image = thumbnailUrl;
        }
        
        // Also update the content for this date
        updateContentForDate(formatDateForDisplay(new Date(date)), files);
      } else if (files.length > 0) {
        // Create new timeline entry
        const newEntry = {
          id: Date.now() + Math.random(), // Ensure unique ID
          date: formatDateForDisplay(new Date(date)),
          photos: files.length,
          messages: 0,
          location: getLocationFromFiles(files) || "Imported Media",
          icon: null,
          image: thumbnailUrl, // Use validated thumbnail URL
          timestamp: new Date(date).getTime(),
          source: 'device media', // Set source for new media
          uploadStatus: 'completed', // Assume completion for now
        };
        
        newTimelineEntries.push(newEntry);
        
        // Also create content for this date
        updateContentForDate(formatDateForDisplay(new Date(date)), files);
      }
    });

    // Add new entries to timeline data and sort by date (newest first)
    setTimelineData(prevData => {
      const updatedExistingData = [...prevData]; // This already includes updated existing entries
      const combinedData = [...updatedExistingData, ...newTimelineEntries];
      return combinedData.sort((a, b) => {
        // Convert date strings to timestamps if they're not already
        const timestampA = a.timestamp || new Date(a.date).getTime();
        const timestampB = b.timestamp || new Date(b.date).getTime();
        return timestampB - timestampA;
      });
    });

    // Show success message
    const totalFiles = selectedFiles.length;
    setImportedMediaInfo({
      mediaCount: totalFiles,
      dateRange: formatDateRangeForDisplay(groupedByDate)
    });
    setShowImportSuccess(true);
    
    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      setShowImportSuccess(false);
    }, 5000);

    // Close the MediaScanner modal
    setIsMediaScannerOpen(false);
  };

  /**
   * Update content for a specific date
   */
  const updateContentForDate = (date, files) => {
    try {
      // Get existing content
      const allContent = JSON.parse(localStorage.getItem(TIMESTAMP_CONTENT_KEY) || '{}');
      
      // Get content for this date
      const dateContent = allContent[date] || [];
      
      // Add new files as content items
      const newContentItems = files.map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: getFileType(file.file.type),
        name: file.name,
        source: "Device Media",
        location: file.metadata?.resolvedLocation?.city || "Imported",
        date: date,
        imageUrl: URL.createObjectURL(file.file),
        timestamp: file.timestamp,
        size: file.size,
        path: file.path
      }));
      
      // Update content for this date
      allContent[date] = [...dateContent, ...newContentItems];
      
      // Save back to localStorage
      localStorage.setItem(TIMESTAMP_CONTENT_KEY, JSON.stringify(allContent));
    } catch (err) {
      console.error("Error updating content for date:", err);
    }
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
   * Format a date for display in the timeline
   */
  const formatDateForDisplay = (date) => {
    try {
      // Make sure we have a valid date object
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.warn("Invalid date passed to formatDateForDisplay:", date);
        // Use current date as fallback
        date = new Date();
      }
      
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return date.toLocaleDateString('en-GB', options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  /**
   * Determine evidence category based on content
   * Immigration authorities need clear categorization of evidence
   */
  const determineEvidenceCategory = (item) => {
    // Basic logic - could be expanded based on actual content
    if (item.messages > 0 && item.photos > 0) {
      return "relationship"; // Communication + photos = relationship evidence
    } else if (item.location?.toLowerCase().includes("bank") || 
              item.location?.toLowerCase().includes("financial")) {
      return "financial"; // Financial evidence
    } else if (item.messages > 10) {
      return "relationship"; // Lots of messages = relationship communication
    }
    return "relationship"; // Default category
  };

  /**
   * Determine evidence type based on content
   */
  const determineEvidenceType = (item) => {
    if (item.photos > 0 && item.messages === 0) {
      return "photos";
    } else if (item.messages > 0 && item.photos === 0) {
      return "messages";
    } else if (item.photos > 0 && item.messages > 0) {
      return "media"; // Mixed content
    }
    return "media"; // Default
  };

  /**
   * Format date range for display in success message
   */
  const formatDateRangeForDisplay = (groupedByDate) => {
    const dates = Object.keys(groupedByDate);
    if (dates.length === 0) return "";
    if (dates.length === 1) return formatDateForDisplay(new Date(dates[0]));
    
    // Sort dates chronologically
    dates.sort((a, b) => new Date(a) - new Date(b));
    
    const firstDate = formatDateForDisplay(new Date(dates[0]));
    const lastDate = formatDateForDisplay(new Date(dates[dates.length - 1]));
    
    return `${firstDate} to ${lastDate}`;
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
          const region = metadata.resolvedLocation.region;
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
      console.error("Error extracting location from files:", error);
      return "Imported Media";
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleUploadClick = () => {
    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handleExportClick = () => {
    setIsExportModalOpen(true);
  };

  const handleCloseExportModal = () => {
    setIsExportModalOpen(false);
  };
  
  const handleTimelineTileClick = (date) => {
    navigate(`/timestamp-folder/${encodeURIComponent(date)}`);
  };
  
  const handleScanMediaClick = () => {
    setIsMediaScannerOpen(true);
  };

  const handleCloseMediaScanner = () => {
    setIsMediaScannerOpen(false);
  };

  // Handle manual evidence processing
  const handleProcessEvidenceClick = async () => {
    try {
      const result = await processEvidence();
      
      if (result.success) {
        setShowImportSuccess(true);
        setImportedMediaInfo({
          count: (result.evidence.photo ? 1 : 0) + result.evidence.messages.length,
          type: result.evidence.photo ? 'photo and messages' : 'messages'
        });
        
        // Hide success message after 3 seconds
        setTimeout(() => setShowImportSuccess(false), 3000);
      } else {
        setError(`Evidence processing failed: ${result.errors.join(', ')}`);
      }
    } catch (err) {
      setError(`Failed to process evidence: ${err.message}`);
    }
  };

  // Handle timeline refresh
  const handleRefreshTimeline = async () => {
    try {
      await refreshTimeline(true);
    } catch (err) {
      setError(`Failed to refresh timeline: ${err.message}`);
    }
  };

  // Handle scroll animations
  useEffect(() => {
    if (!combinedTimelineData.length) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setAnimatedItems(prev => [...prev, entry.target.dataset.id]);
          }
        });
      },
      { threshold: 0.3 }
    );

    const elements = document.querySelectorAll('.timeline-item');
    elements.forEach(element => observer.observe(element));

    return () => elements.forEach(element => observer.unobserve(element));
  }, [combinedTimelineData]);

  // Handle initial animation on mount
  useEffect(() => {
    if (!combinedTimelineData.length) return;
    
    const timer = setTimeout(() => {
      // Animate first 3 items or all items if less than 3
      const itemsToAnimate = Math.min(combinedTimelineData.length, 3);
      const itemIds = combinedTimelineData.slice(0, itemsToAnimate).map(item => item.id);
      setAnimatedItems(itemIds);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [combinedTimelineData]);

  const renderTimelineContent = () => {
    if (loading) {
      return (
        <div className="timeline-loading">
          <p>Loading your timeline...</p>
          <div className="timeline-loading-spinner"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="timeline-error">
          <p>{error}</p>
          <button className="retry-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      );
    }
    
    if (combinedTimelineData.length === 0) {
      return (
        <div className="empty-timeline">
          <p>Your timeline is empty</p>
          <p className="empty-timeline-hint">Scan your device to import media into your timeline or enable AI auto-scanning</p>
          <div className="empty-timeline-actions">
          <button className="scan-media-button" onClick={handleScanMediaClick}>
            Scan Device Media
          </button>
            <button className="ai-settings-button" onClick={() => navigate('/ai-settings')}>
              AI Settings
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <>
        <div className="timeline-line">
          <div className="timeline-vertical-line">
            {combinedTimelineData.map((item, index) => (
              <div 
                key={`dot-${item.id}`} 
                className={`timeline-dot ${animatedItems.includes(item.id) ? 'timeline-dot-animated' : ''} ${item.type === 'ai_processed' ? 'ai-dot' : ''}`}
                style={{ top: `${index * 200 + 100}px` }}
              />
            ))}
          </div>
        </div>

        {combinedTimelineData.map((item, index) => {
          if (item.type === 'ai_processed') {
            return (
              <AITimelineEntry
                key={item.id}
                entry={item}
                onClick={handleTimelineTileClick}
                className={`timeline-item ${animatedItems.includes(item.id) ? 'timeline-item-animated' : ''}`}
                isAnimated={animatedItems.includes(item.id)}
              />
            );
          } else {
            return (
          <div 
            className={`timeline-item ${animatedItems.includes(item.id) ? 'timeline-item-animated' : ''}`}
            key={item.id}
            data-id={item.id}
          >
            <div className={`date-badge date-badge-${Math.min(index + 1, 3)}`}>
              <div className="date-text">{item.date}</div>
            </div>
            
            <TimelineTileWrapper 
              className={`timeline-tile-${Math.min(index + 1, 3)}`}
              timelineTileText={`${item.messages} Messages`}
              timelineTileText1={`${item.photos} Photos`}
              timelineTileText2={item.location}
              timelineTileIcon={item.icon}
              timelineTileMaskGroup={item.image}
              timelineTileMaskGroupClassName="timeline-brand-image"
              onClick={handleTimelineTileClick}
              date={item.date}
              source={item.source}
              uploadStatus={item.uploadStatus}
              evidenceCategory={determineEvidenceCategory(item)}
              evidenceType={determineEvidenceType(item)}
              aiVerified={true} // Assuming all content is AI-verified for immigration
              processTimestamp={`Processed: ${new Date(item.timestamp).toLocaleString()}`}
              blockchainTimestamp={item.blockchainTimestamp}
            />
          </div>
            );
          }
        })}
        
        <div className="timeline-end">
          <div className="timeline-end-dot" />
          <p className="timeline-end-text">Keep adding to your timeline</p>
          <button className="scan-media-button" onClick={handleScanMediaClick}>
            Scan Device Media
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="timeline-created">
      {isMenuOpen && <MenuFrame onClose={toggleMenu} />}
      {isUploadModalOpen && <UploadModal onClose={handleCloseUploadModal} />}
      {isExportModalOpen && <ExportModal onClose={handleCloseExportModal} />}
      {isMediaScannerOpen && (
        <div className="media-scanner-modal">
          <div className="media-scanner-container">
            <div className="media-scanner-header">
              <h2>Scan Device Media</h2>
              <button className="close-button" onClick={handleCloseMediaScanner}>×</button>
            </div>
            <MediaScanner onMediaSelected={handleMediaSelected} />
          </div>
        </div>
      )}
      
      <div className="timeline-container">
        <TopAppBar
          onMenuToggle={toggleMenu}
          headline="Your timeline"
          onScanMediaClick={handleScanMediaClick}
          onExportClick={handleExportClick}
        />
        
        {showImportSuccess && importedMediaInfo && (
          <div className="import-success-banner">
            <p>
              <strong>Success!</strong> {importedMediaInfo.mediaCount} media files imported from {importedMediaInfo.dateRange}
            </p>
            <button className="scan-more-button" onClick={handleScanMediaClick}>
              Scan More
            </button>
          </div>
        )}
        
        <div className="timeline-content-container">
          <div className="timeline-header">
            <div className="frame-header">
              <p className="capture-title">Immigration Timeline Evidence</p>
            </div>
          </div>
          
          <div className="timeline-content" ref={timelineRef}>
            {renderTimelineContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
