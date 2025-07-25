import React from "react";
import "./style.css";

export const DeleteModal = ({ onClose, onConfirm, item }) => {
  const handleDelete = () => {
    if (onConfirm) {
      onConfirm(item);
    }
    onClose();
  };

  return (
    <div className="delete-modal-overlay">
      <div className="delete-modal-container">
        <div className="delete-modal">
          <div className="delete-modal-header">
            <div className="delete-modal-title">Delete Media {item?.name}</div>
            <div className="delete-modal-close" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="#2C4CDF"/>
              </svg>
            </div>
          </div>
          
          <div className="delete-modal-content">
            <div className="delete-message">
              Are you sure you want to delete this file? This cannot be undone.
            </div>
          </div>
          
          <div className="delete-modal-buttons">
            <button className="delete-confirm-btn" onClick={handleDelete}>
              Yes, please
            </button>
            <button className="delete-cancel-btn" onClick={onClose}>
              No thanks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 