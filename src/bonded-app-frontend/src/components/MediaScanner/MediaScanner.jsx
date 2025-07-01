import React, { useState, useEffect } from "react";
import "./style.css";
/**
 * MediaScanner component that uses the File System Access API to scan folders for media files
 * and integrate them with the Timeline
 */
export const MediaScanner = ({ onMediaSelected }) => {
  const [isSupported, setIsSupported] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedFiles, setScannedFiles] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [isChromeOnAndroid, setIsChromeOnAndroid] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [dateGroups, setDateGroups] = useState({});
  const [selectAllMode, setSelectAllMode] = useState(false);
  // Check if File System Access API and required features are available
  useEffect(() => {
    const checkSupport = () => {
      // Check if running on Android Chrome
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isChrome = /Chrome/i.test(navigator.userAgent) && !/Edge|Edg/i.test(navigator.userAgent);
      setIsChromeOnAndroid(isAndroid && isChrome);
      // Check if File System Access API is supported
      if ('showDirectoryPicker' in window) {
        setIsSupported(true);
      } else {
        setIsSupported(false);
        setError("Your browser doesn't support the File System Access API");
      }
    };
    checkSupport();
  }, []);
  /**
   * Extract accurate timestamp from a file
   * This is a placeholder for more advanced timestamp extraction
   * In a production app, this would use EXIF data for images, metadata for videos, etc.
   */
  const extractAccurateTimestamp = async (file) => {
    try {
      // For now, we'll use lastModified as the fallback
      let timestamp = file.lastModified;
      // Simple check for image files that might have EXIF data
      if (file.type.startsWith('image/')) {
        // In a real implementation, we would use a library like exif-js 
        // to extract the original capture date
        // For now, we'll use lastModified but note where we'd add that code
        // Placeholder for EXIF extraction:
        // const exifData = await extractExifData(file);
        // if (exifData && exifData.DateTimeOriginal) {
        //   timestamp = new Date(exifData.DateTimeOriginal).getTime();
        // }
      }
      // Validate timestamp - if it's in the future or too far in the past, use current time
      const now = Date.now();
      if (timestamp > now || timestamp < now - (10 * 365 * 24 * 60 * 60 * 1000)) { // More than 10 years old
        timestamp = now;
      }
      return timestamp;
    } catch (error) {
      return file.lastModified; // Fallback to lastModified
    }
  };
  /**
   * Function to recursively traverse directory and collect media files
   * @param {FileSystemDirectoryHandle} directoryHandle - Directory handle to scan
   */
  const scanDirectory = async (directoryHandle) => {
    const mediaFiles = [];
    let totalProcessed = 0;
    let totalItems = 0;
    // First count total items to track progress
    const countItems = async (dirHandle) => {
      let count = 0;
      for await (const entry of dirHandle.values()) {
        count++;
        if (entry.kind === 'directory') {
          count += await countItems(entry);
        }
      }
      return count;
    };
    try {
      totalItems = await countItems(directoryHandle);
      setStatus(`Found ${totalItems} items to process. Starting scan...`);
    } catch (error) {
      // Continue with the scan even if counting fails
      setStatus("Starting scan... (unable to calculate total items)");
    }
    // Function to process each entry in the directory
    const processDirectory = async (dirHandle, path = "") => {
      // Update status with current path being scanned
      setStatus(`Scanning: ${path || dirHandle.name}`);
      for await (const entry of dirHandle.values()) {
        totalProcessed++;
        // Update progress percentage
        if (totalItems > 0) {
          const progressPercent = Math.round((totalProcessed / totalItems) * 100);
          setScanProgress(progressPercent);
        }
        const entryPath = path ? `${path}/${entry.name}` : entry.name;
        if (entry.kind === 'file') {
          // Check if the file has a media extension we're looking for
          if (/\.(jpe?g|png|pdf|heic|gif|mp4|mov)$/i.test(entry.name)) {
            try {
              const file = await entry.getFile();
              // Extract accurate timestamp - properly handle file date/time
              const timestamp = await extractAccurateTimestamp(file);
              const fileDate = new Date(timestamp);
              // Format dates consistently
              const fileObj = {
                name: file.name,
                path: entryPath,
                size: file.size,
                type: file.type,
                timestamp: timestamp,
                file: file,
                dateFormatted: fileDate.toLocaleDateString(),
                timeFormatted: fileDate.toLocaleTimeString(),
                // Add ISO string for debugging
                dateISO: fileDate.toISOString(),
                selected: false
              };
              mediaFiles.push(fileObj);
            } catch (error) {
            }
          }
        } else if (entry.kind === 'directory') {
          // Recursively process subdirectories
          await processDirectory(entry, entryPath);
        }
      }
    };
    try {
      await processDirectory(directoryHandle);
      // Log the date range of files found
      if (mediaFiles.length > 0) {
        const sortedByDate = [...mediaFiles].sort((a, b) => a.timestamp - b.timestamp);
        const oldestFile = sortedByDate[0];
        const newestFile = sortedByDate[sortedByDate.length - 1];
      }
      return mediaFiles;
    } catch (error) {
      throw error;
    }
  };
  /**
   * Organize files by date for better grouping
   */
  const organizeFilesByDate = (files) => {
    const groups = {};
    files.forEach(file => {
      // Make sure to use consistent date format that matches timeline
      // Use local date string to avoid timezone issues
      const date = new Date(file.timestamp);
      // Format date in a consistent way - use local date format
      const dateKey = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(file);
    });
    // Log the grouped files for debugging
    // Sort files within each date group by timestamp
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => b.timestamp - a.timestamp);
    });
    return groups;
  };
  /**
   * Toggle selection of a file
   */
  const toggleFileSelection = (index) => {
    const updatedFiles = [...scannedFiles];
    updatedFiles[index].selected = !updatedFiles[index].selected;
    setScannedFiles(updatedFiles);
    // Update the selected files list
    const selected = updatedFiles.filter(file => file.selected);
    setSelectedFiles(selected);
    // Update date groups
    setDateGroups(organizeFilesByDate(updatedFiles));
  };
  /**
   * Toggle selection of all files in a date group
   */
  const toggleDateGroupSelection = (date, isSelected) => {
    const updatedFiles = [...scannedFiles];
    updatedFiles.forEach(file => {
      if (file.dateFormatted === date) {
        file.selected = isSelected;
      }
    });
    setScannedFiles(updatedFiles);
    // Update the selected files list
    const selected = updatedFiles.filter(file => file.selected);
    setSelectedFiles(selected);
    // Update date groups
    setDateGroups(organizeFilesByDate(updatedFiles));
  };
  /**
   * Toggle selection of all files
   */
  const toggleSelectAll = () => {
    const newSelectAllMode = !selectAllMode;
    setSelectAllMode(newSelectAllMode);
    const updatedFiles = [...scannedFiles];
    updatedFiles.forEach(file => {
      file.selected = newSelectAllMode;
    });
    setScannedFiles(updatedFiles);
    // Update the selected files list
    const selected = newSelectAllMode ? updatedFiles : [];
    setSelectedFiles(selected);
    // Update date groups
    setDateGroups(organizeFilesByDate(updatedFiles));
  };
  /**
   * Start the media scanning process by showing directory picker for root storage
   */
  const startScanning = async () => {
    if (!isSupported) {
      setError("Your browser doesn't support the File System Access API");
      return;
    }
    setIsLoading(true);
    setScannedFiles([]);
    setSelectedFiles([]);
    setDateGroups({});
    setError(null);
    setScanProgress(0);
    setStatus("Opening folder picker...");
    try {
      // Show directory picker dialog targeting root storage
      // Note: For security reasons, browsers still require users to explicitly select a directory
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'read',
        // Try to start at a high-level directory for broader access
        // However, the actual starting directory is browser-dependent and might be restricted
        startIn: 'pictures',
      });
      setStatus(`Starting scan of ${directoryHandle.name}...`);
      // Scan the selected directory for media files
      const files = await scanDirectory(directoryHandle);
      // Sort files by timestamp, newest first
      files.sort((a, b) => b.timestamp - a.timestamp);
      setScannedFiles(files);
      // Organize files by date
      const groups = organizeFilesByDate(files);
      setDateGroups(groups);
      setStatus(`Scan complete! Found ${files.length} media files across ${Object.keys(groups).length} dates.`);
      setScanProgress(100);
    } catch (error) {
      // User-friendly error message
      if (error.name === 'AbortError') {
        setError("Directory selection was cancelled");
      } else {
        setError(`Error scanning folder: ${error.message || "Unknown error"}`);
      }
      setScanProgress(0);
    } finally {
      setIsLoading(false);
    }
  };
  /**
   * Add selected media to timeline
   */
  const addToTimeline = () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one file to add to your timeline");
      return;
    }
    setStatus(`Adding ${selectedFiles.length} files to timeline...`);
    // Group files by date for better organization in timeline
    const filesByDate = {};
    selectedFiles.forEach(file => {
      // Use a consistent date format that matches what we'll use in the timeline
      const date = new Date(file.timestamp);
      const dateKey = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      if (!filesByDate[dateKey]) {
        filesByDate[dateKey] = [];
      }
      filesByDate[dateKey].push(file);
    });
    // If callback prop is provided, send the selected files
    if (onMediaSelected && typeof onMediaSelected === 'function') {
      onMediaSelected(selectedFiles, filesByDate);
    }
    setStatus(`Added ${selectedFiles.length} files to your timeline across ${Object.keys(filesByDate).length} dates.`);
  };
  /**
   * Convert file size to human-readable format
   * @param {number} bytes - File size in bytes
   */
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };
  // If we're still checking compatibility, show loading
  if (isSupported === null) {
    return <div className="media-scanner">Checking browser compatibility...</div>;
  }
  return (
    <div className="media-scanner">
      <h2>Photo Collection</h2>
      {!isChromeOnAndroid && (
        <div className="warning-message">
          <p>⚠️ This feature works best on Android Chrome. Other browsers may be limited.</p>
        </div>
      )}
      {!isSupported && (
        <div className="error-message">
          <p>❌ Your browser doesn't support photo collection from device storage.</p>
          <p>Please use Chrome on Android for the best experience.</p>
        </div>
      )}
      {isSupported && (
        <>
          <div className="scanner-instructions">
            <p>Click "Start Collection" to select storage on your device. We'll find all your photos and media.</p>
            <p className="scanner-tip">Tip: To access your entire device storage, select the highest level directory you're permitted to access.</p>
          </div>
          <button 
            className="scan-button" 
            onClick={startScanning} 
            disabled={isLoading}
          >
            {isLoading ? "Collecting..." : "Start Photo Collection"}
          </button>
          {isLoading && scanProgress > 0 && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${scanProgress}%` }}></div>
              <div className="progress-text">{scanProgress}% Complete</div>
            </div>
          )}
          {status && <p className="status-message">{status}</p>}
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
          {scannedFiles.length > 0 && (
            <div className="results-container">
              <div className="results-header">
                <h3>Scanned Files ({scannedFiles.length} files across {Object.keys(dateGroups).length} dates)</h3>
                <div className="selection-actions">
                  <button 
                    className="select-all-button"
                    onClick={toggleSelectAll}
                  >
                    {selectAllMode ? "Deselect All" : "Select All"}
                  </button>
                  <div className="selection-info">
                    {selectedFiles.length} files selected
                  </div>
                  <button 
                    className="add-to-timeline-button"
                    onClick={addToTimeline}
                    disabled={selectedFiles.length === 0}
                  >
                    Add to Timeline
                  </button>
                </div>
              </div>
              <div className="date-grouping-container">
                {/* Group files by date for easier selection */}
                {Object.keys(dateGroups).sort((a, b) => new Date(b) - new Date(a)).map(date => {
                  const filesInGroup = dateGroups[date];
                  const allSelected = filesInGroup.every(file => file.selected);
                  const someSelected = filesInGroup.some(file => file.selected);
                  return (
                    <div key={date} className="date-group">
                      <div className="date-header">
                        <div className="date-title">{date} ({filesInGroup.length} files)</div>
                        <button 
                          className={`select-date-button ${allSelected ? 'selected' : someSelected ? 'partial' : ''}`}
                          onClick={() => toggleDateGroupSelection(date, !allSelected)}
                        >
                          {allSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                      <ul className="file-list">
                        {filesInGroup.map(file => {
                          const originalIndex = scannedFiles.findIndex(f => f === file);
                          return (
                            <li 
                              key={originalIndex} 
                              className={`file-item ${file.selected ? 'selected' : ''}`}
                              onClick={() => toggleFileSelection(originalIndex)}
                            >
                              <span className="file-name">{file.name}</span>
                              <span className="file-path">{file.path}</span>
                              <span className="file-size">{formatFileSize(file.size)}</span>
                              <span className="file-time">{file.timeFormatted}</span>
                              <input 
                                type="checkbox" 
                                checked={file.selected}
                                onChange={() => toggleFileSelection(originalIndex)}
                                className="file-checkbox"
                              />
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};