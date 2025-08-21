import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ConsistentTopBar } from "../../components/ConsistentTopBar/ConsistentTopBar";
import { getNSFWDetectionService, getTextClassificationService, getEvidenceFilterService } from "../../ai";
import "./style.css";

export const AISettings = () => {
  const navigate = useNavigate();
  
  // Real AI-powered content filter settings
  const [aiSettings, setAiSettings] = useState({
    excludeNudity: true,        // T2.01: Image filter default (NSFW Detection)
    excludeSexualContent: true, // T2.02: Text filter default (DistilBERT + Keywords)
    locationFilter: 'all',     // T2.03: Location filter default ('all' for MVP)
    uploadCycle: 'daily',       // T2.04: Upload cycle default ('daily' for MVP)
    uploadTime: 'midnight'      // T2.04: Upload time default ('midnight' for MVP)
  });

  // AI Services Status
  const [aiStatus, setAiStatus] = useState({
    nsfwDetection: { isLoaded: false, isLoading: false, error: null },
    textClassification: { isLoaded: false, isLoading: false, error: null },
    evidenceFilter: { isLoaded: false, isLoading: false, error: null }
  });

  // Initialize AI services on component mount
  useEffect(() => {
    initializeAIServices();
  }, []);

  const initializeAIServices = async () => {
    try {
      // Initialize NSFW Detection Service
      setAiStatus(prev => ({ ...prev, nsfwDetection: { ...prev.nsfwDetection, isLoading: true } }));
      const nsfwService = await getNSFWDetectionService();
      await nsfwService.loadModel();
      const nsfwStatus = nsfwService.getStatus();
      setAiStatus(prev => ({ ...prev, nsfwDetection: { 
        isLoaded: nsfwStatus.isLoaded, 
        isLoading: false, 
        error: nsfwStatus.error,
        modelType: nsfwStatus.modelType 
      }}));

      // Initialize Text Classification Service  
      setAiStatus(prev => ({ ...prev, textClassification: { ...prev.textClassification, isLoading: true } }));
      const textService = await getTextClassificationService();
      await textService.loadModel();
      const textStatus = textService.getStatus();
      setAiStatus(prev => ({ ...prev, textClassification: { 
        isLoaded: textStatus.isLoaded, 
        isLoading: false, 
        error: textStatus.error,
        modelType: textStatus.modelName 
      }}));

      // Initialize Evidence Filter Service
      const evidenceService = await getEvidenceFilterService();
      await evidenceService.updateSettings({
        enableNSFWFilter: aiSettings.excludeNudity,
        enableTextFilter: aiSettings.excludeSexualContent
      });
      setAiStatus(prev => ({ ...prev, evidenceFilter: { 
        isLoaded: true, 
        isLoading: false, 
        error: null 
      }}));

    } catch (error) {
      console.error('❌ AI Services initialization failed:', error);
      setAiStatus(prev => Object.keys(prev).reduce((acc, key) => ({
        ...acc,
        [key]: { isLoaded: false, isLoading: false, error: error.message }
      }), {}));
    }
  };

  const handleBack = () => {
    // Navigate back to timeline (main dashboard) for better UX
    navigate('/timeline');
  };

  return (
    <div className="ai-settings-screen">
      <ConsistentTopBar 
        title="AI Settings"
        showBackButton={true}
        onBackClick={handleBack}
        showMenuButton={true}
        showUploadButton={false}
      />
      
      <div className="ai-settings-content">
        {/* Header */}
        <div className="ai-hero-section">
          <div className="ai-hero-icon">🤖</div>
          <h2>Content Filters</h2>
          <p>Configure automatic filtering for your evidence timeline.</p>
        </div>

        {/* Filter Settings */}
        <div className="settings-section">

          {/* Image Filter Setting (T2.01) - Real NSFW Detection */}
          <div className="setting-item mvp-setting">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.excludeNudity}
                  disabled={true} // Default enabled for professional evidence standards
                  className="setting-checkbox"
                />
                <span className="checkbox-custom"></span>
                Image filter: Exclude nudity
              </label>
              <div className="setting-badge">
                {aiStatus.nsfwDetection.isLoading ? '⏳ Loading' : 
                 aiStatus.nsfwDetection.isLoaded ? '✅ Active' : 
                 aiStatus.nsfwDetection.error ? '❌ Error' : '⏸️ Ready'}
              </div>
            </div>
            <p className="setting-description">
              Automatically excludes inappropriate visual content from evidence.
            </p>
            {aiStatus.nsfwDetection.error && (
              <div className="error-notice">
                <span className="error-icon">⚠️</span>
                <span>Error loading NSFW detection: {aiStatus.nsfwDetection.error}</span>
              </div>
            )}
          </div>

          {/* Text Filter Setting (T2.02) - Real DistilBERT + Keywords */}
          <div className="setting-item mvp-setting">
            <div className="setting-header">
              <label className="setting-label">
                <input
                  type="checkbox"
                  checked={aiSettings.excludeSexualContent}
                  disabled={true} // Default enabled for professional evidence standards
                  className="setting-checkbox"
                />
                <span className="checkbox-custom"></span>
                Text filter: Exclude explicit messages
              </label>
              <div className="setting-badge">
                {aiStatus.textClassification.isLoading ? '⏳ Loading' : 
                 aiStatus.textClassification.isLoaded ? '✅ Active' : 
                 aiStatus.textClassification.error ? '❌ Error' : '⏸️ Ready'}
              </div>
            </div>
            <p className="setting-description">
              Automatically excludes explicit messages from evidence.
            </p>
            {aiStatus.textClassification.error && (
              <div className="error-notice">
                <span className="error-icon">⚠️</span>
                <span>Error loading text classification: {aiStatus.textClassification.error}</span>
              </div>
            )}
          </div>

          {/* Location Filter Setting */}
          <div className="setting-item mvp-setting">
            <div className="setting-header">
              <label className="setting-label">
                <select
                  value={aiSettings.locationFilter}
                  disabled={true} // Currently only "All locations" available
                  className="setting-select"
                >
                  <option value="all">All locations</option>
                </select>
                <span className="select-label">Location filter: All locations</span>
              </label>
              <div className="setting-badge">
                📍 Coming Soon
              </div>
            </div>
            <p className="setting-description">
              Filter evidence by geographic location. Additional options coming soon.
            </p>
          </div>

          {/* Upload Cycle Setting (T2.04) */}
          <div className="setting-item mvp-setting">
            <div className="setting-header">
              <label className="setting-label">
                <select
                  value={aiSettings.uploadCycle}
                  disabled={true} // Currently only "Daily" available
                  className="setting-select"
                >
                  <option value="daily">Daily</option>
                </select>
                <span className="select-label">Upload frequency: Daily</span>
              </label>
              <div className="setting-badge">
                ⏰ Coming Soon
              </div>
            </div>
            <p className="setting-description">
              Automatic evidence collection frequency. Additional options coming soon.
            </p>
          </div>

          {/* Upload Time Setting (T2.04) */}
          <div className="setting-item mvp-setting">
            <div className="setting-header">
              <label className="setting-label">
                <select
                  value={aiSettings.uploadTime}
                  disabled={true} // Currently only "Local Midnight" available
                  className="setting-select"
                >
                  <option value="midnight">Local Midnight</option>
                </select>
                <span className="select-label">Upload time: Local Midnight</span>
              </label>
              <div className="setting-badge">
                🕛 Coming Soon
              </div>
            </div>
            <p className="setting-description">
              Daily evidence collection time. Additional options coming soon.
            </p>
          </div>
        </div>

        {/* System Status */}
        <div className="settings-section">
          <h2>System Status</h2>
          <div className="status-card">
            <div className="status-row">
              <span className="status-label">Content Filtering:</span>
              <span className={`status-value ${(aiStatus.nsfwDetection.isLoaded && aiStatus.textClassification.isLoaded && aiStatus.evidenceFilter.isLoaded) ? 'active' : 
                                               (aiStatus.nsfwDetection.isLoading || aiStatus.textClassification.isLoading || aiStatus.evidenceFilter.isLoading) ? 'loading' : 
                                               (aiStatus.nsfwDetection.error || aiStatus.textClassification.error || aiStatus.evidenceFilter.error) ? 'error' : 'ready'}`}>
                <span className={`status-indicator ${(aiStatus.nsfwDetection.isLoaded && aiStatus.textClassification.isLoaded && aiStatus.evidenceFilter.isLoaded) ? 'active' : 
                                                    (aiStatus.nsfwDetection.isLoading || aiStatus.textClassification.isLoading || aiStatus.evidenceFilter.isLoading) ? 'loading' : 
                                                    (aiStatus.nsfwDetection.error || aiStatus.textClassification.error || aiStatus.evidenceFilter.error) ? 'error' : 'ready'}`}></span>
                {(aiStatus.nsfwDetection.isLoading || aiStatus.textClassification.isLoading || aiStatus.evidenceFilter.isLoading) ? 'Loading...' : 
                 (aiStatus.nsfwDetection.isLoaded && aiStatus.textClassification.isLoaded && aiStatus.evidenceFilter.isLoaded) ? 'Active' : 
                 (aiStatus.nsfwDetection.error || aiStatus.textClassification.error || aiStatus.evidenceFilter.error) ? 'Error' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
