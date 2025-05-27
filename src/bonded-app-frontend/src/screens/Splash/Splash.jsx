import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resetToFirstTimeUser } from "../../utils/firstTimeUserReset";

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
    <div className={`flex flex-col justify-center items-center h-screen w-full bg-secondary shadow-elevation-2dp overflow-hidden relative transition-all duration-500 ease-out ${animationComplete ? 'opacity-0 scale-110' : ''}`}>
      {/* Background gradient overlay */}
      <div className="absolute w-[200%] h-[200%] bg-gradient-radial from-white/10 to-transparent top-[-100%] left-[-100%] animate-rotate"></div>
      <div className="absolute w-full h-full bg-gradient-to-br from-white/10 to-transparent animate-shimmer"></div>
      
      {/* Floating circles */}
      <div className="absolute w-full h-full top-0 left-0 overflow-hidden z-[1]">
        <div className="absolute w-[300px] h-[300px] top-[-150px] right-[-100px] rounded-full bg-white/10 animate-float-circle"></div>
        <div className="absolute w-[200px] h-[200px] bottom-[-50px] left-[10%] rounded-full bg-white/10 animate-float-circle" style={{animationDelay: '1s'}}></div>
        <div className="absolute w-[150px] h-[150px] top-[25%] left-[-50px] rounded-full bg-white/10 animate-float-circle" style={{animationDelay: '0.5s'}}></div>
      </div>
      
      <div className="flex justify-center items-center w-45 h-45 animate-entrance opacity-0 scale-50 relative z-[2] [animation-delay:0s] [animation-fill-mode:forwards]" style={{animation: 'entrance 1.5s ease-out forwards, float 3s ease-in-out infinite 1.5s'}}>
        <img
          className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(44,76,223,0.3)] transition-all duration-500 hover:drop-shadow-[0_0_15px_rgba(44,76,223,0.5)]"
          alt="Bonded logo"
          src="/images/bonded-logo-blue.svg"
        />
      </div>
    </div>
  );
}; 