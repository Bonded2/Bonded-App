import React, { useState, useEffect } from 'react';
import { PulseDot, TypingIndicator } from '../LoadingStates/LoadingStates';
import './style.css';

/**
 * OFFLINE STATUS BAR
 * 
 * Smart status indicator showing:
 * - Online/offline connectivity
 * - Sync queue status
 * - Background upload progress
 * - User actionable feedback
 */

export const OfflineStatusBar = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    syncInProgress: false
  });
  const [showDetails, setShowDetails] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnlineStatus = (event) => {
      setIsOnline(event.detail.isOnline);
    };

    const handleSyncQueueUpdate = (event) => {
      setSyncStatus(prev => ({
        ...prev,
        ...event.detail
      }));
    };

    const handleSyncComplete = () => {
      setLastSyncTime(Date.now());
    };

    // Register event listeners
    window.addEventListener('bonded:online-status', handleOnlineStatus);
    window.addEventListener('bonded:sync-queue-update', handleSyncQueueUpdate);
    window.addEventListener('bonded:sync-complete', handleSyncComplete);

    // Initial status check
    import('../../services/enhancedOfflineService.js').then(({ default: offlineService }) => {
      const status = offlineService.getQueueStatus();
      setSyncStatus(status);
      setIsOnline(status.isOnline);
    });

    return () => {
      window.removeEventListener('bonded:online-status', handleOnlineStatus);
      window.removeEventListener('bonded:sync-queue-update', handleSyncQueueUpdate);
      window.removeEventListener('bonded:sync-complete', handleSyncComplete);
    };
  }, []);

  const handleRetrySync = async () => {
    const { default: offlineService } = await import('../../services/enhancedOfflineService.js');
    await offlineService.retryFailedTasks();
  };

  const handleClearCompleted = async () => {
    const { default: offlineService } = await import('../../services/enhancedOfflineService.js');
    await offlineService.clearCompletedTasks();
  };

  const getStatusMessage = () => {
    if (!isOnline) {
      if (syncStatus.total > 0) {
        return `Offline - ${syncStatus.total} items queued`;
      }
      return 'Working offline';
    }

    if (syncStatus.syncInProgress) {
      return 'Syncing your data...';
    }

    if (syncStatus.failed > 0) {
      return `${syncStatus.failed} items failed to sync`;
    }

    if (syncStatus.pending > 0) {
      return `${syncStatus.pending} items pending sync`;
    }

    if (syncStatus.completed > 0 && lastSyncTime) {
      const elapsed = Math.floor((Date.now() - lastSyncTime) / 1000);
      if (elapsed < 60) {
        return 'All synced';
      }
    }

    return null; // Don't show status bar when everything is normal
  };

  const getStatusColor = () => {
    if (!isOnline) return 'offline';
    if (syncStatus.failed > 0) return 'error';
    if (syncStatus.syncInProgress) return 'syncing';
    if (syncStatus.pending > 0) return 'pending';
    return 'success';
  };

  const statusMessage = getStatusMessage();
  
  // Don't render if everything is normal and online
  if (!statusMessage) {
    return null;
  }

  return (
    <div className={`offline-status-bar ${getStatusColor()}`}>
      <div className="status-content" onClick={() => setShowDetails(!showDetails)}>
        <div className="status-indicator">
          {!isOnline && <PulseDot color="warning" size="small" />}
          {isOnline && syncStatus.syncInProgress && <PulseDot color="primary" size="small" />}
          {isOnline && syncStatus.failed > 0 && <PulseDot color="error" size="small" />}
          {isOnline && syncStatus.pending > 0 && <PulseDot color="warning" size="small" />}
        </div>
        
        <div className="status-text">
          <span className="status-message">{statusMessage}</span>
          {syncStatus.syncInProgress && (
            <TypingIndicator message="" className="sync-progress" />
          )}
        </div>

        <div className="status-actions">
          {syncStatus.failed > 0 && (
            <button
              className="retry-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleRetrySync();
              }}
              title="Retry failed uploads"
            >
              Retry
            </button>
          )}
          
          {syncStatus.total > 0 && (
            <span className="queue-count">
              {syncStatus.total}
            </span>
          )}
        </div>
      </div>

      {/* Detailed status panel */}
      {showDetails && (
        <div className="status-details">
          <div className="details-header">
            <h4>Sync Status</h4>
            <button
              className="close-details"
              onClick={() => setShowDetails(false)}
            >
              ×
            </button>
          </div>

          <div className="details-content">
            <div className="connection-status">
              <div className="connection-indicator">
                <div className={`connection-dot ${isOnline ? 'online' : 'offline'}`}></div>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              {!isOnline && (
                <p className="offline-message">
                  Changes will sync when you're back online
                </p>
              )}
            </div>

            {syncStatus.total > 0 && (
              <div className="queue-breakdown">
                <h5>Queue Status</h5>
                <div className="queue-stats">
                  {syncStatus.pending > 0 && (
                    <div className="stat-item pending">
                      <span className="stat-count">{syncStatus.pending}</span>
                      <span className="stat-label">Pending</span>
                    </div>
                  )}
                  {syncStatus.processing > 0 && (
                    <div className="stat-item processing">
                      <span className="stat-count">{syncStatus.processing}</span>
                      <span className="stat-label">Processing</span>
                    </div>
                  )}
                  {syncStatus.completed > 0 && (
                    <div className="stat-item completed">
                      <span className="stat-count">{syncStatus.completed}</span>
                      <span className="stat-label">Completed</span>
                    </div>
                  )}
                  {syncStatus.failed > 0 && (
                    <div className="stat-item failed">
                      <span className="stat-count">{syncStatus.failed}</span>
                      <span className="stat-label">Failed</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="details-actions">
              {syncStatus.failed > 0 && (
                <button
                  className="action-btn retry"
                  onClick={handleRetrySync}
                >
                  Retry Failed Items
                </button>
              )}
              {syncStatus.completed > 0 && (
                <button
                  className="action-btn clear"
                  onClick={handleClearCompleted}
                >
                  Clear Completed
                </button>
              )}
            </div>

            {lastSyncTime && (
              <div className="last-sync">
                <small>
                  Last sync: {new Date(lastSyncTime).toLocaleTimeString()}
                </small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineStatusBar;