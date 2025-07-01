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
  const [processingEvidence, setProcessingEvidence] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
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
    error: servicesError,
    canisterIntegration,
    encryptionService
  } = useBondedServices();
  // Timeline state management
  const [timelineData, setTimelineData] = useState([]);
  const [aiTimelineData, setAiTimelineData] = useState([]);
  const [combinedTimelineData, setCombinedTimelineData] = useState([]);
  const [evidenceStats, setEvidenceStats] = useState({
    totalEntries: 0,
    photoEntries: 0,
    messageEntries: 0,
    documentEntries: 0,
    lastUpdate: null
  });
  // Enhanced evidence processing with encryption
  const processEvidenceWithEncryption = useCallback(async (evidence) => {
    if (!encryptionService || !canisterIntegration) {
      return { success: false, reason: 'Services not initialized' };
    }
    try {
      setProcessingEvidence(true);
      setUploadProgress({ stage: 'encrypting', progress: 25 });
      // Encrypt evidence data using AES-256-GCM
      const encryptedData = await encryptionService.encryptEvidence(evidence);
      setUploadProgress({ stage: 'hashing', progress: 50 });
      // Compute SHA-256 hash for integrity
      const evidenceHash = await encryptionService.computeHash(evidence);
      setUploadProgress({ stage: 'uploading', progress: 75 });
      // Upload to Evidence Canister
      // Get relationship ID from user profile
      let relationshipId = 'mock-relationship-id'; // fallback
      try {
        const { api } = await import('../../services/api.js');
        if (api.isAuthenticated) {
          const userProfile = await api.getUserProfile();
          if (userProfile.relationships && userProfile.relationships.length > 0) {
            relationshipId = userProfile.relationships[0]; // Use first relationship
          }
        }
      } catch (error) {
// Console statement removed for production
      }
      
      const uploadResult = await canisterIntegration.uploadEvidence(
        relationshipId,
        encryptedData,
        {
          timestamp: Date.now(),
          contentType: evidence.type,
          hash: evidenceHash,
          category: evidence.category || 'relationship'
        }
      );
      setUploadProgress({ stage: 'completed', progress: 100 });
      return uploadResult;
    } catch (error) {
      throw error;
    } finally {
      setProcessingEvidence(false);
      setTimeout(() => setUploadProgress(null), 2000);
    }
  }, [encryptionService, canisterIntegration]);
  // Load encrypted timeline data from ICP canister
  const loadEncryptedTimeline = useCallback(async () => {
    if (!canisterIntegration || !encryptionService) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      // Fetch encrypted timeline from Evidence Canister
      const encryptedTimeline = await canisterIntegration.fetchTimeline({
        page: 0,
        limit: 50 // Load first 50 entries
      });
      if (!encryptedTimeline || !encryptedTimeline.entries) {
        setTimelineData([]);
        return;
      }
      // Decrypt each timeline entry
      const decryptedEntries = [];
      for (const entry of encryptedTimeline.entries) {
        try {
          const decryptedData = await encryptionService.decryptEvidence(entry.encryptedData);
          decryptedEntries.push({
            id: entry.id,
            ...decryptedData,
            timestamp: entry.metadata?.timestamp || Date.now(),
            uploadStatus: 'completed',
            source: 'encrypted_vault',
            blockchainTimestamp: entry.created_at,
            hash: entry.metadata?.hash,
            category: entry.metadata?.category || 'relationship'
          });
        } catch (decryptError) {
          // Add placeholder for failed decryption
          decryptedEntries.push({
            id: entry.id,
            date: new Date(entry.created_at).toLocaleDateString('en-GB', { 
              day: 'numeric', month: 'short', year: 'numeric' 
            }),
            photos: 0,
            messages: 0,
            location: 'Encrypted Entry',
            uploadStatus: 'decryption_failed',
            source: 'encrypted_vault',
            error: 'Failed to decrypt'
          });
        }
      }
      // Sort by timestamp (newest first)
      decryptedEntries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setTimelineData(decryptedEntries);
      // Update evidence statistics
      setEvidenceStats({
        totalEntries: decryptedEntries.length,
        photoEntries: decryptedEntries.filter(e => e.photos > 0).length,
        messageEntries: decryptedEntries.filter(e => e.messages > 0).length,
        documentEntries: decryptedEntries.filter(e => e.category === 'document').length,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      setError(`Failed to load timeline: ${error.message}`);
              // Fallback to local data if available
        try {
          // Replace localStorage with canister storage
          const canisterLocalStorage = (await import('../../services/canisterStorage.js')).default;
          const localData = await canisterLocalStorage.getItem(TIMELINE_DATA_KEY);
        if (localData) {
          const parsedData = JSON.parse(localData);
          if (Array.isArray(parsedData)) {
            setTimelineData(parsedData);
          }
        }
      } catch (fallbackError) {
      }
    } finally {
      setLoading(false);
    }
  }, [canisterIntegration, encryptionService]);
  // Function to load AI timeline data from timeline service and storage
    const loadAITimelineData = useCallback(async () => {
    try {
      let allAIData = [];
      
      // 1. Load from timeline service (where AI scanner stores data)
      try {
        const { timelineService } = await import('../../services/timelineService.js');
        const clusteredTimeline = await timelineService.getClusteredTimeline();
        
        // Extract all entries from clustered timeline
        if (clusteredTimeline && typeof clusteredTimeline === 'object') {
          Object.values(clusteredTimeline).forEach(cluster => {
            if (cluster && cluster.entries && Array.isArray(cluster.entries)) {
              allAIData.push(...cluster.entries);
            }
          });
        }
      } catch (timelineError) {
      }
      
      // 2. Also load from canister storage as fallback
      try {
        const canisterLocalStorage = (await import('../../services/canisterStorage.js')).default;
        const savedAIData = await canisterLocalStorage.getItem(AI_TIMELINE_DATA_KEY);
        if (savedAIData) {
          const parsedAIData = JSON.parse(savedAIData);
          if (Array.isArray(parsedAIData)) {
            // Merge with timeline service data, avoiding duplicates
            parsedAIData.forEach(item => {
              if (!allAIData.find(existing => existing.id === item.id)) {
                allAIData.push(item);
              }
            });
          }
        }
      } catch (storageError) {
      }
      
      // Sort by timestamp, newest first
      allAIData.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      
      setAiTimelineData(allAIData);
    } catch (error) {
      console.error('Failed to load AI timeline data:', error);
      setAiTimelineData([]);
    }
  }, []);
  // Combine timeline data from multiple sources
  const combineTimelineData = useCallback(() => {
    const combined = [];
    // Add regular timeline entries (encrypted vault)
    timelineData.forEach(item => {
      combined.push({
        ...item,
        type: 'encrypted_evidence',
        sortTimestamp: item.timestamp || Date.now()
      });
    });
    // Add AI timeline entries (local processing)
    aiTimelineData.forEach(item => {
      combined.push({
        ...item,
        type: 'ai_processed',
        sortTimestamp: new Date(item.createdAt).getTime()
      });
    });
    // Add Bonded services timeline entries (real-time)
    if (Array.isArray(bondedTimeline)) {
      bondedTimeline.forEach(item => {
        combined.push({
          ...item,
          type: 'bonded_evidence',
          sortTimestamp: item.timestamp || Date.now()
        });
      });
    }
    // Sort by timestamp, newest first
    combined.sort((a, b) => b.sortTimestamp - a.sortTimestamp);
    setCombinedTimelineData(combined);
  }, [timelineData, aiTimelineData, bondedTimeline]);
  // Load timeline data when services are initialized
  useEffect(() => {
    if (isInitialized && !servicesLoading) {
      loadEncryptedTimeline();
    loadAITimelineData();
    }
  }, [isInitialized, servicesLoading, loadEncryptedTimeline, loadAITimelineData]);
  // Combine data when any timeline changes
  useEffect(() => {
    combineTimelineData();
  }, [combineTimelineData]);
  // Set up auto AI scanner observer
  useEffect(() => {
    const aiScannerObserver = (event, data) => {
      if (event === 'timelineUpdated') {
        // Force refresh of all timeline data sources
        loadAITimelineData();
        if (isInitialized) {
          loadEncryptedTimeline();
        }
        // Also refresh bonded services timeline
        if (refreshTimeline) {
          refreshTimeline();
        }
      }
    };
    autoAIScanner.addObserver(aiScannerObserver);
    return () => {
      autoAIScanner.removeObserver(aiScannerObserver);
    };
  }, [loadAITimelineData, loadEncryptedTimeline, isInitialized, refreshTimeline]);
  // Enhanced evidence processing for media selection with AI filtering
  const handleMediaSelected = async (selectedFiles, groupedByDate) => {
    try {
      setProcessingEvidence(true);
      setIsMediaScannerOpen(false);
      
      // Import AI filtering service and timeline service
      const { aiEvidenceFilter } = await import('../../services/index.js');
      const { timelineService } = await import('../../services/timelineService.js');
      
      let processedCount = 0;
      let approvedCount = 0;
      let rejectedCount = 0;
      
      // Process each file through AI filtering pipeline
      for (const fileData of selectedFiles) {
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
              id: `timeline_scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
                source: 'timeline_scan',
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
          }
          
        } catch (error) {
          rejectedCount++;
          console.error(`Error processing file ${fileData.file.name}:`, error);
        }
      }
      
      // Show results
      setImportedMediaInfo({
        mediaCount: approvedCount,
        processedCount,
        rejectedCount,
        dateRange: formatDateRangeForDisplay(groupedByDate)
      });
      setShowImportSuccess(true);
      
      // Refresh all timeline sources to show new entries
      await loadEncryptedTimeline();
      await loadAITimelineData();
      if (refreshTimeline) {
        await refreshTimeline();
      }
      
      // Auto-hide success message
      setTimeout(() => setShowImportSuccess(false), 5000);
      
    } catch (error) {
      setError(`Failed to process media: ${error.message}`);
    } finally {
      setProcessingEvidence(false);
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
  // Enhanced evidence processing with AI and encryption
  const handleProcessEvidenceClick = async () => {
    try {
      setProcessingEvidence(true);
      setError(null);
      // Use the processEvidence from useBondedServices
      const result = await processEvidence();
      if (result.success) {
        // Encrypt and upload the processed evidence
        if (result.evidence) {
          await processEvidenceWithEncryption(result.evidence);
        }
        setShowImportSuccess(true);
        setImportedMediaInfo({
          count: (result.evidence?.photo ? 1 : 0) + (result.evidence?.messages?.length || 0),
          type: result.evidence?.photo ? 'photo and messages' : 'messages'
        });
        // Refresh timeline
        await loadEncryptedTimeline();
        // Hide success message after 3 seconds
        setTimeout(() => setShowImportSuccess(false), 3000);
      } else {
        setError(`Evidence processing failed: ${result.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (err) {
      setError(`Failed to process evidence: ${err.message}`);
    } finally {
      setProcessingEvidence(false);
    }
  };
  // Enhanced timeline refresh with error handling
  const handleRefreshTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      // Refresh from multiple sources
      await Promise.all([
        loadEncryptedTimeline(),
        refreshTimeline && refreshTimeline(true),
        loadAITimelineData()
      ]);
    } catch (err) {
      setError(`Failed to refresh timeline: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
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
      if (isInitialized) {
        loadEncryptedTimeline();
      }
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
  }, [location, isInitialized, loadEncryptedTimeline]);
  // Enhanced scroll animations
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
    try {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        date = new Date();
      }
      const options = { day: 'numeric', month: 'short', year: 'numeric' };
      return date.toLocaleDateString('en-GB', options);
    } catch (error) {
      return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
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
  // Enhanced timeline content rendering
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
    if (combinedTimelineData.length === 0) {
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
            {combinedTimelineData.map((item, index) => (
              <div 
                key={`dot-${item.id}`} 
                className={`timeline-dot ${animatedItems.includes(item.id) ? 'timeline-dot-animated' : ''} ${item.type === 'ai_processed' ? 'ai-dot' : ''} ${item.type === 'encrypted_evidence' ? 'encrypted-dot' : ''}`}
                style={{ top: `${index * 200 + 100}px` }}
              />
            ))}
          </div>
        </div>
        {/* Timeline Entries */}
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
                  <div className="date-text">{item.date || formatDateForDisplay(new Date(item.timestamp))}</div>
                  {item.type === 'encrypted_evidence' && (
                    <div className="encryption-badge" title="End-to-end encrypted">🔒</div>
                  )}
            </div>
            <TimelineTileWrapper 
              className={`timeline-tile-${Math.min(index + 1, 3)}`}
                  timelineTileText={`${item.messages || 0} Messages`}
                  timelineTileText1={`${item.photos || 0} Photos`}
                  timelineTileText2={item.location || 'Unknown Location'}
                  timelineTileIcon={item.icon || (item.messages > 0 ? <Chat4 className="chat-icon-svg" /> : null)}
              timelineTileMaskGroup={item.image}
              timelineTileMaskGroupClassName="timeline-brand-image"
              onClick={handleTimelineTileClick}
                  date={item.date || formatDateForDisplay(new Date(item.timestamp))}
                  source={item.source || 'unknown'}
                  uploadStatus={item.uploadStatus || 'completed'}
              evidenceCategory={determineEvidenceCategory(item)}
              evidenceType={determineEvidenceType(item)}
                  aiVerified={item.type === 'ai_processed' || item.type === 'encrypted_evidence'}
              processTimestamp={`Processed: ${new Date(item.timestamp).toLocaleString()}`}
              blockchainTimestamp={item.blockchainTimestamp}
                  encryptionHash={item.hash}
            />
          </div>
            );
          }
        })}
        <div className="timeline-end">
          <div className="timeline-end-dot" />
          <p className="timeline-end-text">Keep building your evidence timeline</p>
          <div className="timeline-end-actions">
          <button className="scan-media-button" onClick={handleScanMediaClick}>
            Scan Device Media
          </button>
            <button className="process-evidence-button" onClick={handleProcessEvidenceClick}>
              Process Evidence
            </button>
          </div>
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
