import React from "react";
import "./style.css";

/**
 * ENHANCED LOADING STATES COMPONENT
 * 
 * Provides consistent loading indicators with:
 * - Skeleton screens for content loading
 * - Spinner for general loading
 * - Progress indicators for uploads
 * - Optimized animations and accessibility
 */

export const LoadingSpinner = ({ 
  size = "medium", 
  color = "primary", 
  message = null,
  className = "" 
}) => (
  <div className={`loading-spinner-container ${className}`} role="status" aria-live="polite">
    <div className={`loading-spinner ${size} ${color}`}>
      <div className="spinner-circle"></div>
    </div>
    {message && (
      <p className="loading-message" aria-label={message}>
        {message}
      </p>
    )}
    <span className="sr-only">Loading...</span>
  </div>
);

export const SkeletonLoader = ({ 
  type = "text", 
  lines = 3, 
  width = "100%", 
  height = null,
  className = "" 
}) => {
  const renderTextSkeleton = () => (
    <div className={`skeleton-text-container ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div 
          key={i}
          className={`skeleton-line ${i === lines - 1 ? 'last-line' : ''}`}
          style={{ 
            width: i === lines - 1 ? '60%' : '100%',
            height: height || '1em'
          }}
        />
      ))}
    </div>
  );

  const renderCardSkeleton = () => (
    <div className={`skeleton-card ${className}`}>
      <div className="skeleton-avatar"></div>
      <div className="skeleton-content">
        <div className="skeleton-line title"></div>
        <div className="skeleton-line subtitle"></div>
        <div className="skeleton-line description"></div>
      </div>
    </div>
  );

  const renderImageSkeleton = () => (
    <div 
      className={`skeleton-image ${className}`}
      style={{ width, height: height || '200px' }}
    />
  );

  const renderButtonSkeleton = () => (
    <div 
      className={`skeleton-button ${className}`}
      style={{ width, height: height || '40px' }}
    />
  );

  switch (type) {
    case 'card':
      return renderCardSkeleton();
    case 'image':
      return renderImageSkeleton();
    case 'button':
      return renderButtonSkeleton();
    default:
      return renderTextSkeleton();
  }
};

export const ProgressIndicator = ({ 
  progress = 0, 
  message = null, 
  showPercentage = true,
  className = "" 
}) => (
  <div className={`progress-container ${className}`} role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
    <div className="progress-bar">
      <div 
        className="progress-fill"
        style={{ width: `${progress}%` }}
      />
    </div>
    <div className="progress-info">
      {message && <span className="progress-message">{message}</span>}
      {showPercentage && <span className="progress-percentage">{Math.round(progress)}%</span>}
    </div>
  </div>
);

export const PulseDot = ({ 
  color = "primary", 
  size = "small",
  className = "" 
}) => (
  <div className={`pulse-dot ${color} ${size} ${className}`}>
    <div className="pulse-ring"></div>
    <div className="pulse-center"></div>
  </div>
);

export const TypingIndicator = ({ 
  message = "Loading", 
  className = "" 
}) => (
  <div className={`typing-indicator ${className}`}>
    <span className="typing-message">{message}</span>
    <div className="typing-dots">
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
    </div>
  </div>
);

export const LoadingOverlay = ({ 
  isVisible = false, 
  message = "Loading...", 
  progress = null,
  onCancel = null,
  className = "" 
}) => {
  if (!isVisible) return null;

  return (
    <div className={`loading-overlay ${className}`} role="dialog" aria-modal="true" aria-label="Loading">
      <div className="overlay-background" />
      <div className="overlay-content">
        <LoadingSpinner size="large" message={message} />
        {progress !== null && (
          <ProgressIndicator progress={progress} showPercentage={true} />
        )}
        {onCancel && (
          <button 
            className="cancel-button"
            onClick={onCancel}
            aria-label="Cancel loading"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

// Page-specific loading components
export const TimelineLoadingSkeleton = () => (
  <div className="timeline-loading">
    {Array.from({ length: 5 }, (_, i) => (
      <div key={i} className="timeline-item-skeleton">
        <div className="timeline-date-skeleton"></div>
        <SkeletonLoader type="card" />
      </div>
    ))}
  </div>
);

export const DashboardLoadingSkeleton = () => (
  <div className="dashboard-loading">
    <div className="dashboard-header-skeleton">
      <SkeletonLoader type="text" lines={1} height="2em" />
      <SkeletonLoader type="button" width="120px" />
    </div>
    <div className="dashboard-stats-skeleton">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="stat-card-skeleton">
          <SkeletonLoader type="text" lines={2} />
        </div>
      ))}
    </div>
    <SkeletonLoader type="card" />
    <SkeletonLoader type="card" />
  </div>
);

export const UploadLoadingState = ({ 
  fileName = "", 
  progress = 0, 
  isProcessing = false 
}) => (
  <div className="upload-loading-state">
    <div className="upload-file-info">
      <div className="file-icon">📄</div>
      <div className="file-details">
        <div className="file-name">{fileName}</div>
        <div className="file-status">
          {isProcessing ? "Processing..." : "Uploading..."}
        </div>
      </div>
    </div>
    <ProgressIndicator 
      progress={progress} 
      showPercentage={true}
      className="upload-progress"
    />
    {isProcessing && <PulseDot color="success" size="small" />}
  </div>
);

export default {
  LoadingSpinner,
  SkeletonLoader,
  ProgressIndicator,
  PulseDot,
  TypingIndicator,
  LoadingOverlay,
  TimelineLoadingSkeleton,
  DashboardLoadingSkeleton,
  UploadLoadingState
};