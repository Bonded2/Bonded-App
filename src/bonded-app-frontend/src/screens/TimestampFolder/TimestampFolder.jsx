import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MediaScanner } from "../../components/MediaScanner";
import { InfoModal } from "../../components/InfoModal";
import { DeleteModal } from "../../components/DeleteModal";
import "./style.css";
// LocalStorage keys - same as in TimelineCreated
const TIMELINE_DATA_KEY = 'bonded_timeline_data';
const TIMESTAMP_CONTENT_KEY = 'bonded_timestamp_content';
// Evidence categories for immigration verification
const EVIDENCE_CATEGORIES = {
  RELATIONSHIP: "relationship",
  FINANCIAL: "financial",
  LANGUAGE: "language",
  RESIDENCY: "residency",
  TRAVEL: "travel",
  DOCUMENT: "document"
};
export const TimestampFolder = ({ onClose, date: propDate }) => {
  const navigate = useNavigate();
  const { date: paramDate } = useParams();
  const [showMediaScannerModal, setShowMediaScannerModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImportSuccess, setShowImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  // Use date from props or URL params, make sure to decode URL encoded date
  const date = propDate || (paramDate ? decodeURIComponent(paramDate) : null);
  // Load content items for this date from localStorage
  useEffect(() => {
    const loadContentItems = () => {
      setLoading(true);
      try {
        // Get all content from localStorage
        const allContent = JSON.parse(localStorage.getItem(TIMESTAMP_CONTENT_KEY) || '{}');
        // Get content specifically for this date
        if (allContent[date]) {
          setContentItems(allContent[date]);
        } else {
          // If no existing content for this date, create an empty array
          setContentItems([]);
        }
      } catch (err) {
        setContentItems([]);
      } finally {
        setLoading(false);
      }
    };
    if (date) {
      loadContentItems();
    }
  }, [date]);
  // Save content items whenever they change
  useEffect(() => {
    const saveContentItems = () => {
      if (!date || contentItems.length === 0) return;
      try {
        // Get all existing content
        const allContent = JSON.parse(localStorage.getItem(TIMESTAMP_CONTENT_KEY) || '{}');
        // Update content for this date
        allContent[date] = contentItems;
        // Save back to localStorage
        localStorage.setItem(TIMESTAMP_CONTENT_KEY, JSON.stringify(allContent));
        // Update timeline counts after saving
        updateTimelineItemCount();
      } catch (err) {
      }
    };
    saveContentItems();
  }, [contentItems, date]);
  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1); // Go back to the previous screen (likely TimelineCreated)
    }
  };
  const handlePreviewClick = (item) => {
    // Navigate to ImagePreview screen with the selected item ID
    navigate(`/image-preview/${item.id}`);
  };
  const handleInfoClick = (item) => {
    setSelectedItem(item);
    setShowInfoModal(true);
  };
  const handleDeleteClick = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };
  const handleConfirmDelete = (item) => {
    // Remove the item from contentItems
    setContentItems(contentItems.filter(i => i.id !== item.id));
    setShowDeleteModal(false);
  };
  const updateTimelineItemCount = () => {
    try {
      // Get timeline data
      const timelineData = JSON.parse(localStorage.getItem(TIMELINE_DATA_KEY) || '[]');
      // Find the entry for this date
      const entry = timelineData.find(item => item.date === date);
      if (entry) {
        // Update the counts based on content types
        const photoCount = contentItems.filter(item => item.type === 'photo' || item.type === 'image').length;
        const messageCount = contentItems.filter(item => item.type === 'message').length;
        const videoCount = contentItems.filter(item => item.type === 'video').length;
        const documentCount = contentItems.filter(item => item.type === 'document').length;
        // Update the counts
        entry.photos = photoCount;
        entry.messages = messageCount;
        // Update the evidence category based on majority content type
        if (documentCount > messageCount && documentCount > photoCount) {
          entry.evidenceCategory = EVIDENCE_CATEGORIES.DOCUMENT;
        } else if (messageCount > documentCount && messageCount > photoCount) {
          entry.evidenceCategory = EVIDENCE_CATEGORIES.LANGUAGE;
        } else {
          entry.evidenceCategory = EVIDENCE_CATEGORIES.RELATIONSHIP;
        }
        // Update the image if we have at least one photo
        if (photoCount > 0 && !entry.image) {
          const firstPhoto = contentItems.find(item => item.type === 'photo' || item.type === 'image');
          if (firstPhoto && firstPhoto.imageUrl) {
            entry.image = firstPhoto.imageUrl;
          }
        }
        // Save back to localStorage
        localStorage.setItem(TIMELINE_DATA_KEY, JSON.stringify(timelineData));
      }
    } catch (err) {
    }
  };
  const handleScanMedia = () => {
    setShowMediaScannerModal(true);
  };
  const handleMediaSelected = (selectedFiles, groupedByDate) => {
    // We're only interested in files for this specific date
    const filesForThisDate = selectedFiles.filter(file => {
      const fileDate = new Date(file.timestamp).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      return fileDate === date;
    });
    if (filesForThisDate.length === 0) {
      alert(`No files found for date: ${date}. Please select files from this exact date.`);
      return;
    }
    // Create content items from the selected files
    const newContentItems = filesForThisDate.map(file => {
      // Create object URL safely
      let fileImageUrl = null;
      try {
        if (file.file instanceof Blob) {
          fileImageUrl = URL.createObjectURL(file.file);
        } else {
        }
      } catch (err) {
      }
      return {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: getFileType(file.file?.type || "unknown"),
        name: file.name || "Unknown File",
        source: "Device Media",
        location: "Imported",
        date: date,
        imageUrl: fileImageUrl,
        timestamp: file.timestamp || Date.now(),
        size: file.size || 0,
        path: file.path || "Unknown",
        // Immigration verification specific fields
        evidenceCategory: determineEvidenceCategory(file.file?.type || "", file.name || ""),
        verified: false, // Default to unverified until processed
        officialDocument: isLikelyOfficialDocument(file.name || ""),
        metadata: {
          importDate: new Date().toISOString(),
          fileType: file.file?.type || "unknown"
        }
      };
    }).filter(item => item.imageUrl !== null); // Filter out items with failed URLs
    // Add new content items to the existing ones
    setContentItems(prevItems => [...prevItems, ...newContentItems]);
    // Close the scanner modal
    setShowMediaScannerModal(false);
    // Show success message
    setImportedCount(newContentItems.length);
    setShowImportSuccess(true);
    // Hide success message after 3 seconds
    setTimeout(() => {
      setShowImportSuccess(false);
    }, 3000);
    // Also update the timeline item count
    updateTimelineItemCount(newContentItems.length);
  };
  // Determine evidence category based on file type and name
  const determineEvidenceCategory = (mimeType, fileName) => {
    // Logic to determine category based on file name and type
    const lowerFileName = fileName.toLowerCase();
    if (lowerFileName.includes('passport') || lowerFileName.includes('visa') || 
        lowerFileName.includes('document') || lowerFileName.includes('certificate')) {
      return EVIDENCE_CATEGORIES.DOCUMENT;
    } else if (lowerFileName.includes('bank') || lowerFileName.includes('statement') || 
               lowerFileName.includes('invoice') || lowerFileName.includes('receipt')) {
      return EVIDENCE_CATEGORIES.FINANCIAL;
    } else if (lowerFileName.includes('chat') || lowerFileName.includes('message') || 
               lowerFileName.includes('letter') || lowerFileName.includes('email')) {
      return EVIDENCE_CATEGORIES.LANGUAGE;
    } else if (lowerFileName.includes('ticket') || lowerFileName.includes('boarding') || 
               lowerFileName.includes('travel')) {
      return EVIDENCE_CATEGORIES.TRAVEL;
    } else if (lowerFileName.includes('lease') || lowerFileName.includes('utility') || 
               lowerFileName.includes('address')) {
      return EVIDENCE_CATEGORIES.RESIDENCY;
    } else {
      return EVIDENCE_CATEGORIES.RELATIONSHIP;
    }
  };
  // Check if a file name suggests it's an official document
  const isLikelyOfficialDocument = (fileName) => {
    const officialTerms = ['passport', 'visa', 'certificate', 'license', 'official', 'government', 
                           'id', 'document', 'statement', 'record'];
    const lowerFileName = fileName.toLowerCase();
    return officialTerms.some(term => lowerFileName.includes(term));
  };
  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return 'photo';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('application/pdf')) {
      return 'document';
    } else {
      return 'file';
    }
  };
  const handleViewAllMedia = () => {
    // Show all media items
    setSelectedCategory('all');
  };
  const handleAddMedia = () => {
    // Open the media scanner
    setShowMediaScannerModal(true);
  };
  const handleFilterByCategory = (category) => {
    setSelectedCategory(category);
  };
  // Filter content items based on selected category
  const filteredItems = selectedCategory === 'all' 
    ? contentItems 
    : contentItems.filter(item => {
        if (selectedCategory === 'photos') return item.type === 'photo';
        if (selectedCategory === 'videos') return item.type === 'video';
        if (selectedCategory === 'documents') return item.type === 'document';
        if (selectedCategory === 'messages') return item.type === 'message';
        if (Object.values(EVIDENCE_CATEGORIES).includes(selectedCategory)) {
          return item.evidenceCategory === selectedCategory;
        }
        return true;
      });
  const renderIcon = (type) => {
    switch (type) {
      case 'photo':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 19V5C21 3.9 20.1 3 19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19ZM8.5 13.5L11 16.51L14.5 12L19 18H5L8.5 13.5Z" fill="#FFFFFF"/>
          </svg>
        );
      case 'message':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H6L4 18V4H20V16Z" fill="#FFFFFF"/>
          </svg>
        );
      case 'location':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="#FFFFFF"/>
          </svg>
        );
      case 'document':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM16 18H8V16H16V18ZM16 14H8V12H16V14ZM13 9V3.5L18.5 9H13Z" fill="#FFFFFF"/>
          </svg>
        );
      case 'video':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 10.5V7C17 6.45 16.55 6 16 6H4C3.45 6 3 6.45 3 7V17C3 17.55 3.45 18 4 18H16C16.55 18 17 17.55 17 17V13.5L21 17.5V6.5L17 10.5Z" fill="#FFFFFF"/>
          </svg>
        );
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 7H11V9H13V7ZM13 11H11V17H13V11ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#FFFFFF"/>
          </svg>
        );
    }
  };
  // Get item counts for display
  const photoCount = contentItems.filter(item => item.type === 'photo').length;
  const videoCount = contentItems.filter(item => item.type === 'video').length;
  const documentCount = contentItems.filter(item => item.type === 'document').length;
  const messageCount = contentItems.filter(item => item.type === 'message').length;
  const totalCount = contentItems.length;
  // Count by evidence category
  const evidenceCounts = Object.values(EVIDENCE_CATEGORIES).reduce((acc, category) => {
    acc[category] = contentItems.filter(item => item.evidenceCategory === category).length;
    return acc;
  }, {});
  return (
    <div className="timestamp-folder-screen">
      <div className="timestamp-folder-container">
        {/* Top app bar with arrow back */}
        <div className="top-app-bar">
          <div className="frame-14">
            <div className="back-icon" onClick={handleBack}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#FF704D"/>
              </svg>
            </div>
            <div className="header-title">{date || "Date not specified"}</div>
          </div>
          {/* Immigration verification status badge */}
          {contentItems.some(item => item.officialDocument) && (
            <div className="verification-status">
              <span className="status-indicator"></span>
              Official Documents Present
            </div>
          )}
        </div>
        {/* Import success notification */}
        {showImportSuccess && (
          <div className="import-success-notification">
            <p>✅ Successfully imported {importedCount} items for {date}</p>
          </div>
        )}
        {/* Evidence category filter chips */}
        {contentItems.length > 0 && (
          <div className="filter-chips">
            <div 
              className={`filter-chip ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterByCategory('all')}
            >
              All ({totalCount})
            </div>
            {photoCount > 0 && (
              <div 
                className={`filter-chip ${selectedCategory === 'photos' ? 'active' : ''}`}
                onClick={() => handleFilterByCategory('photos')}
              >
                Photos ({photoCount})
              </div>
            )}
            {documentCount > 0 && (
              <div 
                className={`filter-chip ${selectedCategory === 'documents' ? 'active' : ''}`}
                onClick={() => handleFilterByCategory('documents')}
              >
                Documents ({documentCount})
              </div>
            )}
            {messageCount > 0 && (
              <div 
                className={`filter-chip ${selectedCategory === 'messages' ? 'active' : ''}`}
                onClick={() => handleFilterByCategory('messages')}
              >
                Messages ({messageCount})
              </div>
            )}
            {videoCount > 0 && (
              <div 
                className={`filter-chip ${selectedCategory === 'videos' ? 'active' : ''}`}
                onClick={() => handleFilterByCategory('videos')}
              >
                Videos ({videoCount})
              </div>
            )}
            {/* Evidence category filters */}
            {Object.entries(evidenceCounts).map(([category, count]) => (
              count > 0 && (
                <div 
                  key={category}
                  className={`filter-chip category-${category} ${selectedCategory === category ? 'active' : ''}`}
                  onClick={() => handleFilterByCategory(category)}
                >
                  {category} ({count})
                </div>
              )
            ))}
          </div>
        )}
        {/* Content rows */}
        <div className="timestamp-content">
          {/* Media count summary card */}
          {contentItems.length > 0 && (
            <div className="media-summary-card">
              <h3>Immigration Evidence for {date}</h3>
              <div className="media-counts">
                {photoCount > 0 && (
                  <div className="count-item">
                    <span className="count-number">{photoCount}</span>
                    <span className="count-label">Photos</span>
                  </div>
                )}
                {videoCount > 0 && (
                  <div className="count-item">
                    <span className="count-number">{videoCount}</span>
                    <span className="count-label">Videos</span>
                  </div>
                )}
                {documentCount > 0 && (
                  <div className="count-item">
                    <span className="count-number">{documentCount}</span>
                    <span className="count-label">Documents</span>
                  </div>
                )}
                {messageCount > 0 && (
                  <div className="count-item">
                    <span className="count-number">{messageCount}</span>
                    <span className="count-label">Messages</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {loading ? (
            <div className="loading-indicator">
              <div className="loading-spinner"></div>
              <p>Loading content...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="empty-content">
              <p>No content {selectedCategory !== 'all' ? `for category "${selectedCategory}"` : 'available'} for this date</p>
              <p className="hint-text">Scan your media to add content</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div className={`content-row ${item.officialDocument ? 'official-document' : ''}`} key={item.id}>
                <div className="row-content">
                  <div className="item-icon">
                    {renderIcon(item.type)}
                  </div>
                  <div className="item-details">
                    <div className="item-name">{item.name}</div>
                    <div className="item-meta">
                      {item.size && <span className="item-size">{formatFileSize(item.size)}</span>}
                      <span className="item-source">{item.source}</span>
                      {item.location && <span className="item-location">{item.location}</span>}
                    </div>
                    {/* Evidence category badge */}
                    {item.evidenceCategory && (
                      <div className={`evidence-badge ${item.evidenceCategory}`}>
                        {item.evidenceCategory}
                      </div>
                    )}
                    {/* Official document indicator */}
                    {item.officialDocument && (
                      <div className="official-badge">
                        Official Document
                      </div>
                    )}
                  </div>
                </div>
                <div className="row-actions">
                  <div className="action-icon preview" onClick={() => handlePreviewClick(item)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z" fill="#B9FF46"/>
                    </svg>
                  </div>
                  <div className="action-icon info" onClick={() => handleInfoClick(item)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 17H13V11H11V17ZM11 9H13V7H11V9Z" fill="#B9FF46"/>
                    </svg>
                  </div>
                  <div className="action-icon delete" onClick={() => handleDeleteClick(item)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 9V19H8V9H16ZM14.5 3H9.5L8.5 4H5V6H19V4H15.5L14.5 3ZM18 7H6V19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7Z" fill="#FF704D"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))
          )}
          {/* Scan Media button */}
          <button className="upload-btn" onClick={handleScanMedia}>
            <div className="btn-text">Add Immigration Evidence</div>
          </button>
        </div>
        {/* Media Scanner Modal */}
        {showMediaScannerModal && (
          <div className="media-scanner-modal">
            <div className="media-scanner-container">
              <div className="media-scanner-header">
                <h2>Add Immigration Evidence for {date}</h2>
                <button className="close-button" onClick={() => setShowMediaScannerModal(false)}>×</button>
              </div>
              <MediaScanner onMediaSelected={handleMediaSelected} />
            </div>
          </div>
        )}
        {/* Info Modal */}
        {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} item={selectedItem} />}
        {/* Delete Modal */}
        {showDeleteModal && (
          <DeleteModal 
            onClose={() => setShowDeleteModal(false)} 
            onConfirm={() => handleConfirmDelete(selectedItem)}
            item={selectedItem} 
          />
        )}
      </div>
    </div>
  );
};
// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}; 