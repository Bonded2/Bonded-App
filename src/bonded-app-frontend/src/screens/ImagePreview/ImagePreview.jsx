import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { InfoModal } from "../../components/InfoModal";
import { DeleteModal } from "../../components/DeleteModal";
import "./style.css";

export const ImagePreview = ({ onClose, item: propItem }) => {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Sample images that would typically come from your data store
  const sampleImages = [
    {
      id: "1",
      name: "Img 455",
      type: "photo",
      source: "User's Device",
      location: "Home",
      date: "12 Nov 2025",
      imageUrl: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
    },
    {
      id: "2",
      name: "Img 1209",
      type: "photo",
      source: "User's Device",
      location: "Work",
      date: "12 Nov 2025",
      imageUrl: "https://images.unsplash.com/photo-1589553416260-110229331345?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80"
    },
    {
      id: "3",
      name: "Img 1209",
      type: "photo",
      source: "User's Device",
      location: "Coffee Shop",
      date: "12 Nov 2025",
      imageUrl: "https://images.unsplash.com/photo-1620207418302-439b387441b0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80"
    }
  ];
  
  // Find the relevant image from the sample data
  const findImage = () => {
    if (propItem) return propItem;
    const found = sampleImages.find(img => img.id === itemId);
    return found || sampleImages[0]; // Default to first image if not found
  };
  
  // Use item from props or fetch based on itemId from URL params
  const item = findImage();

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
    console.log(`Confirming delete for item ${item.id}`);
    // Here you would implement the actual delete functionality
    // After deletion, navigate back
    handleClose();
  };

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