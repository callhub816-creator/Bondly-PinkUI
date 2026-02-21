
import React from 'react';

interface AbstractBackgroundProps {
  id: number;
}

const AbstractBackground: React.FC<AbstractBackgroundProps> = ({ id }) => {
  // Unique configurations for blobs based on card ID
  // Using pure CSS shapes with high blur for the "Abstract atmospheric shapes" requirement.

  const renderBlobs = () => {
    switch (id) {
      case 1: // Playful
        return (
          <>
            <div className="absolute top-[-10%] left-[-20%] w-[80%] h-[60%] bg-[#FF9ACB] rounded-full mix-blend-multiply filter blur-[60px] opacity-70 animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-[#B28DFF] rounded-full mix-blend-multiply filter blur-[60px] opacity-70 delay-700" />
            <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-[#FFE6F4] rounded-full mix-blend-overlay filter blur-[40px] opacity-80" />
          </>
        );
      case 2: // Warm
        return (
          <>
            <div className="absolute top-[-20%] right-[-20%] w-[90%] h-[80%] bg-[#B28DFF] rounded-full mix-blend-multiply filter blur-[70px] opacity-60" />
            <div className="absolute bottom-0 left-0 w-[80%] h-[60%] bg-[#FF9ACB] rounded-full mix-blend-multiply filter blur-[70px] opacity-60" />
            <div className="absolute top-[30%] left-[20%] w-[20%] h-[20%] bg-white rounded-full filter blur-[20px] opacity-90" />
          </>
        );
      case 3: // Protective
        return (
          <>
            <div className="absolute bottom-[10%] left-[-10%] w-[70%] h-[70%] bg-[#B28DFF] rounded-full mix-blend-multiply filter blur-[60px] opacity-80" />
            <div className="absolute top-[10%] right-[-20%] w-[80%] h-[60%] bg-[#9F7AEA] rounded-full mix-blend-multiply filter blur-[60px] opacity-60" />
            <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[50%] h-[50%] bg-[#EBCBF4] rounded-full mix-blend-screen filter blur-[50px] opacity-50" />
          </>
        );
      case 4: // Gentle
        return (
          <>
            <div className="absolute top-0 left-0 w-full h-full bg-[#FFE6F4]/50" />
            <div className="absolute top-[-30%] left-[10%] w-[80%] h-[80%] bg-[#FFD1DC] rounded-full mix-blend-multiply filter blur-[80px] opacity-60" />
            <div className="absolute bottom-[-20%] right-[10%] w-[70%] h-[70%] bg-[#FFF0F5] rounded-full mix-blend-multiply filter blur-[60px] opacity-80" />
          </>
        );
      case 5: // Bold
        return (
          <>
            <div className="absolute top-[-10%] right-[-30%] w-[90%] h-[90%] bg-[#FF85A2] rounded-full mix-blend-multiply filter blur-[70px] opacity-70" />
            <div className="absolute bottom-[-10%] left-[-20%] w-[80%] h-[80%] bg-[#B28DFF] rounded-full mix-blend-multiply filter blur-[70px] opacity-70" />
            <div className="absolute top-[40%] left-[10%] w-[30%] h-[30%] bg-[#FFAFCC] rounded-full mix-blend-screen filter blur-[40px] opacity-80" />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
      {renderBlobs()}
      {/* Universal Soft Grain Texture for "Human Feel" */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
    </div>
  );
};

export default AbstractBackground;