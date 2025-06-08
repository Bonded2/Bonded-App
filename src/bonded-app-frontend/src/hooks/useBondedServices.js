/**
 * Bonded Services Hook
 * 
 * React hook that provides access to all Bonded services
 * Handles initialization, state management, and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  evidenceProcessor, 
  timelineService, 
  schedulerService, 
  mediaAccessService,
  aiEvidenceFilter 
} from '../services/index.js';

export const useBondedServices = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [settings, setSettings] = useState({});

  /**
   * Initialize all services
   */
  const initializeServices = useCallback(async () => {
    if (isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[useBondedServices] Initializing services...');
      
      // Services are already initialized in their constructors
      // Just need to load initial data
      await loadInitialData();
      
      setIsInitialized(true);
      console.log('[useBondedServices] Services initialized successfully');
      
    } catch (err) {
      console.error('[useBondedServices] Initialization failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  /**
   * Load initial data from services
   */
  const loadInitialData = async () => {
    try {
      // Load timeline
      const timelineData = await timelineService.fetchTimeline();
      setTimeline(timelineData);
      
      // Load statistics
      const stats = evidenceProcessor.getStatistics();
      setStatistics(stats);
      
      // Load settings
      const schedulerSettings = schedulerService.getSettings();
      const aiSettings = aiEvidenceFilter.getSettings();
      const mediaConfig = mediaAccessService.getConfiguration();
      
      setSettings({
        scheduler: schedulerSettings,
        ai: aiSettings,
        media: mediaConfig
      });
      
    } catch (err) {
      console.error('[useBondedServices] Failed to load initial data:', err);
      throw err;
    }
  };

  /**
   * Refresh timeline data
   */
  const refreshTimeline = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const timelineData = await timelineService.fetchTimeline({ forceRefresh });
      setTimeline(timelineData);
      
    } catch (err) {
      console.error('[useBondedServices] Timeline refresh failed:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Trigger manual evidence processing
   */
  const processEvidence = useCallback(async (targetDate = new Date()) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await evidenceProcessor.processDailyEvidence(targetDate);
      
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
  }, [refreshTimeline]);

  /**
   * Export timeline to PDF
   */
  const exportToPDF = useCallback(async (selectedItems, options = {}) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await timelineService.exportToPDF(selectedItems, options);
      return result;
      
    } catch (err) {
      console.error('[useBondedServices] PDF export failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update AI filter settings
   */
  const updateAISettings = useCallback(async (newSettings) => {
    try {
      await aiEvidenceFilter.updateSettings(newSettings);
      
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
  }, []);

  /**
   * Update scheduler settings
   */
  const updateSchedulerSettings = useCallback(async (newSettings) => {
    try {
      await schedulerService.updateSettings(newSettings);
      
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
  }, []);

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
   * Clear all data (kill switch)
   */
  const clearAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Clear all service data
      await evidenceProcessor.cleanup();
      await timelineService.clearCache();
      await mediaAccessService.clearCache();
      await aiEvidenceFilter.clearCache();
      
      // Reset local state
      setTimeline([]);
      setStatistics({});
      setSettings({});
      setIsInitialized(false);
      
      console.log('[useBondedServices] All data cleared');
      
    } catch (err) {
      console.error('[useBondedServices] Data clearing failed:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize services on mount
  useEffect(() => {
    initializeServices();
  }, [initializeServices]);

  // Return the hook interface
  return {
    // State
    isInitialized,
    isLoading,
    error,
    timeline,
    statistics,
    settings,
    
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
    
    // Utilities
    isUploadDue,
    
    // Direct service access (for advanced use)
    services: {
      evidenceProcessor,
      timelineService,
      schedulerService,
      mediaAccessService,
      aiEvidenceFilter
    }
  };
};

export default useBondedServices; 