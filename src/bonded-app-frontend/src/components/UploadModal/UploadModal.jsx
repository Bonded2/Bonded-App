import React, { useState, useRef, useEffect } from "react";
import { Upload1 } from "../../icons/Upload1";
import { Photo1 } from "../../icons/Photo1";
// import { DescriptionIcon } from "../../icons/Description"; // Example for document files - ensure you have such an icon
import { Today } from "../../icons/Today"; // For date
import { useGeoMetadata } from "../../features/geolocation/hooks/useGeoMetadata";
import { aiClassificationService } from "../../utils/aiClassification";
import { AIClassificationTest } from "../AIClassificationTest";
import "./style.css";
// Helper to get a simple file type category
const getFileTypeCategory = (fileNameOrType) => {
  const name = typeof fileNameOrType === 'string' ? fileNameOrType : fileNameOrType.name;
  const type = typeof fileNameOrType === 'string' ? '' : fileNameOrType.type; // MIME type from File object
  const extension = name.split('.').pop().toLowerCase();
  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic'].includes(extension)) return 'image';
  if (type.startsWith('application/pdf') || ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'document';
  if (type.startsWith('video/') || ['mov', 'mp4', 'avi', 'mkv'].includes(extension)) return 'video';
  // Add more categories as needed
  return 'other';
};
const FileIcon = ({ file }) => {
  const category = getFileTypeCategory(file);
  if (category === 'image') return <Photo1 className="file-item-icon image-icon" />;
  // if (category === 'document') return <DescriptionIcon className="file-item-icon document-icon" />;
  // if (category === 'video') return <VideoIcon className="file-item-icon video-icon" />;
  return <span className="file-item-icon generic-icon">📄</span>; // Generic file icon
};
// Function to check if a file would be excluded by AI filters and settings
const getExclusionReason = (file, captureSettings, fileTypeOverrides, aiClassificationResult = null) => {
  const category = getFileTypeCategory(file);
  const fileExt = file.name.split('.').pop().toLowerCase();
  // Check manual file type overrides first
  if (fileTypeOverrides && fileTypeOverrides[fileExt] === false) {
    return `Manually excluded file type: .${fileExt}`;
  }
  // Check AI classification results for images
  if (aiClassificationResult && category === 'image') {
    const exclusion = aiClassificationService.shouldExcludeContent(aiClassificationResult, 'image');
    if (exclusion.exclude) {
      return `AI Filter: ${exclusion.reason}`;
    }
  }
  // Check capture settings
  if (captureSettings) {
    if (category === 'image' && captureSettings.photos === 'none') {
      return "Image capture is set to 'none'.";
    }
    // Add more checks for 'light', 'medium' (e.g., based on file.size)
    // Example: if (category === 'image' && captureSettings.photos === 'light' && file.size > 1024 * 1024) return "Image too large for 'light' setting.";
    if (category === 'document' && captureSettings.documents === 'none') { // Assuming a 'documents' setting exists
      return "Document capture is set to 'none'.";
    }
     if (category === 'video' && captureSettings.videos === 'none') { // Assuming a 'videos' setting exists
      return "Video capture is set to 'none'.";
    }
    // Add similar checks for other categories and levels (telegram, geolocation etc.)
  }
  return null; // Not excluded by basic type/level checks
};
export const UploadModal = ({ 
  onClose, 
  onFilesUpload, 
  captureSettings,      // Prop: from main app state / Settings screen
  fileTypeOverrides     // Prop: from main app state / Settings screen
}) => {
  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [checkedFiles, setCheckedFiles] = useState({});
  const [currentFilter, setCurrentFilter] = useState("all");
  const [hoveredExclusion, setHoveredExclusion] = useState(null); // fileName for tooltip
  const [isPreparingUpload, setIsPreparingUpload] = useState(false);
  const [aiClassificationResults, setAiClassificationResults] = useState({}); // Store AI results by filename
  const [isClassifying, setIsClassifying] = useState(false);
  const [showAIDemo, setShowAIDemo] = useState(false);
  // Get geolocation metadata hook
  const { getMetadataForFile, refreshMetadata } = useGeoMetadata();
  // Initialize AI service on component mount
  useEffect(() => {
    aiClassificationService.initialize().catch(() => {});
  }, []);
  const handleSelectFilesClick = () => {
    fileInputRef.current.click();
  };
  const handleFileInputChange = async (e) => {
    const newFiles = Array.from(e.target.files);
    // Prevent duplicates by checking names, simple approach
    const uniqueNewFiles = newFiles.filter(nf => !selectedFiles.some(sf => sf.name === nf.name && sf.size === nf.size));
    setSelectedFiles(prev => [...prev, ...uniqueNewFiles]);
    const newChecked = { ...checkedFiles };
    uniqueNewFiles.forEach(file => newChecked[file.name] = true); // Auto-check new files
    setCheckedFiles(newChecked);
    if(fileInputRef.current) fileInputRef.current.value = ""; 
    // Run AI classification on new image files
    await classifyNewFiles(uniqueNewFiles);
  };
  // Function to classify new files with AI
  const classifyNewFiles = async (files) => {
    const imageFiles = files.filter(file => getFileTypeCategory(file) === 'image');
    if (imageFiles.length === 0) return;
    setIsClassifying(true);
    try {
      const classificationPromises = imageFiles.map(async (file) => {
        try {
          const result = await aiClassificationService.classifyImage(file);
          return { fileName: file.name, result };
        } catch (error) {
          return { fileName: file.name, error: error.message };
        }
      });
      const results = await Promise.all(classificationPromises);
      // Update classification results state
      const newResults = { ...aiClassificationResults };
      results.forEach(({ fileName, result, error }) => {
        newResults[fileName] = error ? { error } : result;
      });
      setAiClassificationResults(newResults);
    } catch (error) {
    } finally {
      setIsClassifying(false);
    }
  };
  const handleCheckboxChange = (fileName) => {
    setCheckedFiles(prev => ({ ...prev, [fileName]: !prev[fileName] }));
  };
  const handleUploadChecked = async () => {
    try {
      setIsPreparingUpload(true);
      // Start by refreshing the geolocation metadata to ensure it's up-to-date
      await refreshMetadata();
      // Filter selected files
      const filesToUpload = selectedFiles.filter(file => checkedFiles[file.name]);
      const finalFilesToUpload = filesToUpload.filter(file => {
        const aiResult = aiClassificationResults[file.name];
        return !getExclusionReason(file, captureSettings, fileTypeOverrides, aiResult);
      });
      if (finalFilesToUpload.length !== filesToUpload.length) {
          // Optionally confirm with user if some checked files will be excluded
          const excludedCount = filesToUpload.length - finalFilesToUpload.length;
          if (!confirm(`${excludedCount} checked file(s) will be excluded by current filter settings. Proceed with upload?`)) {
              setIsPreparingUpload(false);
              return;
          }
      }
      if (finalFilesToUpload.length > 0) {
        // Attach geolocation metadata to each file
        const filesWithMetadata = await Promise.all(
          finalFilesToUpload.map(async (file) => {
            return await getMetadataForFile(file);
          })
        );
        if (onFilesUpload) {
          onFilesUpload(filesWithMetadata);
        }
        onClose();
      } else {
        alert("No files selected for upload or all selected files are excluded by filters.");
      }
    } catch (error) {
      alert("There was an error preparing your files for upload.");
    } finally {
      setIsPreparingUpload(false);
    }
  };
  const filteredFiles = selectedFiles.filter(file => {
    if (currentFilter === "all") return true;
    const category = getFileTypeCategory(file);
    if (currentFilter === "images") return category === 'image';
    if (currentFilter === "docs") return category === 'document';
    // Add 'videos' filter if that category is added
    return true;
  });
  const toggleSelectAll = () => {
    const allVisibleCurrentlyChecked = filteredFiles.length > 0 && filteredFiles.every(file => checkedFiles[file.name]);
    const newCheckedState = { ...checkedFiles };
    filteredFiles.forEach(file => {
      newCheckedState[file.name] = !allVisibleCurrentlyChecked;
    });
    setCheckedFiles(newCheckedState);
  };
  const countCheckedFiles = () => Object.values(checkedFiles).filter(Boolean).length;
  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal-container">
        <div className="upload-modal-content">
          <div className="upload-modal-header">
            <div className="trailing-icon">
              <div className="close-icon" onClick={onClose} aria-label="Close upload modal">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#FFFFFF"/>
                </svg>
              </div>
            </div>
            <div className="upload-modal-title">
              <h2>Upload Media</h2>
            </div>
          </div>
          <div className="upload-modal-body">
            {selectedFiles.length === 0 ? (
              <>
                <p className="upload-text">Select images, documents, or other files from your device.</p>
                <div className="upload-icon-container">
                  <Upload1 className="main-upload-icon"/>
                </div>
                <button className="select-files-btn primary" onClick={handleSelectFilesClick}>
                  Browse Files
                </button>
              </>
            ) : (
              <>
                <div className="file-filters">
                  <button onClick={() => setCurrentFilter("all")} className={currentFilter === "all" ? "active" : ""}>All ({selectedFiles.length})</button>
                  <button onClick={() => setCurrentFilter("images")} className={currentFilter === "images" ? "active" : ""}>Images</button>
                  <button onClick={() => setCurrentFilter("docs")} className={currentFilter === "docs" ? "active" : ""}>Documents</button>
                  {/* Add video filter button if needed */}
                </div>
                <div className="file-list-container">
                  {filteredFiles.length > 0 ? (
                    <ul className="file-list">
                      <li className="file-list-header">
                        <input 
                          type="checkbox" 
                          onChange={toggleSelectAll}
                          checked={filteredFiles.length > 0 && filteredFiles.every(file => !!checkedFiles[file.name])}
                          aria-label="Select all visible files"
                        />
                        <span>Select All Visible ({filteredFiles.filter(f => !!checkedFiles[f.name]).length} / {filteredFiles.length})</span>
                      </li>
                      {filteredFiles.map(file => {
                        const aiResult = aiClassificationResults[file.name];
                        const exclusionReason = getExclusionReason(file, captureSettings, fileTypeOverrides, aiResult);
                        const isExcluded = !!exclusionReason;
                        const isImage = getFileTypeCategory(file) === 'image';
                        const isCurrentlyClassifying = isImage && !aiResult && isClassifying;
                        return (
                          <li 
                            key={`${file.name}-${file.lastModified}`}
                            className={`file-item ${isExcluded ? 'excluded' : ''} ${checkedFiles[file.name] && isExcluded ? 'checked-excluded' : ''}`}
                            onMouseEnter={() => isExcluded && setHoveredExclusion(file.name)}
                            onMouseLeave={() => isExcluded && setHoveredExclusion(null)}
                          >
                            <input 
                              type="checkbox" 
                              checked={checkedFiles[file.name] || false} 
                              onChange={() => handleCheckboxChange(file.name)}
                              aria-labelledby={`fileName-${file.name}`}
                              disabled={isExcluded && !checkedFiles[file.name]} // Can uncheck if excluded, but not check initially
                            />
                            <FileIcon file={file} />
                            <div className="file-details">
                                <span id={`fileName-${file.name}`} className="file-name" title={file.name}>{file.name}</span>
                                <span className="file-meta">
                                    {(file.size / 1024).toFixed(1)} KB • {new Date(file.lastModified).toLocaleDateString()}
                                    {isExcluded && <span className="exclusion-indicator"> ℹ️</span>}
                                    {isImage && (
                                      <span className="ai-status">
                                        {isCurrentlyClassifying ? (
                                          <span className="ai-processing"> 🔄 AI Analyzing...</span>
                                        ) : aiResult?.error ? (
                                          <span className="ai-error"> ⚠️ AI Error</span>
                                        ) : aiResult?.success ? (
                                          aiResult.data.content_appropriate ? (
                                            <span className="ai-approved"> ✅ AI Approved</span>
                                          ) : (
                                            <span className="ai-rejected"> ❌ AI Rejected</span>
                                          )
                                        ) : null}
                                      </span>
                                    )}
                                </span>
                            </div>
                            {hoveredExclusion === file.name && isExcluded && (
                              <div className="exclusion-tooltip">
                                {exclusionReason}
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="no-files-text">No files match the current filter or no files selected.</p>
                  )}
                </div>
                <div className="upload-actions">
                  <button className="select-files-btn secondary" onClick={handleSelectFilesClick}>
                    Add More Files
                  </button>
                  <button 
                    className="upload-checked-btn primary" 
                    onClick={handleUploadChecked} 
                    disabled={countCheckedFiles() === 0 || isPreparingUpload || isClassifying}
                  >
                    {isPreparingUpload ? (
                      <span>Preparing Files...</span>
                    ) : isClassifying ? (
                      <span>AI Processing...</span>
                    ) : (
                      <span>Upload {countCheckedFiles()} Selected</span>
                    )}
                  </button>
            </div>
                {/* AI Classification Status */}
                {(isClassifying || Object.keys(aiClassificationResults).length > 0) && (
                  <div className="ai-classification-status">
                    <h4>AI Content Filtering</h4>
                    <p>
                      {isClassifying ? 
                        "Analyzing images for content appropriateness..." : 
                        "Image analysis complete. Inappropriate content will be automatically excluded."
                      }
                    </p>
                    <button 
                      className="ai-test-button"
                      onClick={() => setShowAIDemo(true)}
                    >
                      Test Content Filter
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileInputChange}
            multiple
            accept="*/*" // Or more specific: "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.mov,.mp4"
          />
        </div>
      </div>
      {/* AI Classification Demo Modal */}
      {showAIDemo && (
        <AIClassificationTest onClose={() => setShowAIDemo(false)} />
      )}
    </div>
  );
}; 