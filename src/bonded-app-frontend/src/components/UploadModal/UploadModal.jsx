import React, { useRef } from "react";
import { Upload1 } from "../../icons/Upload1";
import "./style.css";

export const UploadModal = ({ onClose }) => {
  const fileInputRef = useRef(null);

  const handleSelectFiles = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      // Handle the selected files here
      console.log("Files selected:", files);
      // You can implement file upload logic here
    }
  };

  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal-container">
        <div className="upload-modal-content">
          <div className="upload-modal-header">
            <div className="trailing-icon">
              <div className="close-icon" onClick={onClose}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="white"/>
                </svg>
              </div>
            </div>
            <div className="upload-modal-title">
              <h2>Upload media</h2>
            </div>
          </div>
          
          <div className="upload-modal-body">
            <p className="upload-text">Upload images from your device</p>
            <div className="upload-icon">
              <Upload1 color="#B9FF46" />
            </div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileChange}
            multiple
            accept="image/*"
          />
          
          <button className="select-files-btn" onClick={handleSelectFiles}>
            <div className="btn-label">Select files</div>
          </button>
        </div>
      </div>
    </div>
  );
}; 