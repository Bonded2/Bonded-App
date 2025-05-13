import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TimelineTileWrapper } from "../../components/TimelineTileWrapper";
import { TopAppBar } from "../../components/TopAppBar";
import { Chat4 } from "../../icons/Chat4";
import { MenuFrame } from "../../components/MenuFrame/MenuFrame";
import { UploadModal } from "../../components/UploadModal";
import { ExportModal } from "../../components/ExportModal";
import "./style.css";

export const TimelineCreated = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const toggleMenu = () => {
    console.log("TimelineCreated: toggleMenu called, current state:", isMenuOpen);
    setIsMenuOpen(!isMenuOpen);
  };

  const handleUploadClick = () => {
    console.log("Upload icon clicked");
    setIsUploadModalOpen(true);
  };

  const handleCloseUploadModal = () => {
    setIsUploadModalOpen(false);
  };

  const handleExportClick = () => {
    console.log("Export button clicked - opening export modal");
    setIsExportModalOpen(true);
  };

  const handleCloseExportModal = () => {
    console.log("Closing export modal");
    setIsExportModalOpen(false);
  };
  
  const handleTimelineTileClick = (date) => {
    console.log(`TimelineTile clicked for date: ${date}`);
    // Navigate to the TimestampFolder screen with the corresponding date
    navigate(`/timestamp-folder/${encodeURIComponent(date)}`);
  };

  useEffect(() => {
    console.log("TimelineCreated: Menu state is now:", isMenuOpen);
  }, [isMenuOpen]);

  useEffect(() => {
    console.log("TimelineCreated: Export modal state is now:", isExportModalOpen);
  }, [isExportModalOpen]);

  useEffect(() => {
    console.log("TimelineCreated: Upload modal state is now:", isUploadModalOpen);
  }, [isUploadModalOpen]);

  return (
    <div className="timeline-created" data-model-id="632:1194">
      {isMenuOpen && <MenuFrame onClose={toggleMenu} />}
      {isUploadModalOpen && <UploadModal onClose={handleCloseUploadModal} />}
      {isExportModalOpen && (
        <ExportModal onClose={handleCloseExportModal} />
      )}
      <div className="timeline-container">
        <TopAppBar
          onMenuToggle={toggleMenu}
          headline="Your timeline"
          onUploadClick={handleUploadClick}
          onExportClick={handleExportClick}
        />
        
        <div className="overlap-section">
          <div className="timeline-line">
            <div className="timeline-vertical-line" />
          </div>

          <div className="timeline-header">
            <div className="frame-header">
              <p className="capture-title">What we've captured so far</p>
            </div>
          </div>

          <div className="date-badge first-date">
            <div className="date-text">12 Nov 2025</div>
          </div>

          <div className="date-badge second-date">
            <div className="date-text">02 Oct 2025</div>
          </div>

          <div className="date-badge third-date">
            <div className="date-text">15 Aug 2025</div>
          </div>

          <TimelineTileWrapper 
            className="first-timeline-tile" 
            timelineTileText="3 Photos"
            timelineTileText1="2 Messages"
            timelineTileText2="Thailand"
            onClick={handleTimelineTileClick}
            date="12 Nov 2025"
          />
          
          <TimelineTileWrapper
            className="second-timeline-tile"
            timelineTileText="4 Photos"
            timelineTileText1="10 Messages"
            timelineTileText2="London"
            onClick={handleTimelineTileClick}
            date="02 Oct 2025"
          />
          
          <TimelineTileWrapper
            className="third-timeline-tile"
            icn4StyleOverrideClassName="chat-icon"
            timelineTileIcon={<Chat4 className="chat-icon-svg" />}
            timelineTileMaskGroupClassName="timeline-tile-image"
            timelineTileText="19 Photos"
            timelineTileText1="8 Messages"
            timelineTileText2="Wales"
            onClick={handleTimelineTileClick}
            date="15 Aug 2025"
          />
        </div>
      </div>
    </div>
  );
};
