import React from 'react';
import './LoadingSkeleton.css';

/**
 * Optimized Loading Skeleton Component
 * Provides immediate visual feedback while content loads
 */
export const LoadingSkeleton = ({ 
  type = 'text',
  lines = 3,
  width = '100%',
  height = '16px',
  className = '',
  animate = true 
}) => {
  const baseClass = `loading-skeleton ${animate ? 'animate' : ''} ${className}`;
  
  if (type === 'text') {
    return (
      <div className="loading-skeleton-container">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={baseClass}
            style={{
              width: index === lines - 1 ? '70%' : width,
              height,
              marginBottom: '8px'
            }}
          />
        ))}
      </div>
    );
  }
  
  if (type === 'card') {
    return (
      <div className="loading-skeleton-card">
        <div className={`${baseClass} skeleton-header`} style={{ height: '60px', marginBottom: '16px' }} />
        <div className={baseClass} style={{ width: '80%', height: '16px', marginBottom: '8px' }} />
        <div className={baseClass} style={{ width: '60%', height: '16px', marginBottom: '8px' }} />
        <div className={baseClass} style={{ width: '40%', height: '16px' }} />
      </div>
    );
  }
  
  if (type === 'button') {
    return (
      <div className={`${baseClass} skeleton-button`} style={{ width, height: '40px' }} />
    );
  }
  
  if (type === 'avatar') {
    return (
      <div className={`${baseClass} skeleton-avatar`} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
    );
  }
  
  return (
    <div className={baseClass} style={{ width, height }} />
  );
};

/**
 * Timeline Loading Skeleton
 */
export const TimelineLoadingSkeleton = () => (
  <div className="timeline-skeleton">
    {Array.from({ length: 3 }).map((_, index) => (
      <div key={index} className="timeline-item-skeleton">
        <LoadingSkeleton type="avatar" />
        <div className="timeline-content-skeleton">
          <LoadingSkeleton type="text" lines={2} />
          <LoadingSkeleton width="120px" height="12px" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Settings Loading Skeleton
 */
export const SettingsLoadingSkeleton = () => (
  <div className="settings-skeleton">
    <LoadingSkeleton type="text" lines={1} height="24px" width="200px" />
    <div style={{ marginTop: '24px' }}>
      <LoadingSkeleton type="card" />
    </div>
    <div style={{ marginTop: '16px' }}>
      <LoadingSkeleton type="card" />
    </div>
  </div>
);

export default LoadingSkeleton;