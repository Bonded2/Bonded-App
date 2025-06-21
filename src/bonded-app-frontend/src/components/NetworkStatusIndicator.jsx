import React, { useState, useEffect } from 'react';
import { networkMonitor } from '../services/icpNetworkHelper.js';

/**
 * Network Status Indicator Component
 * Shows users when the app is running in offline/fallback mode
 */
const NetworkStatusIndicator = () => {
  const [networkStatus, setNetworkStatus] = useState(networkMonitor.getStatus());
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleStatusUpdate = (status) => {
      setNetworkStatus(status);
    };

    networkMonitor.addListener(handleStatusUpdate);

    return () => {
      networkMonitor.removeListener(handleStatusUpdate);
    };
  }, []);

  // Don't show indicator if everything is working normally
  if (networkStatus.isFullyOnline) {
    return null;
  }

  const getStatusMessage = () => {
    if (!networkStatus.isOnline) {
      return 'No Internet Connection';
    }
    if (networkStatus.icpNetworkStatus === 'disconnected') {
      return 'ICP Network Issues';
    }
    return 'Network Limited';
  };

  const getStatusDescription = () => {
    if (!networkStatus.isOnline) {
      return 'Please check your internet connection. The app is running in offline mode.';
    }
    if (networkStatus.icpNetworkStatus === 'disconnected') {
      return 'Having trouble connecting to ICP network. The app is using local storage and will sync when connection is restored.';
    }
    return 'Limited connectivity detected. Some features may be delayed.';
  };

  const getStatusColor = () => {
    if (!networkStatus.isOnline) {
      return 'bg-red-500';
    }
    if (networkStatus.icpNetworkStatus === 'disconnected') {
      return 'bg-yellow-500';
    }
    return 'bg-orange-500';
  };

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${getStatusColor()} text-white px-4 py-2 text-sm`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="font-medium">{getStatusMessage()}</span>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-white/80 hover:text-white underline"
          >
            {showDetails ? 'Less' : 'More'}
          </button>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs opacity-75">
            {networkStatus.isOnline ? 'Online' : 'Offline'}
        </span>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-2 p-3 bg-black/20 rounded text-xs">
          <p>{getStatusDescription()}</p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <strong>Internet:</strong> {networkStatus.isOnline ? '✅ Connected' : '❌ Disconnected'}
            </div>
            <div>
              <strong>ICP Network:</strong> {
                networkStatus.icpNetworkStatus === 'connected' ? '✅ Connected' :
                networkStatus.icpNetworkStatus === 'disconnected' ? '❌ Issues' :
                '⏳ Checking...'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkStatusIndicator; 