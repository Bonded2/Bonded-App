/**
 * Bonded Services Hook
 * 
 * React hook that provides access to all Bonded services
 * Handles initialization, state management, and error handling for production environment
 * Includes canister integration and encryption services for ICP blockchain storage
 */
import { useState, useEffect, useCallback } from 'react';
// Lazy service imports to prevent constructor issues during bundle evaluation
let servicesCache = null;
const getServices = async () => {
  if (servicesCache) return servicesCache;
  try {
    // Import modules individually to avoid destructuring issues
    const servicesModule = await import('../services/index.js');
    const icpCanisterModule = await import('../services/api.js');
    const encryptionModule = await import('../crypto/encryption.js');
    
    // Build services cache with proper fallbacks
    servicesCache = {
      evidenceProcessor: servicesModule.evidenceProcessor || servicesModule.EvidenceProcessor,
      timelineService: servicesModule.timelineService || servicesModule.TimelineService,
      schedulerService: servicesModule.schedulerService,
      mediaAccessService: servicesModule.mediaAccessService,
      aiEvidenceFilter: servicesModule.aiEvidenceFilter || servicesModule.AIEvidenceFilter,
      api: icpCanisterModule.default,
      encryptionService: encryptionModule.encryptionService || encryptionModule.EncryptionService || encryptionModule.default
    };
    
    // Validate that all required services are available
    const requiredServices = ['evidenceProcessor', 'timelineService', 'schedulerService', 'mediaAccessService', 'aiEvidenceFilter', 'api', 'encryptionService'];
    for (const serviceName of requiredServices) {
      if (!servicesCache[serviceName]) {
        throw new Error(`Failed to load required service: ${serviceName}`);
      }
    }
    
    return servicesCache;
  } catch (error) {
    throw new Error(`Service initialization failed: ${error.message}`);
  }
};
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
      // Load services lazily
      const services = await getServices();
      // Initialize encryption service first
      await services.encryptionService.initialize();
      setEncryptionReady(true);
      // Initialize ICP canister service
      try {
        await services.api.initialize();
        const isAuthenticated = services.api.isAuthenticated;
        const principal = isAuthenticated ? services.api.getPrincipal()?.toString() : null;
        setAuthState({ 
          isAuthenticated, 
          principal, 
          identity: services.api.identity 
        });
        setCanisterConnected(true);
      } catch (canisterErr) {
        setAuthState({ isAuthenticated: false, principal: null, identity: null });
        setCanisterConnected(false);
      }
      // Initialize other services
      await loadInitialData();
      setIsInitialized(true);
    } catch (err) {
      setError(err.message);
      // Graceful degradation - allow offline use
      try {
        await loadLocalData();
      } catch (localErr) {
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
      const services = await getServices();
      // Load encrypted timeline from canisters
      let timelineData = [];
      if (canisterConnected && authState && authState.isAuthenticated) {
        try {
          timelineData = await services.api.getTimeline();
        } catch (canisterErr) {
          timelineData = await services.timelineService.fetchTimeline();
        }
      } else {
        timelineData = await services.timelineService.fetchTimeline();
      }
      setTimeline(timelineData);
      // Load statistics
      const stats = services.evidenceProcessor.getStatistics();
      setStatistics(stats);
      // Load settings from canisters if available
      let userSettings = {};
      if (canisterConnected && authState && authState.isAuthenticated) {
        try {
          userSettings = await services.api.getUserSettings();
        } catch (settingsErr) {
        }
      }
      // Merge with local settings
      const schedulerSettings = services.schedulerService.getSettings();
      const aiSettings = services.aiEvidenceFilter.getSettings();
      const mediaConfig = services.mediaAccessService.getConfiguration();
      setSettings({
        scheduler: { ...schedulerSettings, ...userSettings.scheduler },
        ai: { ...aiSettings, ...userSettings.ai },
        media: { ...mediaConfig, ...userSettings.media },
        encryption: services.encryptionService.getSettings(),
        canister: { connected: canisterConnected, isAuthenticated: authState.isAuthenticated }
      });
    } catch (err) {
      throw err;
    }
  };
  /**
   * Load data from local sources only (fallback)
   */
  const loadLocalData = async () => {
    try {
      const services = await getServices();
      const timelineData = await services.timelineService.fetchTimeline();
      setTimeline(timelineData);
      const stats = services.evidenceProcessor.getStatistics();
      setStatistics(stats);
      const schedulerSettings = services.schedulerService.getSettings();
      const aiSettings = services.aiEvidenceFilter.getSettings();
      const mediaConfig = services.mediaAccessService.getConfiguration();
      setSettings({
        scheduler: schedulerSettings,
        ai: aiSettings,
        media: mediaConfig,
        encryption: { enabled: false },
        canister: { connected: false }
      });
    } catch (err) {
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
      const services = await getServices();
      let timelineData = [];
      // Try canister first if available and properly initialized
      if (canisterConnected && authState && authState.isAuthenticated) {
        try {
          timelineData = await services.api.fetchTimeline({ forceRefresh });
        } catch (canisterErr) {
          timelineData = await services.timelineService.fetchTimeline({ forceRefresh });
        }
      } else {
        timelineData = await services.timelineService.fetchTimeline({ forceRefresh });
      }
      setTimeline(timelineData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [canisterConnected, authState?.isAuthenticated]);
  /**
   * Enhanced evidence processing with encryption and canister upload
   */
  const processEvidence = useCallback(async (targetDate = new Date()) => {
    setIsLoading(true);
    setError(null);
    try {
      const services = await getServices();
      // Process evidence locally first
      const result = await services.evidenceProcessor.processDailyEvidence(targetDate);
      // If successful and we have encryption + canister, upload encrypted
      if (result.success && encryptionReady && canisterConnected && authState && authState.isAuthenticated) {
        try {
          // Encrypt the evidence
          const encryptedData = await services.encryptionService.encryptEvidence(result.evidence);
          // Upload to canister
          // Get relationship ID from current user's relationships
    const relationshipId = currentUser?.relationships?.[0] || null;
          const uploadResult = await services.api.uploadEvidence(
            relationshipId,
            encryptedData,
            {
              timestamp: Date.now(),
              contentType: result.evidence.type || 'mixed',
              category: result.evidence.category || 'relationship'
            }
          );
          // Update result with canister info
          result.canisterUpload = uploadResult;
          result.encrypted = true;
        } catch (uploadErr) {
          result.canisterUpload = { error: uploadErr.message };
          result.encrypted = false;
        }
      }
      // Update statistics
      const stats = services.evidenceProcessor.getStatistics();
      setStatistics(stats);
      // Refresh timeline if successful
      if (result.success) {
        await refreshTimeline(true);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [refreshTimeline, encryptionReady, canisterConnected, authState]);
  /**
   * Export timeline to PDF with optional encryption verification
   */
  const exportToPDF = useCallback(async (selectedItems, options = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const services = await getServices();
      // Add encryption verification to export if available
      if (encryptionReady && options.includeVerification) {
        for (const item of selectedItems) {
          if (item.hash) {
            try {
              const verified = await services.encryptionService.verifyIntegrity(item.data, item.hash);
              item.verified = verified;
            } catch (verifyErr) {
              item.verified = false;
            }
          }
        }
      }
      const result = await services.timelineService.exportToPDF(selectedItems, options);
      return result;
    } catch (err) {
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
      const services = await getServices();
      await services.aiEvidenceFilter.updateSettings(newSettings);
      // Sync to canister if available
      if (canisterConnected && authState?.isAuthenticated) {
        try {
          await services.api.updateUserSettings({
            ai: newSettings
          });
        } catch (syncErr) {
        }
      }
      // Update local settings state
      setSettings(prev => ({
        ...prev,
        ai: { ...prev.ai, ...newSettings }
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [canisterConnected, authState.isAuthenticated]);
  /**
   * Update scheduler settings with canister sync
   */
  const updateSchedulerSettings = useCallback(async (newSettings) => {
    try {
      const services = await getServices();
      await services.schedulerService.updateSettings(newSettings);
      // Sync to canister if available
      if (canisterConnected && authState?.isAuthenticated) {
        try {
          await services.api.updateUserSettings({
            scheduler: newSettings
          });
        } catch (syncErr) {
        }
      }
      // Update local settings state
      setSettings(prev => ({
        ...prev,
        scheduler: { ...prev.scheduler, ...newSettings }
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [canisterConnected, authState.isAuthenticated]);
  /**
   * Configure media access
   */
  const configureMediaAccess = useCallback(async (config) => {
    try {
      const services = await getServices();
      if (config.photoLibrary) {
        await services.mediaAccessService.requestPhotoLibraryAccess();
      }
      if (config.telegram) {
        await services.mediaAccessService.configureTelegram(config.telegram);
      }
      // Update local settings state
      const mediaConfig = services.mediaAccessService.getConfiguration();
      setSettings(prev => ({
        ...prev,
        media: mediaConfig
      }));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);
  /**
   * Test canister connectivity
   */
  const testConnectivity = useCallback(async () => {
    try {
      const services = await getServices();
      const canisterStatus = await services.api.testConnectivity();
      setCanisterConnected(canisterStatus.connected);
      const encryptionStatus = await services.encryptionService.testEncryption();
      setEncryptionReady(encryptionStatus.ready);
      return {
        canister: canisterStatus,
        encryption: encryptionStatus
      };
    } catch (err) {
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
      const services = await getServices();
      services.timelineService.updateFilters(filters);
      const filteredTimeline = services.timelineService.applyFilters(timeline);
      setTimeline(filteredTimeline);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [timeline]);
  /**
   * Check if daily upload is due
   */
  const isUploadDue = useCallback(async () => {
    const services = await getServices();
    return services.schedulerService.isUploadDue();
  }, []);
  /**
   * Get AI classification for content
   */
  const classifyContent = useCallback(async (content) => {
    try {
      const services = await getServices();
      if (content.type === 'image') {
        return await services.aiEvidenceFilter.filterImage(content.data);
      } else if (content.type === 'text') {
        return await services.aiEvidenceFilter.filterText(content.data);
      } else {
        throw new Error('Unsupported content type');
      }
    } catch (err) {
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
      const services = await getServices();
      // Clear canister data first if available
      if (canisterConnected && authState?.isAuthenticated) {
        try {
          await services.api.deleteAllUserData();
        } catch (canisterErr) {
        }
      }
      // Clear encryption keys
      if (encryptionReady) {
        await services.encryptionService.clearKeys();
      }
      // Clear all service data
      await services.evidenceProcessor.cleanup();
      await services.timelineService.clearCache();
      await services.mediaAccessService.clearCache();
      await services.aiEvidenceFilter.clearCache();
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
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [canisterConnected, authState?.isAuthenticated, encryptionReady]);
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
    authState: authState || { isAuthenticated: false, principal: null, identity: null },
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
    // Production services (for advanced use) - lazy loaded
    getServices,
    // Direct service access (for compatibility) - lazy loaded
    services: servicesCache
  };
};
export default useBondedServices;