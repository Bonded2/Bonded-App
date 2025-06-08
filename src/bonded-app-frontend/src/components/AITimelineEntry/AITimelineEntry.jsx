import React, { useState } from 'react';
import { TimelineTileWrapper } from '../TimelineTileWrapper';
import { Photo1 } from '../../icons/Photo1';
import { LocationOn2 } from '../../icons/LocationOn2';
import './style.css';

export const AITimelineEntry = ({
  entry,
  onClick,
  className = '',
  isAnimated = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!entry) return null;

  const {
    id,
    date,
    files = [],
    aiProcessed = false,
    metadata = {},
    createdAt
  } = entry;

  // Calculate stats from files
  const photoCount = files.length;
  const location = metadata.location || 'Unknown Location';
  const aiApprovalRate = files.length > 0 ? 
    `${Math.round((files.length / (files.length + (metadata.rejectedCount || 0))) * 100)}% AI Approved` : 
    'No files';

  // Get thumbnail from first file
  const thumbnailFile = files.find(file => 
    file.type && file.type.startsWith('image/')
  );
  
  const thumbnailUrl = thumbnailFile ? 
    (thumbnailFile.path || URL.createObjectURL(thumbnailFile)) : 
    '/images/ai-processed-placeholder.jpg';

  const handleClick = () => {
    if (onClick) {
      onClick(date, entry);
    }
  };

  const handleToggleExpanded = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  return (
    <div className={`ai-timeline-entry ${className} ${isAnimated ? 'animated' : ''}`}>
      {/* AI Processing Badge */}
      <div className="ai-badge">
        <span className="ai-icon">🤖</span>
        <span className="ai-text">AI Processed</span>
      </div>

      {/* Main Timeline Tile */}
      <TimelineTileWrapper
        className="ai-timeline-tile"
        timelineTileMaskGroup={thumbnailUrl}
        timelineTileText={aiApprovalRate}
        timelineTileText1={`${photoCount} Photos`}
        timelineTileText2={location}
        timelineTileIcon={<Photo1 className="ai-photo-icon" />}
        timelineTileMaskGroupClassName="ai-timeline-image"
        onClick={handleClick}
        date={formatDate(date)}
        source="auto_ai_scanner"
        uploadStatus="completed"
        evidenceCategory="relationship"
        evidenceType="ai_processed_media"
        aiVerified={true}
        processTimestamp={`AI Processed: ${formatTime(createdAt)}`}
      />

      {/* Expandable Details */}
      <div className="ai-entry-controls">
        <button 
          className="expand-button"
          onClick={handleToggleExpanded}
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
          <span className="expand-text">
            {isExpanded ? 'Hide Details' : 'Show AI Details'}
          </span>
        </button>
      </div>

      {/* Expanded Details Panel */}
      {isExpanded && (
        <div className="ai-details-panel">
          <div className="ai-details-header">
            <h4>AI Classification Results</h4>
            <span className="processing-time">
              Processed: {formatTime(createdAt)}
            </span>
          </div>

          <div className="ai-stats-grid">
            <div className="ai-stat-item">
              <span className="stat-icon">✅</span>
              <div className="stat-content">
                <span className="stat-value">{files.length}</span>
                <span className="stat-label">Approved Files</span>
              </div>
            </div>

            <div className="ai-stat-item">
              <span className="stat-icon">❌</span>
              <div className="stat-content">
                <span className="stat-value">{metadata.rejectedCount || 0}</span>
                <span className="stat-label">Filtered Files</span>
              </div>
            </div>

            <div className="ai-stat-item">
              <span className="stat-icon">🎯</span>
              <div className="stat-content">
                <span className="stat-value">
                  {Math.round((files.length / (files.length + (metadata.rejectedCount || 0))) * 100)}%
                </span>
                <span className="stat-label">Approval Rate</span>
              </div>
            </div>

            <div className="ai-stat-item">
              <span className="stat-icon">⚡</span>
              <div className="stat-content">
                <span className="stat-value">{metadata.fileCount || files.length}</span>
                <span className="stat-label">Total Scanned</span>
              </div>
            </div>
          </div>

          {/* File List Preview */}
          {files.length > 0 && (
            <div className="ai-files-preview">
              <h5>Approved Files ({files.length})</h5>
              <div className="files-grid">
                {files.slice(0, 6).map((file, index) => (
                  <div key={index} className="file-preview">
                    {file.type && file.type.startsWith('image/') ? (
                      <div className="file-thumbnail">
                        <img 
                          src={file.path || URL.createObjectURL(file)} 
                          alt={file.name}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className="file-placeholder" style={{ display: 'none' }}>
                          📷
                        </div>
                      </div>
                    ) : (
                      <div className="file-placeholder">
                        📄
                      </div>
                    )}
                    <span className="file-name" title={file.name}>
                      {file.name ? file.name.substring(0, 12) + '...' : `File ${index + 1}`}
                    </span>
                  </div>
                ))}
                {files.length > 6 && (
                  <div className="file-preview more-files">
                    <div className="file-placeholder">
                      +{files.length - 6}
                    </div>
                    <span className="file-name">More files</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Processing Metadata */}
          <div className="ai-metadata">
            <div className="metadata-row">
              <span className="metadata-label">Source:</span>
              <span className="metadata-value">Automatic Gallery Scan</span>
            </div>
            <div className="metadata-row">
              <span className="metadata-label">Scan ID:</span>
              <span className="metadata-value">{id}</span>
            </div>
            <div className="metadata-row">
              <span className="metadata-label">Date Range:</span>
              <span className="metadata-value">{formatDate(date)}</span>
            </div>
            {metadata.scanTimestamp && (
              <div className="metadata-row">
                <span className="metadata-label">Scan Time:</span>
                <span className="metadata-value">{formatTime(metadata.scanTimestamp)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 