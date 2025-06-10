/**
 * Bonded Services Hook
 * 
 * React hook that provides access to all Bonded services
 * Handles initialization, state management, and error handling for production environment
 * Includes canister integration and encryption services for ICP blockchain storage
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  evidenceProcessor, 
  timelineService, 
  schedulerService, 
  mediaAccessService,
  aiEvidenceFilter 
} from '../services/index.js';
import { canisterIntegration } from '../services/canisterIntegration.js';
import { encryptionService } from '../crypto/encryption.js';

export const useBondedServices = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [settings, setSettings] = useState({});
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    principal: null,
    identity: null
  });
  const [encryptionReady, setEncryptionReady] = useState(false);
  const [canisterConnected, setCanisterConnected] = useState(false);

  /**
   * Initialize all services including ICP canisters and encryption
   */
  const initializeServices = useCallback(async () => {
    if (isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[useBondedServices] Initializing production services...');
      
      // Initialize encryption service first
      await encryptionService.initialize();
      setEncryptionReady(true);
      console.log('[useBondedServices] Encryption service initialized');
      
      // Initialize canister integration
      const authStatus = await canisterIntegration.initialize();
      setAuthState(authStatus);
      setCanisterConnected(true);
      console.log('[useBondedServices] Canister integration initialized');
      
      // Initialize other services
      await loadInitialData();
      
      setIsInitialized(true);
      console.log('[useBondedServices] All services initialized successfully');
      
    } catch (err) {
      console.error('[useBondedServices] Initialization failed:', err);
      setError(err.message);
      
      // Graceful degradation - allow offline use
      try {
        await loadLocalData();
        console.log('[useBondedServices] Initialized with local data only');
      } catch (localErr) {
        console.error('[useBondedServices] Local initialization also failed:', localErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  /**
   * Load initial data from production services
   */
  const loadInitialData = async () => {
    try {
      // Load encrypted timeline from canisters
      let timelineData = [];
      if (canisterConnected && authState.isAuthenticated) {
        try {
          timelineData = await canisterIntegration.fetchTimeline();
          console.log(`[useBondedServices] Loaded ${timelineData.length} items from canister`);
        } catch (canisterErr) {
          console.warn('[useBondedServices] Canister fetch failed, using local data:', canisterErr);
          timelineData = await timelineService.fetchTimeline();
        }
      } else {
        timelineData = await timelineService.fetchTimeline();
      }
      
      setTimeline(timelineData);
      
      // Load statistics
      const stats = evidenceProcessor.getStatistics();
      setStatistics(stats);
      
      // Load settings from canisters if available
      let userSettings = {};
      if (canisterConnected && authState.isAuthenticated) {
        try {
          userSettings = await canisterIntegration.getUserSettings();
        } catch (settingsErr) {
          console.warn('[useBondedServices] Settings fetch failed, using defaults:', settingsErr);
        }
      }
      
      // Merge with local settings
      const schedulerSettings = schedulerService.getSettings();
      const aiSettings = aiEvidenceFilter.getSettings();
      const mediaConfig = mediaAccessService.getConfiguration();
      
      setSettings({
        scheduler: { ...schedulerSettings, ...userSettings.scheduler },
        ai: { ...aiSettings, ...userSettings.ai },
        media: { ...mediaConfig, ...userSettings.media },
        encryption: encryptionService.getSettings(),
        canister: canisterIntegration.getConnectionInfo()
      });
      
    } catch (err) {
      console.error('[useBondedServices] Failed to load initial data:', err);
      throw err;
    }
  };

  /**
   * Load data from local sources only (fallback)
   */
  const loadLocalData = async () => {
    try {
      const timelineData = await timelineService.fetchTimeline();
      setTimeline(timelineData);
      
      const stats = evidenceProcessor.getStatistics();
      setStatistics(stats);
      
      const schedulerSettings = schedulerService.getSettings();
      const aiSettings = aiEvidenceFilter.getSettings();
      const mediaConfig = mediaAccessService.getConfiguration();
      
      setSettings({
        scheduler: schedulerSettings,
        ai: aiSettings,
        media: mediaConfig,
        encryption: { enabled: false },
        canister: { connected: false }
      });
      
    } catch (err) {
      console.error('[useBondedServices] Failed to load local data:', err);
      throw err;
    }
  };

  /**
   * Refresh timeline data from all sources
   */
  const refreshTimeline = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let timelineData = [];
      
      // Try canister first if available
      if (canisterConnected && authState.isAuthenticated) {
        try {
          timelineData = await canisterIntegration.fetchTimeline({ forceRefresh });
          console.log('[useBondedServices] Timeline refreshed from canister');
        } catch (canisterErr) {
          console.warn('[useBondedServices] Canister refresh failed:', canisterErr);
          timelineData = await timelineService.fetchTimeline({ forceRefresh });
        }
      } else {
        timelineData = await timelineService.fetchTimeline({ forceRefresh });
      }
      
      setTimeline(timelineData);
      
    } catch (err) {
      console.error('[useBondedServices] Timeline refresh failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [canisterConnected, authState.isAuthenticated]);

  /**
   * Enhanced evidence processing with encryption and canister upload
   */
  const processEvidence = useCallback(async (targetDate = new Date()) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Process evidence locally first
      const result = await evidenceProcessor.processDailyEvidence(targetDate);
      
      // If successful and we have encryption + canister, upload encrypted
      if (result.success && encryptionReady && canisterConnected && authState.isAuthenticated) {
        try {
          // Encrypt the evidence
          const encryptedData = await encryptionService.encryptEvidence(result.evidence);
          
          // Upload to canister
          const relationshipId = 'mock-relationship-id'; // TODO: Get from actual relationship context
          const uploadResult = await canisterIntegration.uploadEvidence(
            relationshipId,
            encryptedData,
            {
              timestamp: Date.now(),
              contentType: result.evidence.type || 'mixed',
              category: result.evidence.category || 'relationship'
            }
          );
          
          console.log('[useBondedServices] Evidence uploaded to canister:', uploadResult);
          
          // Update result with canister info
          result.canisterUpload = uploadResult;
          result.encrypted = true;
          
        } catch (uploadErr) {
          console.warn('[useBondedServices] Canister upload failed, keeping local:', uploadErr);
          result.canisterUpload = { error: uploadErr.message };
          result.encrypted = false;
        }
      }
      
      // Update statistics
      const stats = evidenceProcessor.getStatistics();
      setStatistics(stats);
      
      // Refresh timeline if successful
      if (result.success) {
        await refreshTimeline(true);
      }
      
      return result;
      
    } catch (err) {
      console.error('[useBondedServices] Evidence processing failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshTimeline, encryptionReady, canisterConnected, authState.isAuthenticated]);

  /**
   * Export timeline to PDF with optional encryption verification
   */
  const exportToPDF = useCallback(async (selectedItems, options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Add encryption verification to export if available
      if (encryptionReady && options.includeVerification) {
        for (const item of selectedItems) {
          if (item.hash) {
            try {
              const verified = await encryptionService.verifyIntegrity(item.data, item.hash);
              item.verified = verified;
            } catch (verifyErr) {
              console.warn(`[useBondedServices] Verification failed for item ${item.id}:`, verifyErr);
              item.verified = false;
            }
          }
        }
      }
      
      const result = await timelineService.exportToPDF(selectedItems, options);
      return result;
      
    } catch (err) {
      console.error('[useBondedServices] PDF export failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [encryptionReady]);

  /**
   * Update AI filter settings with canister sync
   */
  const updateAISettings = useCallback(async (newSettings) => {
    try {
      await aiEvidenceFilter.updateSettings(newSettings);
      
      // Sync to canister if available
      if (canisterConnected && authState.isAuthenticated) {
        try {
          await canisterIntegration.updateUserSettings({
            ai: newSettings
          });
        } catch (syncErr) {
          console.warn('[useBondedServices] Settings sync to canister failed:', syncErr);
        }
      }
      
      // Update local settings state
      setSettings(prev => ({
        ...prev,
        ai: { ...prev.ai, ...newSettings }
      }));
      
    } catch (err) {
      console.error('[useBondedServices] AI settings update failed:', err);
      setError(err.message);
      throw err;
    }
  }, [canisterConnected, authState.isAuthenticated]);

  /**
   * Update scheduler settings with canister sync
   */
  const updateSchedulerSettings = useCallback(async (newSettings) => {
    try {
      await schedulerService.updateSettings(newSettings);
      
      // Sync to canister if available
      if (canisterConnected && authState.isAuthenticated) {
        try {
          await canisterIntegration.updateUserSettings({
            scheduler: newSettings
          });
        } catch (syncErr) {
          console.warn('[useBondedServices] Settings sync to canister failed:', syncErr);
        }
      }
      
      // Update local settings state
      setSettings(prev => ({
        ...prev,
        scheduler: { ...prev.scheduler, ...newSettings }
      }));
      
    } catch (err) {
      console.error('[useBondedServices] Scheduler settings update failed:', err);
      setError(err.message);
      throw err;
    }
  }, [canisterConnected, authState.isAuthenticated]);

  /**
   * Configure media access
   */
  const configureMediaAccess = useCallback(async (config) => {
    try {
      if (config.photoLibrary) {
        await mediaAccessService.requestPhotoLibraryAccess();
      }
      
      if (config.telegram) {
        await mediaAccessService.configureTelegram(config.telegram);
      }
      
      // Update local settings state
      const mediaConfig = mediaAccessService.getConfiguration();
      setSettings(prev => ({
        ...prev,
        media: mediaConfig
      }));
      
    } catch (err) {
      console.error('[useBondedServices] Media configuration failed:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Test canister connectivity
   */
  const testConnectivity = useCallback(async () => {
    try {
      const canisterStatus = await canisterIntegration.testConnectivity();
      setCanisterConnected(canisterStatus.connected);
      
      const encryptionStatus = await encryptionService.testEncryption();
      setEncryptionReady(encryptionStatus.ready);
      
      return {
        canister: canisterStatus,
        encryption: encryptionStatus
      };
      
    } catch (err) {
      console.error('[useBondedServices] Connectivity test failed:', err);
      setError(err.message);
      return {
        canister: { connected: false, error: err.message },
        encryption: { ready: false, error: err.message }
      };
    }
  }, []);

  /**
   * Apply timeline filters
   */
  const applyTimelineFilters = useCallback(async (filters) => {
    setIsLoading(true);
    
    try {
      timelineService.updateFilters(filters);
      const filteredTimeline = timelineService.applyFilters(timeline);
      setTimeline(filteredTimeline);
      
    } catch (err) {
      console.error('[useBondedServices] Filter application failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [timeline]);

  /**
   * Check if daily upload is due
   */
  const isUploadDue = useCallback(() => {
    return schedulerService.isUploadDue();
  }, []);

  /**
   * Get AI classification for content
   */
  const classifyContent = useCallback(async (content) => {
    try {
      if (content.type === 'image') {
        return await aiEvidenceFilter.filterImage(content.data);
      } else if (content.type === 'text') {
        return await aiEvidenceFilter.filterText(content.data);
      } else {
        throw new Error('Unsupported content type');
      }
      
    } catch (err) {
      console.error('[useBondedServices] Content classification failed:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Clear all data (kill switch) - enhanced with canister deletion
   */
  const clearAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Clear canister data first if available
      if (canisterConnected && authState.isAuthenticated) {
        try {
          await canisterIntegration.deleteAllUserData();
          console.log('[useBondedServices] Canister data deleted');
        } catch (canisterErr) {
          console.warn('[useBondedServices] Canister deletion failed:', canisterErr);
        }
      }
      
      // Clear encryption keys
      if (encryptionReady) {
        await encryptionService.clearKeys();
      }
      
      // Clear all service data
      await evidenceProcessor.cleanup();
      await timelineService.clearCache();
      await mediaAccessService.clearCache();
      await aiEvidenceFilter.clearCache();
      
      // Reset local state
      setTimeline([]);
      setStatistics({});
      setSettings({});
      setAuthState({
        isAuthenticated: false,
        principal: null,
        identity: null
      });
      setEncryptionReady(false);
      setCanisterConnected(false);
      setIsInitialized(false);
      
      console.log('[useBondedServices] All data cleared');
      
    } catch (err) {
      console.error('[useBondedServices] Data clearing failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [canisterConnected, authState.isAuthenticated, encryptionReady]);

  // Initialize services on mount
  useEffect(() => {
    initializeServices();
  }, [initializeServices]);

  // Return the enhanced hook interface
  return {
    // State
    isInitialized,
    isLoading,
    error,
    timeline,
    statistics,
    settings,
    authState,
    encryptionReady,
    canisterConnected,
    
    // Actions
    refreshTimeline,
    processEvidence,
    exportToPDF,
    updateAISettings,
    updateSchedulerSettings,
    configureMediaAccess,
    applyTimelineFilters,
    classifyContent,
    clearAllData,
    testConnectivity,
    
    // Utilities
    isUploadDue,
    
    // Production services (for advanced use)
    canisterIntegration,
    encryptionService,
    
    // Direct service access (for compatibility)
    services: {
      evidenceProcessor,
      timelineService,
      schedulerService,
      mediaAccessService,
      aiEvidenceFilter,
      canisterIntegration,
      encryptionService
    }
  };
};

export default useBondedServices;