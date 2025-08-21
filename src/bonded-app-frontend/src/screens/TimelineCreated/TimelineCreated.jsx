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
import { useBondedServices } from "../../hooks/useBondedServices";
import { localVault } from "../../services/localVault.js";
import "./style.css";

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
  const [processingEvidence, setProcessingEvidence] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const timelineRef = useRef(null);
  // Use Bonded services hook
  const {
    isInitialized,
    isLoading: servicesLoading,
    processEvidence,
    exportToPDF,
    isUploadDue,
    error: servicesError,
    canisterIntegration,
    encryptionService
  } = useBondedServices();
  // Local Vault state (primary data source)
  const [timelineData, setTimelineData] = useState([]);
  const [evidenceStats, setEvidenceStats] = useState({
    totalEntries: 0,
    photoEntries: 0,
    messageEntries: 0,
    documentEntries: 0,
    lastUpdate: null
  });
  // Timeline filters and pagination
  const [filters, setFilters] = useState({
    contentType: 'all',
    uploadStatus: 'all',
    dateRange: null
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(false);
  /**
   * Load timeline data from Local Vault (offline-first)
   */
  const loadTimelineFromVault = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      const {
        page = 1,
        append = false,
        filters: filterOverrides = null
      } = options;
      // Use Local Vault as primary data source
      const result = await localVault.getTimelineData({
        page,
        limit: 20,
        ...filters,
        ...filterOverrides
      });
      if (append) {
        setTimelineData(prev => [...prev, ...result.entries]);
      } else {
        setTimelineData(result.entries);
      }
      setHasMoreData(result.hasMore);
      setCurrentPage(page);
      // Update statistics from Local Vault
      const stats = await localVault.getStatistics();
      setEvidenceStats(stats);
      console.log(`📄 Loaded ${result.entries.length} timeline entries from Local Vault (page ${page})`);
    } catch (error) {
      console.error('❌ Failed to load timeline from Local Vault:', error);
      setError(`Failed to load timeline: ${error.message}`);
      // Fallback to empty state instead of multiple sources
      setTimelineData([]);
      setEvidenceStats({
        totalEntries: 0,
        photoEntries: 0,
        messageEntries: 0,
        documentEntries: 0,
        lastUpdate: null
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);
  /**
   * Handle evidence processing and add to Local Vault
   */
  const processEvidenceWithVault = useCallback(async (evidenceData) => {
    try {
      setProcessingEvidence(true);
      setUploadProgress({ stage: 'processing', progress: 25 });
      // Add evidence to Local Vault with T7.01 metadata
      const evidenceEntry = await localVault.addEvidence(evidenceData, {
        collectionMethod: 'manual_upload',
        initiatorDevice: true,
        location: evidenceData.location || null,
        category: evidenceData.category || 'relationship'
      });
      setUploadProgress({ stage: 'vault_stored', progress: 50 });
      // Queue for ICP upload (handled by Local Vault)
      setUploadProgress({ stage: 'queued_upload', progress: 75 });
      // Refresh timeline to show new evidence
      await loadTimelineFromVault();
      setUploadProgress({ stage: 'completed', progress: 100 });
      console.log(`✅ Evidence processed and added to Local Vault: ${evidenceEntry.id}`);
      return { success: true, evidenceId: evidenceEntry.id };
    } catch (error) {
      console.error('❌ Failed to process evidence:', error);
      setError(`Failed to process evidence: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      setProcessingEvidence(false);
      setTimeout(() => setUploadProgress(null), 2000);
    }
  }, [loadTimelineFromVault]);
  /**
   * Handle media selection from scanner
   */
  const handleMediaSelected = async (selectedFiles, groupedByDate) => {
    try {
      setProcessingEvidence(true);
      setIsMediaScannerOpen(false);
      let processedCount = 0;
      let approvedCount = 0;
      for (const fileData of selectedFiles) {
        try {
          processedCount++;
          // Process each file through Local Vault
          const evidenceData = {
            photo: fileData.file,
            metadata: fileData.metadata,
            location: fileData.metadata?.resolvedLocation || null,
            category: 'photo'
          };
          await localVault.addEvidence(evidenceData, {
            collectionMethod: 'media_scan',
            targetDate: new Date(fileData.timestamp || fileData.file.lastModified),
            photoDimensions: fileData.metadata?.dimensions,
            source: 'device_gallery'
          });
            approvedCount++;
        } catch (error) {
          console.error(`Error processing file ${fileData.file.name}:`, error);
        }
      }
      // Show results
      setImportedMediaInfo({
        mediaCount: approvedCount,
        processedCount,
        dateRange: formatDateRangeForDisplay(groupedByDate)
      });
      setShowImportSuccess(true);
      // Refresh timeline
      await loadTimelineFromVault();
      // Auto-hide success message
      setTimeout(() => setShowImportSuccess(false), 5000);
    } catch (error) {
      console.error('Error handling media selection:', error);
      setError(`Failed to process media: ${error.message}`);
    } finally {
      setProcessingEvidence(false);
    }
  };
  const handleProcessEvidenceClick = async () => {
    if (processEvidence) {
    try {
      setProcessingEvidence(true);
      const result = await processEvidence();
      if (result.success) {
          // Add result to Local Vault
          await processEvidenceWithVault(result.evidence);
        }
      } catch (error) {
        console.error('Evidence processing failed:', error);
        setError(`Evidence processing failed: ${error.message}`);
    } finally {
      setProcessingEvidence(false);
      }
    }
  };
  const handleRefreshTimeline = async () => {
    await loadTimelineFromVault({ page: 1 });
  };
  const handleLoadMore = () => {
    if (hasMoreData && !loading) {
      loadTimelineFromVault({ page: currentPage + 1, append: true });
    }
  };
  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
    loadTimelineFromVault({ page: 1, filters: newFilters });
  };
  // Initialize Local Vault and load timeline
  useEffect(() => {
    const initializeTimeline = async () => {
      try {
        await localVault.initialize();
        await loadTimelineFromVault();
      } catch (error) {
        console.error('Failed to initialize timeline:', error);
        setError('Failed to initialize timeline');
      }
    };
    initializeTimeline();
  }, [loadTimelineFromVault]);
  // Set up Local Vault observer for real-time updates
  useEffect(() => {
    const vaultObserver = (event, data) => {
      console.log(`🔄 Local Vault event: ${event}`, data);
      if (event === 'evidenceAdded' || event === 'evidenceUpdated') {
        // Refresh timeline when evidence is added/updated
        loadTimelineFromVault();
      }
    };
    localVault.addObserver(vaultObserver);
    return () => {
      localVault.removeObserver(vaultObserver);
    };
  }, [loadTimelineFromVault]);
  // Handle services errors
  useEffect(() => {
    if (servicesError) {
      setError(`Service error: ${servicesError}`);
    }
  }, [servicesError]);
  // Check if we're coming from MediaScanner or MediaImport with imported media
  useEffect(() => {
    if (location.state?.fromMediaScanner || location.state?.fromMediaImport) {
      const { mediaCount, dateRange } = location.state;
      setImportedMediaInfo({ mediaCount, dateRange });
      setShowImportSuccess(true);
      // Reload timeline data to reflect newly imported media
      loadTimelineFromVault();
      // Auto-hide success message after 5 seconds
      const timer = setTimeout(() => {
        setShowImportSuccess(false);
      }, 5000);
      // Clean up location state to prevent showing success on refresh
      window.history.replaceState({}, document.title);
      return () => clearTimeout(timer);
    }
  }, [location, loadTimelineFromVault]);
  // Enhanced scroll animations
  useEffect(() => {
    if (!timelineData.length) return;
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
  }, [timelineData]);
  // Handle initial animation on mount
  useEffect(() => {
    if (!timelineData.length) return;
    const timer = setTimeout(() => {
      // Animate first 3 items or all items if less than 3
      const itemsToAnimate = Math.min(timelineData.length, 3);
      const itemIds = timelineData.slice(0, itemsToAnimate).map(item => item.id);
      setAnimatedItems(itemIds);
    }, 500);
    return () => clearTimeout(timer);
  }, [timelineData]);
  // Utility functions
  const updateContentForDate = (date, files) => {
    try {
      const allContent = JSON.parse(localStorage.getItem(TIMESTAMP_CONTENT_KEY) || '{}');
      const dateContent = allContent[date] || [];
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
      allContent[date] = [...dateContent, ...newContentItems];
      localStorage.setItem(TIMESTAMP_CONTENT_KEY, JSON.stringify(allContent));
    } catch (err) {
    }
  };
  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'photo';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('application/pdf')) return 'document';
    return 'file';
  };
  const formatDateForDisplay = (date) => {
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };
  const determineEvidenceCategory = (item) => {
    if (item.messages > 0 && item.photos > 0) return "relationship";
    if (item.location?.toLowerCase().includes("bank") || 
        item.location?.toLowerCase().includes("financial")) return "financial";
    if (item.location?.toLowerCase().includes("travel") || 
        item.location?.toLowerCase().includes("airport")) return "travel";
    if (item.photos > 0) return "photo";
    if (item.messages > 0) return "communication";
    return "general";
  };
  const determineEvidenceType = (item) => {
    if (item.type === 'ai_processed') return "AI Processed";
    if (item.type === 'encrypted_evidence') return "Encrypted Vault";
    if (item.type === 'bonded_evidence') return "Bonded Evidence";
    if (item.source === 'device media') return "Device Import";
    if (item.source === 'telegram') return "Telegram";
    return "Manual Upload";
  };
  const formatDateRangeForDisplay = (groupedByDate) => {
    const dates = Object.keys(groupedByDate).sort();
    if (dates.length === 1) {
      return formatDateForDisplay(new Date(dates[0]));
    } else if (dates.length === 2) {
      return `${formatDateForDisplay(new Date(dates[0]))} and ${formatDateForDisplay(new Date(dates[1]))}`;
    } else {
      return `${formatDateForDisplay(new Date(dates[0]))} to ${formatDateForDisplay(new Date(dates[dates.length - 1]))}`;
    }
  };
  const getLocationFromFiles = (files) => {
    for (const file of files) {
      if (file.metadata?.resolvedLocation?.city) {
        return file.metadata.resolvedLocation.city;
      }
    }
    return "Location Unknown";
  };
  // Event handlers
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const handleUploadClick = () => setIsUploadModalOpen(true);
  const handleCloseUploadModal = () => setIsUploadModalOpen(false);
  const handleExportClick = () => setIsExportModalOpen(true);
  const handleCloseExportModal = () => setIsExportModalOpen(false);
  const handleTimelineTileClick = (date) => navigate(`/timestamp-folder?date=${encodeURIComponent(date)}`);
  const handleScanMediaClick = () => setIsMediaScannerOpen(true);
  const handleCloseMediaScanner = () => setIsMediaScannerOpen(false);
  // Enhanced timeline content rendering with T7.01 metadata
  const renderTimelineContent = () => {
    if (loading || servicesLoading) {
      return (
        <div className="timeline-loading">
          <div className="timeline-loading-content">
          <div className="timeline-loading-spinner"></div>
            <p>Loading your encrypted timeline...</p>
            <div className="timeline-loading-progress">
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
              <span className="progress-text">
                {!isInitialized ? 'Initializing services...' : 'Decrypting evidence...'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="timeline-error">
          <div className="error-icon">⚠️</div>
          <h3>Timeline Error</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button className="retry-button" onClick={handleRefreshTimeline}>
              Retry Loading
            </button>
            <button className="fallback-button" onClick={() => setError(null)}>
              Continue Offline
          </button>
          </div>
        </div>
      );
    }
    if (processingEvidence) {
      return (
        <div className="timeline-processing">
          <div className="processing-content">
            <div className="processing-spinner"></div>
            <h3>Processing Evidence</h3>
            {uploadProgress && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${uploadProgress.progress}%` }}
                  ></div>
                </div>
                <span className="progress-text">
                  {uploadProgress.stage === 'encrypting' && 'Encrypting evidence...'}
                  {uploadProgress.stage === 'hashing' && 'Computing integrity hash...'}
                  {uploadProgress.stage === 'uploading' && 'Uploading to vault...'}
                  {uploadProgress.stage === 'completed' && 'Evidence processed successfully!'}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    if (timelineData.length === 0) {
      return (
        <div className="empty-timeline">
          <div className="empty-timeline-icon">📅</div>
          <h3>Your timeline is empty</h3>
          <p className="empty-timeline-hint">
            Start building your relationship evidence by scanning device media or enabling automatic AI processing
          </p>
          <div className="empty-timeline-actions">
            <button className="scan-media-button primary" onClick={handleScanMediaClick}>
            Scan Device Media
          </button>
            <button className="process-evidence-button secondary" onClick={handleProcessEvidenceClick}>
              Process Today's Evidence
            </button>
            <button className="ai-settings-button tertiary" onClick={() => navigate('/ai-settings')}>
              Configure AI Settings
            </button>
          </div>
          {evidenceStats.totalEntries === 0 && (
            <div className="getting-started-tip">
              <strong>💡 Getting Started:</strong> Bonded automatically collects and encrypts relationship evidence. 
              Start by importing your photos or enabling AI-powered evidence collection.
            </div>
          )}
        </div>
      );
    }
    return (
      <>
        {/* Evidence Statistics Bar */}
        <div className="evidence-stats-bar">
          <div className="evidence-stats">
            <div className="stat-item">
              <span className="stat-number">{evidenceStats.totalEntries}</span>
              <span className="stat-label">Total Entries</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{evidenceStats.photoEntries}</span>
              <span className="stat-label">Photos</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{evidenceStats.messageEntries}</span>
              <span className="stat-label">Messages</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{evidenceStats.documentEntries}</span>
              <span className="stat-label">Documents</span>
            </div>
          </div>
          <div className="evidence-actions">
            <button className="refresh-button" onClick={handleRefreshTimeline} title="Refresh Timeline">
              🔄
            </button>
            <button className="process-button" onClick={handleProcessEvidenceClick} title="Process Evidence">
              ⚙️
            </button>
          </div>
        </div>
        {/* Timeline Visualization */}
        <div className="timeline-line">
          <div className="timeline-vertical-line">
            {timelineData.map((item, index) => (
              <div 
                key={`dot-${item.id}`} 
                className={`timeline-dot ${animatedItems.includes(item.id) ? 'timeline-dot-animated' : ''} ${item.type === 'ai_processed' ? 'ai-dot' : ''} ${item.type === 'encrypted_evidence' ? 'encrypted-dot' : ''}`}
                style={{ top: `${index * 200 + 100}px` }}
              />
            ))}
          </div>
        </div>
        {/* Timeline Entries with T7.01 Metadata */}
        {timelineData.map((item, index) => {
          // Handle both new Local Vault entries and legacy AI entries
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
            // Local Vault entries with T7.01 metadata structure
            const locationDisplay = item.location ? 
              `${item.location.city}, ${item.location.country}` : 
              'Location not available';
            
            const statusIcon = item.uploadStatus === 'completed' ? '✅' : 
                             item.uploadStatus === 'pending' ? '⏳' : 
                             item.uploadStatus === 'failed' ? '❌' : '📄';
            
            return (
          <div 
            className={`timeline-item ${animatedItems.includes(item.id) ? 'timeline-item-animated' : ''}`}
            key={item.id}
            data-id={item.id}
          >
            <div className={`date-badge date-badge-${Math.min(index + 1, 3)}`}>
                  <div className="date-text">{item.date}</div>
                  <div className="vault-badge" title="Stored in Local Vault with T7.01 metadata">
                    🔐 {statusIcon}
                  </div>
            </div>
                
            <TimelineTileWrapper 
              className={`timeline-tile-${Math.min(index + 1, 3)}`}
                  // Display T7.01 metadata
                  timelineTileText={`${item.messageCount} Messages`}
                  timelineTileText1={item.hasPhoto ? "1 Photo" : "No Photos"}
                  timelineTileText2={locationDisplay}
                  timelineTileIcon={
                    item.hasPhoto ? (
                      <div className="photo-icon">📸</div>
                    ) : item.messageCount > 0 ? (
                      <Chat4 className="chat-icon-svg" />
                    ) : (
                      <div className="document-icon">📄</div>
                    )
                  }
                  timelineTileMaskGroup={item.thumbnail}
              timelineTileMaskGroupClassName="timeline-brand-image"
                  onClick={() => handleTimelineTileClick(item.date)}
                  date={item.date}
                  source="local_vault"
                  uploadStatus={item.uploadStatus}
                  evidenceCategory={item.category}
                  evidenceType={item.contentType}
                  aiVerified={true}
                  processTimestamp={`Added: ${new Date(item.timestamp).toLocaleString()}`}
                  blockchainTimestamp={item.uploadTime ? `Uploaded: ${new Date(item.uploadTime).toLocaleString()}` : 'Not uploaded yet'}
                  encryptionHash={item.packageId}
                  // Additional T7.01 metadata display
                  bondedMetadata={{
                    title: item.title,
                    subtitle: item.subtitle,
                    tags: item.tags,
                    priority: item.priority,
                    verified: item.verified,
                    syncStatus: item.syncStatus
                  }}
            />
          </div>
            );
          }
        })}
        {/* Load More / Timeline End */}
        {hasMoreData ? (
          <div className="load-more-section">
            <button 
              className="load-more-button" 
              onClick={handleLoadMore}
              disabled={loading}
            >
              {loading ? '⏳ Loading...' : '📄 Load More Evidence'}
            </button>
            <p className="load-more-hint">
              Showing {timelineData.length} of {evidenceStats.totalEntries} entries
            </p>
          </div>
        ) : (
        <div className="timeline-end">
          <div className="timeline-end-dot" />
            <p className="timeline-end-text">
              {timelineData.length > 0 ? 
                "You've reached the beginning of your timeline" : 
                "Keep building your evidence timeline"
              }
            </p>
          <div className="timeline-end-actions">
          <button className="scan-media-button" onClick={handleScanMediaClick}>
            Scan Device Media
          </button>
            <button className="process-evidence-button" onClick={handleProcessEvidenceClick}>
              Process Evidence
            </button>
          </div>
        </div>
        )}
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
          headline="Your Immigration Timeline"
          onScanMediaClick={handleScanMediaClick}
          onExportClick={handleExportClick}
        />
        {showImportSuccess && importedMediaInfo && (
          <div className="import-success-banner">
            <div className="success-icon">✅</div>
            <div className="success-content">
            <p>
                <strong>Success!</strong> {importedMediaInfo.mediaCount} media files processed and encrypted
                {importedMediaInfo.dateRange && ` from ${importedMediaInfo.dateRange}`}
            </p>
            <button className="scan-more-button" onClick={handleScanMediaClick}>
                Process More Evidence
              </button>
            </div>
          </div>
        )}
        {/* Upload Progress Banner */}
        {isUploadDue && (
          <div className="upload-due-banner">
            <div className="upload-due-icon">⏰</div>
            <div className="upload-due-content">
              <p><strong>Daily upload due</strong> - Ready to process today's evidence?</p>
              <button className="process-now-button" onClick={handleProcessEvidenceClick}>
                Process Now
            </button>
            </div>
          </div>
        )}
        <div className="timeline-content-container">
          <div className="timeline-header">
            <div className="frame-header">
              <h1 className="capture-title">Immigration Evidence Vault</h1>
              <p className="capture-subtitle">
                Secure, encrypted timeline of your relationship evidence
              </p>
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

export default TimelineCreated;
