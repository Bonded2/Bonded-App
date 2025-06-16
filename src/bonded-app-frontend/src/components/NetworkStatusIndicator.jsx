import React, { useState, useEffect } from 'react';
import { networkMonitor } from '../services/icpNetworkHelper.js';

const NetworkStatusIndicator = () => {
  const [networkStatus, setNetworkStatus] = useState({
    isOnline: true,
    errorCount: 0,
    shouldUseFallback: false
  });
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNetworkStatus(networkMonitor.getStatus());
    }, 30000);

    setNetworkStatus(networkMonitor.getStatus());
    return () => clearInterval(interval);
  }, []);

  if (networkStatus.isOnline && networkStatus.errorCount === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      background: networkStatus.shouldUseFallback ? '#f39c12' : '#e74c3c',
      color: 'white',
      padding: '8px 16px',
      cursor: 'pointer',
      fontSize: '14px'
    }} onClick={() => setShowDetails(!showDetails)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>{networkStatus.shouldUseFallback ? '🔄' : '⚠️'}</span>
        <span style={{ flex: 1 }}>
          {networkStatus.shouldUseFallback 
            ? 'Running in offline mode - using cached data'
            : 'ICP network connectivity issues detected'
          }
        </span>
        <span>{showDetails ? '▼' : '▶'}</span>
      </div>
      
      {showDetails && (
        <div style={{
          background: 'white',
          color: '#333',
          padding: '16px',
          marginTop: '8px',
          borderRadius: '4px',
          fontSize: '13px'
        }}>
          <p><strong>Network Status:</strong> {networkStatus.isOnline ? 'Connected' : 'Offline'}</p>
          <p><strong>Error Count:</strong> {networkStatus.errorCount}</p>
          {networkStatus.shouldUseFallback && (
            <div style={{ background: '#f8f9fa', padding: '12px', margin: '12px 0', borderRadius: '4px' }}>
              <p><strong>🔄 Offline Mode Active</strong></p>
              <p>The app is using cached data. Your information is safe and will sync when connectivity improves.</p>
            </div>
          )}
          <button 
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              networkMonitor.reset();
              setNetworkStatus(networkMonitor.getStatus());
              setShowDetails(false);
            }}
          >
            Reset Status
          </button>
        </div>
      )}
    </div>
  );
};

export { NetworkStatusIndicator };
export default NetworkStatusIndicator; 