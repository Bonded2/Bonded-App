import React, { useState, useEffect, useRef } from "react";
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
  const [animatedItems, setAnimatedItems] = useState([]);
  const timelineRef = useRef(null);

  const timelineData = [
    {
      id: 1,
      date: "12 Nov 2025",
      photos: 3,
      messages: 2,
      location: "Thailand",
      icon: null,
      image: "/images/Bonded - Brand image 4.jpg"
    },
    {
      id: 2,
      date: "02 Oct 2025",
      photos: 4,
      messages: 10,
      location: "London",
      icon: null,
      image: "/images/Bonded - Brand image 1.jpg"
    },
    {
      id: 3,
      date: "15 Aug 2025",
      photos: 19,
      messages: 8,
      location: "Wales",
      icon: <Chat4 className="chat-icon-svg" />,
      image: "/images/Bonded - Brand image 3.png"
    }
  ];

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

  // Handle scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setAnimatedItems(prev => [...prev, entry.target.dataset.id]);
          }
        });
      },
      { threshold: 0.3 }
    );

    const elements = document.querySelectorAll('.timeline-item');
    elements.forEach(element => observer.observe(element));

    return () => elements.forEach(element => observer.unobserve(element));
  }, []);

  // Handle initial animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedItems([1]);
      
      const timers = [
        setTimeout(() => setAnimatedItems(prev => [...prev, 2]), 300),
        setTimeout(() => setAnimatedItems(prev => [...prev, 3]), 600)
      ];
      
      return () => timers.forEach(t => clearTimeout(t));
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

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
        
        <div className="timeline-content-container">
          <div className="timeline-header">
            <div className="frame-header">
              <p className="capture-title">What we've captured so far</p>
            </div>
          </div>
          
          <div className="timeline-content" ref={timelineRef}>
            <div className="timeline-line">
              <div className="timeline-vertical-line">
                {timelineData.map((item, index) => (
                  <div 
                    key={`dot-${item.id}`} 
                    className={`timeline-dot ${animatedItems.includes(item.id) ? 'timeline-dot-animated' : ''}`}
                    style={{ top: `${index * 200 + 100}px` }}
                  />
                ))}
              </div>
            </div>

            {timelineData.map((item, index) => (
              <div 
                className={`timeline-item ${animatedItems.includes(item.id) ? 'timeline-item-animated' : ''}`}
                key={item.id}
                data-id={item.id}
              >
                <div className={`date-badge date-badge-${index + 1}`}>
                  <div className="date-text">{item.date}</div>
                </div>
                
                <TimelineTileWrapper 
                  className={`timeline-tile-${index + 1}`}
                  timelineTileText={`${item.messages} Messages`}
                  timelineTileText1={`${item.photos} Photos`}
                  timelineTileText2={item.location}
                  timelineTileIcon={item.icon}
                  timelineTileMaskGroup={item.image}
                  timelineTileMaskGroupClassName="timeline-brand-image"
                  onClick={handleTimelineTileClick}
                  date={item.date}
                />
              </div>
            ))}
            
            <div className="timeline-end">
              <div className="timeline-end-dot" />
              <p className="timeline-end-text">Keep adding to your timeline</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
