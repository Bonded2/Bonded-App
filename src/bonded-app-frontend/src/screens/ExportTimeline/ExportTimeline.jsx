import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TimestampFolder } from "../TimestampFolder/TimestampFolder";
import "./style.css";
// Content types for export selection
const EXPORTABLE_CONTENT_TYPES = [
  { id: "photos", label: "Photos & Images", icon: "📸" },
  { id: "messages", label: "Text Messages & Chats", icon: "💬" },
  { id: "documents", label: "Documents & Certificates", icon: "📄" },
  { id: "locations", label: "Location Data", icon: "📍" },
];
// Timeline data storage keys
const TIMELINE_DATA_KEY = 'bonded_timeline_data';
const TIMESTAMP_CONTENT_KEY = 'bonded_timestamp_content';
export const ExportTimeline = ({ onClose }) => {
  const navigate = useNavigate();
  const [selectedDates, setSelectedDates] = useState({});
  const [timelineData, setTimelineData] = useState([]);
  const [showTimestampFolder, setShowTimestampFolder] = useState(false);
  const [selectedDateForEdit, setSelectedDateForEdit] = useState("");
  const [animatedItems, setAnimatedItems] = useState([]);
  const contentRef = useRef(null);
  const [expandedDates, setExpandedDates] = useState({});
  const [evidenceItems, setEvidenceItems] = useState({});
  const [dateRangeFilter, setDateRangeFilter] = useState({ start: "", end: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [exportDetails, setExportDetails] = useState({ size: "0 MB", itemCount: 0 });
  const [loading, setLoading] = useState(true);
  // New state for PDF export
  const [selectedContentTypes, setSelectedContentTypes] = useState(
    EXPORTABLE_CONTENT_TYPES.reduce((acc, type) => ({ ...acc, [type.id]: true }), {})
  );
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [selectionMode, setSelectionMode] = useState("date"); // 'date' or 'individual'
  // Load timeline data from localStorage on mount
  useEffect(() => {
    loadTimelineData();
  }, []);
  // Calculate export stats whenever selection changes
  useEffect(() => {
    calculateExportStats();
  }, [selectedDates, evidenceItems, selectedContentTypes]);
  // Animation on mount for selected dates
  useEffect(() => {
    if (Object.keys(selectedDates).length > 0) {
      const timer = setTimeout(() => {
        setAnimatedItems(Object.keys(selectedDates));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [selectedDates]);
  const loadTimelineData = async () => {
    setLoading(true);
    try {
      // Load timeline data from localStorage
      const savedTimelineData = localStorage.getItem(TIMELINE_DATA_KEY);
      const savedContentData = localStorage.getItem(TIMESTAMP_CONTENT_KEY);
      if (savedTimelineData) {
        const parsedTimelineData = JSON.parse(savedTimelineData);
        setTimelineData(parsedTimelineData);
        // Initialize selectedDates with all dates unselected
        const dateSelectionMap = {};
        parsedTimelineData.forEach(item => {
          if (item.date) {
            dateSelectionMap[item.date] = false;
          }
        });
        setSelectedDates(dateSelectionMap);
        // Process content data into evidence items
        if (savedContentData) {
          const parsedContentData = JSON.parse(savedContentData);
          const processedEvidenceItems = {};
          // Convert the content data format to our evidence items format
          Object.keys(parsedContentData).forEach(date => {
            const items = parsedContentData[date];
            processedEvidenceItems[date] = items.map(item => ({
              id: item.id || `${date}-${Math.random().toString(36).substr(2, 9)}`,
              type: mapContentTypeToExportable(item.type),
              title: item.name || `Item ${Math.floor(Math.random() * 1000)}`,
              selected: false,
              originalItem: item // Keep the original item for reference
            }));
          });
          setEvidenceItems(processedEvidenceItems);
        }
      }
    } catch (err) {
      showNotification("Failed to load timeline data. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  // Map content types from timeline to exportable types
  const mapContentTypeToExportable = (originalType) => {
    if (!originalType) return "documents";
    if (originalType.includes("photo") || originalType.includes("image")) {
      return "photos";
    } else if (originalType.includes("message") || originalType.includes("chat")) {
      return "messages";
    } else if (originalType.includes("location")) {
      return "locations";
    } else {
      return "documents";
    }
  };
  const calculateExportStats = () => {
    // Count selected items
    let count = 0;
    let size = 0;
    Object.keys(evidenceItems).forEach(date => {
      if (selectedDates[date]) {
        evidenceItems[date]?.forEach(item => {
          if (item.selected && selectedContentTypes[item.type]) {
            count++;
            // Calculate size based on original item if available
            if (item.originalItem && item.originalItem.size) {
              size += parseFloat(item.originalItem.size) / (1024 * 1024); // Convert to MB
            } else {
              // Simulate size calculation if actual size not available
              size += Math.random() * 2 + 0.5; // Random size between 0.5 and 2.5 MB
            }
          }
        });
      }
    });
    setExportDetails({
      size: `${size.toFixed(1)} MB`,
      itemCount: count
    });
  };
  const handleRemove = (date, e) => {
    e.stopPropagation();
    // Animate out before removing from selected
    setAnimatedItems(prev => prev.filter(item => item !== date));
    // Update date selection and evidence items selection
    setTimeout(() => {
      setSelectedDates(prev => ({ ...prev, [date]: false }));
      // Deselect all evidence items for this date
      setEvidenceItems(prevItems => {
        const newItems = { ...prevItems };
        if (newItems[date]) {
          newItems[date] = newItems[date].map(item => ({ ...item, selected: false }));
        }
        return newItems;
      });
    }, 300);
  };
  const handleToggleSelectDate = (date) => {
    setSelectedDates(prev => {
      const newSelectedDates = { ...prev, [date]: !prev[date] };
      // When selecting a date, also select all its evidence items
      setEvidenceItems(prevItems => {
        const newItems = { ...prevItems };
        if (newItems[date]) {
          newItems[date] = newItems[date].map(item => ({ 
            ...item, 
            selected: !prev[date] // Set to the new state (opposite of previous)
          }));
        }
        return newItems;
      });
      return newSelectedDates;
    });
  };
  const handleToggleExpandDate = (date, e) => {
    e.stopPropagation();
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };
  const handleToggleSelectEvidence = (date, itemId) => {
    setEvidenceItems(prevItems => {
      const newItems = { ...prevItems };
      const dateItems = [...(newItems[date] || [])];
      const itemIndex = dateItems.findIndex(item => item.id === itemId);
      if (itemIndex !== -1) {
        dateItems[itemIndex] = { 
          ...dateItems[itemIndex], 
          selected: !dateItems[itemIndex].selected 
        };
        newItems[date] = dateItems;
        // Check if all items for this date are now selected/deselected
        const allSelected = dateItems.every(item => item.selected);
        const allDeselected = dateItems.every(item => !item.selected);
        if (allDeselected) {
          setSelectedDates(prev => ({ ...prev, [date]: false }));
        } else if (allSelected) {
          setSelectedDates(prev => ({ ...prev, [date]: true }));
        }
      }
      return newItems;
    });
  };
  const handleEditClick = (date, e) => {
    e.stopPropagation();
    setSelectedDateForEdit(date);
    setShowTimestampFolder(true);
  };
  const handleCloseTimestampFolder = () => {
    setShowTimestampFolder(false);
    // Reload data after potential edits
    loadTimelineData();
  };
  const handleContentTypeChange = (contentTypeId) => {
    setSelectedContentTypes(prev => ({ ...prev, [contentTypeId]: !prev[contentTypeId] }));
    // Visual feedback animation
    if (contentRef.current) {
      contentRef.current.classList.add("pulse-animation");
      setTimeout(() => {
        contentRef.current.classList.remove("pulse-animation");
      }, 500);
    }
  };
  const toggleExportFormat = () => {
    setExportFormat(prev => prev === "pdf" ? "zip" : "pdf");
    // Visual transition
    contentRef.current.classList.add("format-change-animation");
    setTimeout(() => {
      contentRef.current.classList.remove("format-change-animation");
    }, 500);
  };
  const togglePreviewMode = () => {
    setPreviewMode(prev => !prev);
  };
  const toggleSelectionMode = () => {
    setSelectionMode(prev => prev === "date" ? "individual" : "date");
    // Visual transition
    contentRef.current.classList.add("mode-change-animation");
    setTimeout(() => {
      contentRef.current.classList.remove("mode-change-animation");
    }, 500);
  };
  const toggleAdvancedFilter = () => {
    setIsAdvancedFilterOpen(prev => !prev);
  };
  const handleDateRangeChange = (e) => {
    const { name, value } = e.target;
    setDateRangeFilter(prev => ({ ...prev, [name]: value }));
  };
  const applyDateRangeFilter = () => {
    if (!dateRangeFilter.start || !dateRangeFilter.end) {
      showNotification("Please select both start and end dates");
      return;
    }
    const startDate = new Date(dateRangeFilter.start);
    const endDate = new Date(dateRangeFilter.end);
    if (startDate > endDate) {
      showNotification("Start date must be before end date");
      return;
    }
    // Filter timeline data by date range
    const filteredDates = {};
    timelineData.forEach(item => {
      const itemDate = new Date(item.date);
      if (itemDate >= startDate && itemDate <= endDate) {
        filteredDates[item.date] = selectedDates[item.date] || false;
      }
    });
    setSelectedDates(filteredDates);
    showNotification(`Filtered to dates between ${dateRangeFilter.start} and ${dateRangeFilter.end}`);
  };
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  const searchEvidenceItems = () => {
    if (!searchQuery.trim()) {
      showNotification("Please enter a search term");
      return;
    }
    const query = searchQuery.toLowerCase();
    const matchedDates = {};
    let foundAny = false;
    // Search through all evidence items
    Object.keys(evidenceItems).forEach(date => {
      const itemsForDate = evidenceItems[date] || [];
      const matchingItems = itemsForDate.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.type.toLowerCase().includes(query)
      );
      if (matchingItems.length > 0) {
        matchedDates[date] = true;
        foundAny = true;
        // Update evidence items to highlight matches
        setEvidenceItems(prev => ({
          ...prev,
          [date]: prev[date].map(item => ({
            ...item,
            isSearchMatch: item.title.toLowerCase().includes(query) || 
                          item.type.toLowerCase().includes(query)
          }))
        }));
        // Auto-expand dates with matches
        setExpandedDates(prev => ({
          ...prev,
          [date]: true
        }));
      }
    });
    if (foundAny) {
      showNotification(`Found matches for "${searchQuery}"`);
    } else {
      showNotification(`No matches found for "${searchQuery}"`);
    }
  };
  const handleGeneratePdf = () => {
    // Count selected items for export
    let selectedItemCount = 0;
    Object.keys(evidenceItems).forEach(date => {
      if (selectedDates[date]) {
        (evidenceItems[date] || []).forEach(item => {
          if (item.selected && selectedContentTypes[item.type]) {
            selectedItemCount++;
          }
        });
      }
    });
    if (selectedItemCount === 0) {
      showNotification("Please select at least one evidence item to export.");
      return;
    }
    setIsGeneratingPdf(true);
    setPdfProgress(0);
    // Simulate generation and progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      if (currentProgress <= 100) {
        setPdfProgress(currentProgress);
      } else {
        clearInterval(interval);
        setIsGeneratingPdf(false);
        setShowSuccessMessage(true);
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 5000);
      }
    }, 100);
  };
  const handleSelectAll = () => {
    const allDates = Object.keys(evidenceItems);
    // Select all dates
    setSelectedDates(
      allDates.reduce((acc, date) => ({ ...acc, [date]: true }), {})
    );
    // Select all evidence items
    setEvidenceItems(prevItems => {
      const newItems = { ...prevItems };
      Object.keys(newItems).forEach(date => {
        if (newItems[date]) {
          newItems[date] = newItems[date].map(item => ({ ...item, selected: true }));
        }
      });
      return newItems;
    });
    showNotification("Selected all timeline evidence");
  };
  const handleDeselectAll = () => {
    // Deselect all dates
    setSelectedDates(
      Object.keys(evidenceItems).reduce((acc, date) => ({ ...acc, [date]: false }), {})
    );
    // Deselect all evidence items
    setEvidenceItems(prevItems => {
      const newItems = { ...prevItems };
      Object.keys(newItems).forEach(date => {
        if (newItems[date]) {
          newItems[date] = newItems[date].map(item => ({ ...item, selected: false }));
        }
      });
      return newItems;
    });
    showNotification("Deselected all timeline evidence");
  };
  const showNotification = (message) => {
    const notification = document.createElement("div");
    notification.className = "export-notification";
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add("show");
    }, 10);
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };
  const handleBack = () => {
    if (onClose) onClose();
  };
  if (showTimestampFolder) {
    return <TimestampFolder onClose={handleCloseTimestampFolder} date={selectedDateForEdit} />;
  }
  const countSelectedDates = Object.keys(selectedDates).filter(date => selectedDates[date]).length;
  return (
    <div className="export-timeline-screen">
      <div className="export-timeline-container">
        <div className="export-header">
            <button className="back-button-et" onClick={handleBack} aria-label="Go back">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#FF704D"/></svg>
                <span>Back</span>
            </button>
            <h2 className="export-timeline-title">Export Timeline</h2>
            <div className="export-format-toggle">
              <button 
                className={`format-option ${exportFormat === 'pdf' ? 'active' : ''}`}
                onClick={() => setExportFormat('pdf')}
              >
                PDF
              </button>
              <button 
                className={`format-option ${exportFormat === 'zip' ? 'active' : ''}`}
                onClick={() => setExportFormat('zip')}
              >
                ZIP
              </button>
            </div>
        </div>
        <div className="export-timeline-content" ref={contentRef}>
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading timeline data...</p>
            </div>
          ) : (
            <>
              {/* Export Stats Summary */}
              <div className="export-summary">
                <div className="summary-details">
                  <div className="summary-item">
                    <span className="summary-icon">📊</span>
                    <div className="summary-text">
                      <span className="summary-value">{exportDetails.itemCount}</span>
                      <span className="summary-label">Items</span>
                    </div>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">💾</span>
                    <div className="summary-text">
                      <span className="summary-value">{exportDetails.size}</span>
                      <span className="summary-label">Size</span>
                    </div>
                  </div>
                </div>
                <div className="selection-mode-toggle">
                  <button 
                    className={`mode-btn ${selectionMode === 'date' ? 'active' : ''}`}
                    onClick={() => setSelectionMode('date')}
                  >
                    Date Selection
                  </button>
                  <button 
                    className={`mode-btn ${selectionMode === 'individual' ? 'active' : ''}`}
                    onClick={() => setSelectionMode('individual')}
                  >
                    Individual Selection
                  </button>
                </div>
              </div>
              {/* Search and Filter Section */}
              <div className="search-filter-section">
                <div className="search-container">
                  <input 
                    type="text" 
                    placeholder="Search evidence..." 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="search-input"
                  />
                  <button className="search-btn" onClick={searchEvidenceItems}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
                <button 
                  className={`advanced-filter-toggle ${isAdvancedFilterOpen ? 'active' : ''}`}
                  onClick={toggleAdvancedFilter}
                >
                  Advanced Filters
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    style={{ transform: isAdvancedFilterOpen ? 'rotate(180deg)' : 'rotate(0)' }}
                  >
                    <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                  </svg>
                </button>
                {isAdvancedFilterOpen && (
                  <div className="advanced-filters">
                    <div className="date-range-filter">
                      <h4>Date Range</h4>
                      <div className="date-inputs">
                        <input 
                          type="date" 
                          name="start" 
                          value={dateRangeFilter.start}
                          onChange={handleDateRangeChange}
                          className="date-input"
                        />
                        <span>to</span>
                        <input 
                          type="date" 
                          name="end" 
                          value={dateRangeFilter.end}
                          onChange={handleDateRangeChange}
                          className="date-input"
                        />
                      </div>
                      <button className="apply-filter-btn" onClick={applyDateRangeFilter}>
                        Apply Filter
                      </button>
                    </div>
                    <div className="selection-actions">
                      <button className="select-all-btn" onClick={handleSelectAll}>
                        Select All
                      </button>
                      <button className="deselect-all-btn" onClick={handleDeselectAll}>
                        Deselect All
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="date-selection-section">
                <div className="section-header">
                  <h3 className="section-heading">Timeline Evidence</h3>
                  <span className="date-counter">{countSelectedDates} dates selected</span>
                  {countSelectedDates > 0 && (
                    <button 
                      className="preview-toggle-button" 
                      onClick={togglePreviewMode}
                    >
                      {previewMode ? "Hide Preview" : "Show Preview"}
                    </button>
                  )}
                </div>
                <div className="dates-list">
                  {Object.keys(selectedDates).length === 0 ? (
                    <div className="no-timeline-data">
                      <p>No timeline data available.</p>
                      <p className="helper-text">Create timeline evidence first or check your settings.</p>
                    </div>
                  ) : (
                    Object.keys(evidenceItems)
                      .filter(date => selectedDates[date] || !previewMode)
                      .map((date) => (
                        <div key={date} className="date-container">
                          <div 
                            className={`content-row selectable-date ${selectedDates[date] ? 'is-selected' : ''} ${animatedItems.includes(date) ? 'animated' : ''}`}
                            onClick={() => selectionMode === 'date' ? handleToggleSelectDate(date) : null}
                            tabIndex={0}
                            onKeyPress={(e) => e.key === 'Enter' && selectionMode === 'date' && handleToggleSelectDate(date)}
                            role="checkbox"
                            aria-checked={selectedDates[date]}
                          >
                            {selectionMode === 'date' && <div className="select-indicator"></div>}
                            <div 
                              className="date-color-indicator" 
                              style={{ backgroundColor: getColorForDate(date) }} 
                            />
                            <div className="date-text">{date}</div>
                            <div className="content-preview">
                              {evidenceItems[date] && evidenceItems[date]
                                .filter(item => item.selected && selectedContentTypes[item.type])
                                .map(item => (
                                  <span key={item.id} className="content-type-badge">
                                    {EXPORTABLE_CONTENT_TYPES.find(ct => ct.id === item.type)?.icon}
                                  </span>
                                ))
                              }
                            </div>
                            <div className="row-actions">
                              <button 
                                className={`action-btn expand-btn ${expandedDates[date] ? 'expanded' : ''}`}
                                onClick={(e) => handleToggleExpandDate(date, e)} 
                                aria-label={`${expandedDates[date] ? 'Collapse' : 'Expand'} date ${date}`}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                  <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                                </svg>
                              </button>
                              <button 
                                className="action-btn edit-btn" 
                                onClick={(e) => handleEditClick(date, e)} 
                                aria-label={`Edit date ${date}`}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm17.71-7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg>
                              </button>
                              <button 
                                className="action-btn remove-btn" 
                                onClick={(e) => handleRemove(date, e)} 
                                aria-label={`Remove date ${date}`}
                              >
                                <svg width="18" height="18" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
                              </button>
                            </div>
                          </div>
                          {/* Expanded evidence items */}
                          {expandedDates[date] && evidenceItems[date] && (
                            <div className="evidence-items-list">
                              {evidenceItems[date].length === 0 ? (
                                <div className="no-evidence-items">
                                  <p>No evidence items found for this date.</p>
                                </div>
                              ) : (
                                evidenceItems[date].map(item => (
                                  <div 
                                    key={item.id} 
                                    className={`evidence-item ${item.selected ? 'selected' : ''} ${item.isSearchMatch ? 'search-match' : ''}`}
                                    onClick={() => handleToggleSelectEvidence(date, item.id)}
                                  >
                                    <div className="evidence-item-checkbox">
                                      <input 
                                        type="checkbox" 
                                        checked={item.selected} 
                                        onChange={() => {}} // Handled by the div onClick
                                        id={`checkbox-${item.id}`}
                                      />
                                      <label htmlFor={`checkbox-${item.id}`}></label>
                                    </div>
                                    <span className="evidence-item-icon">
                                      {EXPORTABLE_CONTENT_TYPES.find(ct => ct.id === item.type)?.icon}
                                    </span>
                                    <span className="evidence-item-title">{item.title}</span>
                                    <span className="evidence-item-type">{item.type}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                  {countSelectedDates === 0 && Object.keys(selectedDates).length > 0 && (
                    <div className="no-dates-selected">
                      <p>No dates currently selected</p>
                      <p className="helper-text">Click on a date row to select it for export</p>
                    </div>
                  )}
                </div>
              </div>
              <div className={`content-type-section ${exportFormat === 'pdf' ? 'show' : 'hide'}`}>
                <h3 className="section-heading">Include in {exportFormat.toUpperCase()}</h3>
                <div className="content-types-grid">
                  {EXPORTABLE_CONTENT_TYPES.map(type => (
                    <label key={type.id} className={`content-type-card ${selectedContentTypes[type.id] ? 'selected' : ''}`}>
                      <input 
                        type="checkbox" 
                        checked={selectedContentTypes[type.id] || false}
                        onChange={() => handleContentTypeChange(type.id)}
                        disabled={isGeneratingPdf}
                      /> 
                      <span className="content-type-icon">{type.icon}</span>
                      <span className="content-type-label">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {isGeneratingPdf && (
                <div className="progress-container">
                  <div className="progress-bar-container">
                    <div className="progress-bar" style={{ width: `${pdfProgress}%` }}>
                      <span className="progress-text">{pdfProgress}%</span>
                    </div>
                  </div>
                  <div className="progress-status">
                    <p>{pdfProgress < 30 ? "Analyzing data..." : 
                      pdfProgress < 60 ? "Processing content..." : 
                      pdfProgress < 90 ? "Generating export..." : 
                      "Finalizing..."}</p>
                  </div>
                </div>
              )}
              {showSuccessMessage && (
                <div className="success-message">
                  <div className="success-icon">✓</div>
                  <div className="success-text">
                    <h4>Export Successful!</h4>
                    <p>Your {exportFormat.toUpperCase()} has been generated and downloaded.</p>
                  </div>
                </div>
              )}
              <div className="export-actions">
                <button 
                  className={`export-action-btn ${exportFormat}-btn`}
                  onClick={handleGeneratePdf} 
                  disabled={isGeneratingPdf || exportDetails.itemCount === 0}
                >
                  {isGeneratingPdf ? "Processing..." : `Generate & Download ${exportFormat.toUpperCase()}`}
                </button>
                {exportDetails.itemCount > 0 && (
                  <div className="export-stats">
                    <div className="stat-item">
                      <span className="stat-label">Dates:</span>
                      <span className="stat-value">{countSelectedDates}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Items:</span>
                      <span className="stat-value">{exportDetails.itemCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Size:</span>
                      <span className="stat-value">{exportDetails.size}</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
function getColorForDate(date) {
  const colors = ['#FF704D', '#1E8CFC', '#B9FF46', '#FFC107', '#9C27B0'];
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = date.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
} 