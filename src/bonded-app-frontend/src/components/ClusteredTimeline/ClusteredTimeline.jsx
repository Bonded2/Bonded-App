/**
 * Clustered Timeline Component
 * 
 * Displays NSFW-filtered timeline entries grouped by date
 * Shows cards with images and text content that passed AI filtering
 */
import React, { useState, useEffect } from 'react';
import { timelineService } from '../../services/timelineService.js';
import { TimelineTile } from '../TimelineTile/TimelineTile.jsx';
import './style.css';

const ClusteredTimeline = () => {
  const [clusteredData, setClusteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedDates, setExpandedDates] = useState(new Set());

  useEffect(() => {
    loadClusteredTimeline();
  }, []);

  const loadClusteredTimeline = async () => {
    try {
      setLoading(true);
      const clusters = await timelineService.getClusteredTimeline();
      setClusteredData(clusters);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDateExpansion = (date) => {
    const newExpanded = new Set(expandedDates);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDates(newExpanded);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUploadStatusIcon = (status) => {
    switch (status) {
      case 'uploaded':
        return '☁️';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '📱';
    }
  };

  const renderEntryCard = (entry, index) => {
    const isImage = entry.type === 'photo' || (entry.content && (entry.content.file || entry.content.photo));
    const isText = entry.type === 'text' || entry.type === 'message' || (entry.content && entry.content.text);
    
    return (
      <div key={entry.id || index} className="timeline-entry-card">
        <div className="entry-header">
          <div className="entry-time">
            {new Date(entry.timestamp).toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="entry-status">
            {getUploadStatusIcon(entry.uploadStatus)}
          </div>
        </div>

        <div className="entry-content">
          {/* Image content */}
          {isImage && entry.content && (
            <div className="entry-image">
              {entry.content.file && (
                <img 
                  src={URL.createObjectURL(entry.content.file)} 
                  alt="AI Filtered Evidence"
                  loading="lazy"
                  onLoad={(e) => {
                    // Clean up blob URL after loading
                    setTimeout(() => {
                      URL.revokeObjectURL(e.target.src);
                    }, 1000);
                  }}
                />
              )}
              {entry.metadata && entry.metadata.extractedText && (
                <div className="extracted-text">
                  <small>📝 Text found: {entry.metadata.extractedText.substring(0, 50)}...</small>
                </div>
              )}
            </div>
          )}

          {/* Text content */}
          {isText && entry.content && entry.content.text && (
            <div className="entry-text">
              <p>{entry.content.text}</p>
            </div>
          )}

          {/* AI Processing info */}
          {entry.metadata && entry.metadata.aiProcessed && (
            <div className="ai-processed-badge">
              <span className="ai-icon">🤖</span>
              <span>AI Filtered</span>
              {entry.metadata.processingTime && (
                <span className="processing-time">
                  ({Math.round(entry.metadata.processingTime)}ms)
                </span>
              )}
            </div>
          )}

          {/* NSFW Filter badge */}
          {entry.metadata && entry.metadata.nsfwFiltered && (
            <div className="nsfw-filtered-badge">
              <span className="filter-icon">🔒</span>
              <span>NSFW Safe</span>
            </div>
          )}

          {/* File info */}
          {entry.content && entry.content.filename && (
            <div className="file-info">
              <small>📎 {entry.content.filename}</small>
              {entry.content.size && (
                <small> • {(entry.content.size / 1024 / 1024).toFixed(1)}MB</small>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="clustered-timeline loading">
        <div className="loading-spinner">Loading timeline...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="clustered-timeline error">
        <div className="error-message">
          Failed to load timeline: {error}
          <button onClick={loadClusteredTimeline}>Retry</button>
        </div>
      </div>
    );
  }

  if (clusteredData.length === 0) {
    return (
      <div className="clustered-timeline empty">
        <div className="empty-message">
          <h3>No evidence found</h3>
          <p>Start scanning to add NSFW-filtered content to your timeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clustered-timeline">
      <div className="timeline-header">
        <h2>Filtered Evidence Timeline</h2>
        <p>Content that passed AI NSFW filtering</p>
      </div>

      {clusteredData.map((cluster) => (
        <div key={cluster.date} className="date-cluster">
          <div 
            className="cluster-header"
            onClick={() => toggleDateExpansion(cluster.date)}
          >
            <div className="cluster-date">
              <h3>{formatDate(cluster.date)}</h3>
              <span className="cluster-stats">
                {cluster.totalItems} items • 
                {cluster.photoCount} photos • 
                {cluster.textCount} texts
              </span>
            </div>
            <div className="cluster-toggle">
              {expandedDates.has(cluster.date) ? '▼' : '▶'}
            </div>
          </div>

          {expandedDates.has(cluster.date) && (
            <div className="cluster-content">
              <div className="timeline-entries">
                {cluster.entries.map(renderEntryCard)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ClusteredTimeline;