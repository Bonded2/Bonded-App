import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UploadModal } from "../../components/UploadModal";
import { InfoModal } from "../../components/InfoModal";
import { DeleteModal } from "../../components/DeleteModal";
import "./style.css";

export const TimestampFolder = ({ onClose, date: propDate }) => {
  const navigate = useNavigate();
  const { date: paramDate } = useParams();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Use date from props or URL params, make sure to decode URL encoded date
  const date = propDate || (paramDate ? decodeURIComponent(paramDate) : null);

  const handleBack = () => {
    console.log("Navigating back from TimestampFolder");
    if (onClose) {
      onClose();
    } else {
      navigate(-1); // Go back to the previous screen (likely TimelineCreated)
    }
  };

  const handlePreviewClick = (item) => {
    console.log(`Preview clicked for item ${item.id}`);
    // Navigate to ImagePreview screen with the selected item ID
    navigate(`/image-preview/${item.id}`);
  };

  const handleInfoClick = (item) => {
    console.log(`Info clicked for item ${item.id}`);
    setSelectedItem(item);
    setShowInfoModal(true);
  };

  const handleDeleteClick = (item) => {
    console.log(`Delete clicked for item ${item.id}`);
    setSelectedItem(item);
    setShowDeleteModal(true);
  };
  
  const handleConfirmDelete = (item) => {
    console.log(`Confirming delete for item ${item.id}`);
    // Here you would implement the actual delete functionality
    // For example, remove the item from the contentItems array
    // This is just a simulation for now
    // setContentItems(contentItems.filter(i => i.id !== item.id));
  };

  const handleUploadMedia = () => {
    console.log("Upload media clicked");
    setShowUploadModal(true);
    // Implement upload media functionality
  };

  const handleViewAllMedia = () => {
    console.log("View all media clicked");
    // Implement view all media functionality
  };

  const handleAddMedia = () => {
    console.log("Add media clicked");
    setShowUploadModal(true);
    // Implement add media functionality
  };

  // Sample content items for this date
  const contentItems = [
    { 
      id: "1", 
      type: 'photo', 
      name: 'Img 455',
      source: "User's Device",
      location: "Home",
      date: "12 Nov 2023",
      imageUrl: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
    },
    { 
      id: "2", 
      type: 'photo', 
      name: 'Img 1209',
      source: "User's Device",
      location: "Work",
      date: "12 Nov 2023",
      imageUrl: "https://images.unsplash.com/photo-1589553416260-110229331345?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80"
    },
    { 
      id: "3", 
      type: 'photo', 
      name: 'Img 1209',
      source: "User's Device",
      location: "Coffee Shop",
      date: "12 Nov 2023",
      imageUrl: "https://images.unsplash.com/photo-1620207418302-439b387441b0?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=687&q=80"
    },
    { 
      id: "4", 
      type: 'message', 
      name: 'Message: 10:00 am',
      source: "Message App",
      location: "Home",
      date: "12 Nov 2023"
    },
    { 
      id: "5", 
      type: 'message', 
      name: 'Message: 11:59 am',
      source: "Message App",
      location: "Work",
      date: "12 Nov 2023" 
    },
    { 
      id: "6", 
      type: 'location', 
      name: 'Location: Home',
      source: "Map App",
      location: "Home",
      date: "12 Nov 2023"
    },
  ];

  const formattedDate = date || "12 Nov 2025";

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
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 7H11V9H13V7ZM13 11H11V17H13V11ZM12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="#FFFFFF"/>
          </svg>
        );
    }
  };

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
            <div className="header-title">{formattedDate}</div>
          </div>
        </div>

        {/* Content rows */}
        <div className="timestamp-content">
          {contentItems.map((item) => (
            <div className="content-row" key={item.id}>
              <div className="row-content">
                <div className="item-icon">
                  {renderIcon(item.type)}
                </div>
                <div className="item-name">{item.name}</div>
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
          ))}

          {/* Action Cards */}
          <div className="card" onClick={handleViewAllMedia}>
            <div className="card-text">View, see info or delete all media</div>
          </div>

          <div className="card" onClick={handleAddMedia}>
            <div className="card-text">View, add or delete media for this date</div>
          </div>

          {/* Upload button */}
          <button className="upload-btn" onClick={handleUploadMedia}>
            <div className="btn-text">Upload Media</div>
          </button>
        </div>

        {/* Upload Modal */}
        {showUploadModal && <UploadModal onClose={() => setShowUploadModal(false)} />}
        
        {/* Info Modal */}
        {showInfoModal && <InfoModal onClose={() => setShowInfoModal(false)} item={selectedItem} />}
        
        {/* Delete Modal */}
        {showDeleteModal && (
          <DeleteModal 
            onClose={() => setShowDeleteModal(false)} 
            onConfirm={handleConfirmDelete}
            item={selectedItem} 
          />
        )}
      </div>
    </div>
  );
}; 