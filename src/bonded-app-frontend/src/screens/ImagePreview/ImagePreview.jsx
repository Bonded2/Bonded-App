import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { InfoModal } from "../../components/InfoModal";
import { DeleteModal } from "../../components/DeleteModal";
import "./style.css";
// LocalStorage key for timestamp content - same as in TimestampFolder
const TIMESTAMP_CONTENT_KEY = 'bonded_timestamp_content';
export const ImagePreview = ({ onClose, item: propItem }) => {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  // Find the correct item either from props or localStorage
  useEffect(() => {
    const loadItem = () => {
      setLoading(true);
      // If item was passed directly via props, use it
      if (propItem) {
        setItem(propItem);
        setLoading(false);
        return;
      }
      // Otherwise find the item in localStorage by ID
      try {
        // Get all content from localStorage
        const allContent = JSON.parse(localStorage.getItem(TIMESTAMP_CONTENT_KEY) || '{}');
        // Search for the item with matching ID across all dates
        let foundItem = null;
        // Iterate through all dates
        Object.values(allContent).forEach(dateItems => {
          // Check each item in this date
          const matchingItem = dateItems.find(item => item.id === itemId);
          if (matchingItem) {
            foundItem = matchingItem;
          }
        });
        if (foundItem) {
          setItem(foundItem);
        } else {
          // If not found, use a placeholder
          setItem({
            id: "not-found",
            name: "Image not found",
            type: "photo",
            source: "Unknown",
            location: "Unknown",
            date: new Date().toLocaleDateString(),
            imageUrl: "/images/placeholder-image.jpg"
          });
        }
      } catch (err) {
        // Set a default placeholder on error
        setItem({
          id: "error",
          name: "Error loading image",
          type: "photo", 
          source: "Error",
          location: "Unknown",
          date: new Date().toLocaleDateString(),
          imageUrl: "/images/error-image.jpg"
        });
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, [propItem, itemId]);
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1); // Go back to the previous screen
    }
  };
  const handleInfoClick = () => {
    setShowInfoModal(true);
  };
  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };
  const handleConfirmDelete = () => {
    if (!item) return;
    try {
      // Get all content from localStorage
      const allContent = JSON.parse(localStorage.getItem(TIMESTAMP_CONTENT_KEY) || '{}');
      // Find which date contains this item
      Object.keys(allContent).forEach(date => {
        // Filter out the deleted item
        allContent[date] = allContent[date].filter(i => i.id !== item.id);
      });
      // Save back to localStorage
      localStorage.setItem(TIMESTAMP_CONTENT_KEY, JSON.stringify(allContent));
      // Navigate back
      handleClose();
    } catch (err) {
      alert("Failed to delete item. Please try again.");
    }
  };
  if (loading) {
    return (
      <div className="image-preview-screen">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading image...</p>
        </div>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="image-preview-screen">
        <div className="error-container">
          <p>Image not found</p>
          <button onClick={handleClose}>Go Back</button>
        </div>
      </div>
    );
  }
  return (
    <div className="image-preview-screen">
      <div className="image-preview-container">
        {/* Top navigation bar */}
        <div className="image-preview-navbar">
          <div className="back-button" onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="#FF704D"/>
            </svg>
          </div>
          <div className="preview-title">{item.name}</div>
        </div>
        {/* Main image container */}
        <div className="image-container">
          <img src={item.imageUrl} alt={item.name} className="preview-image" />
          {/* Verification indicators for immigration documents */}
          {item.source === "Immigration Document" && (
            <div className="verification-badge">Official Document</div>
          )}
          {/* Date indicator for evidence timeline */}
          <div className="date-indicator">{item.date}</div>
        </div>
        {/* Bottom action bar */}
        <div className="image-actions-bar">
          <div className="action-button info-button" onClick={handleInfoClick}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 17H13V11H11V17ZM11 9H13V7H11V9Z" fill="#B9FF46"/>
            </svg>
            <span>Info</span>
          </div>
          <div className="action-button delete-button" onClick={handleDeleteClick}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 9V19H8V9H16ZM14.5 3H9.5L8.5 4H5V6H19V4H15.5L14.5 3ZM18 7H6V19C6 20.1 6.9 21 8 21H16C17.1 21 18 20.1 18 19V7Z" fill="#FF704D"/>
            </svg>
            <span>Delete</span>
          </div>
        </div>
        {/* Info Modal */}
        {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} item={item} />}
        {/* Delete Modal */}
        {showDeleteModal && (
          <DeleteModal 
            onClose={() => setShowDeleteModal(false)} 
            onConfirm={handleConfirmDelete}
            item={item} 
          />
        )}
      </div>
    </div>
  );
}; 