import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Splash = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Start the exit animation after 2.5 seconds
    const animationTimer = setTimeout(() => {
      setAnimationComplete(true);
    }, 2500);

    // Set session flag to indicate we're in an active session
    sessionStorage.setItem('sessionStarted', 'true');

    // Navigate to register after animation completes
    const navigateTimer = setTimeout(() => {
      navigate("/register");
    }, 3000);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(navigateTimer);
    };
  }, [navigate]);

  return (
    <div className={`flex flex-col justify-center items-center h-screen w-full bg-secondary shadow-elevation-2dp overflow-hidden relative transition-all duration-500 ease-out box-border ${animationComplete ? 'opacity-0 scale-110' : ''}`}>
      {/* Background gradient overlays */}
      <div 
        className="absolute w-[200%] h-[200%] top-[-100%] left-[-100%] animate-rotate"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,112,77,0) 70%)'
        }}
      ></div>
      
      <div 
        className="absolute w-full h-full animate-shimmer"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,112,77,0) 50%)'
        }}
      ></div>

      {/* Background circles */}
      <div className="absolute w-full h-full top-0 left-0 overflow-hidden z-10">
        <div className="absolute w-[300px] h-[300px] top-[-150px] right-[-100px] rounded-full bg-white/10 animate-float-circle"></div>
        <div 
          className="absolute w-[200px] h-[200px] bottom-[-50px] left-[10%] rounded-full bg-white/10 animate-float-circle"
          style={{ animationDelay: '1s', animationDuration: '6s' }}
        ></div>
        <div 
          className="absolute w-[150px] h-[150px] top-[25%] left-[-50px] rounded-full bg-white/10 animate-float-circle"
          style={{ animationDelay: '0.5s', animationDuration: '7s' }}
        ></div>
      </div>
      
      {/* Logo container */}
      <div 
        className="flex justify-center items-center w-[180px] h-[180px] relative z-20 opacity-0 scale-50 animate-entrance"
        style={{ 
          animationDelay: '0s',
          animationFillMode: 'forwards'
        }}
      >
        <img
          className="w-full h-full object-contain transition-all duration-500 ease-in-out hover:drop-shadow-[0_0_15px_rgba(44,76,223,0.5)]"
          alt="Bonded logo"
          src="/images/bonded-logo-blue.svg"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(44, 76, 223, 0.3))'
          }}
        />
      </div>

      {/* Responsive adjustments */}
      <style jsx>{`
        @media (max-width: 320px) {
          .splash-logo-container {
            width: 140px;
            height: 140px;
          }
        }

        @media (min-width: 321px) and (max-width: 480px) {
          .splash-logo-container {
            width: 160px;
            height: 160px;
          }
        }

        /* Support for notched devices */
        @supports (padding-top: env(safe-area-inset-top)) {
          .splash-screen {
            padding-top: env(safe-area-inset-top);
            padding-bottom: env(safe-area-inset-bottom);
          }
        }
      `}</style>
    </div>
  );
};