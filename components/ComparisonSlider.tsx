
import React, { useState, useRef, useEffect } from 'react';
import { MoveHorizontal } from 'lucide-react';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  onClose?: () => void;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ 
  beforeImage, 
  afterImage, 
  beforeLabel = "Before", 
  afterLabel = "After",
  onClose
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);

  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  };

  const handleTouchMove = (e: React.TouchEvent | TouchEvent) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  };

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="relative w-full h-full flex flex-col select-none">
      {/* Container */}
      <div 
        ref={containerRef}
        className="relative w-full flex-1 overflow-hidden bg-gray-100 rounded-xl cursor-ew-resize group"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        {/* After Image (Background) */}
        <img 
          src={afterImage} 
          alt="After" 
          className="absolute top-0 left-0 w-full h-full object-cover" 
        />
        <div className="absolute top-4 right-4 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
          {afterLabel}
        </div>

        {/* Before Image (Foreground - Clipped) */}
        <div 
          className="absolute top-0 left-0 h-full overflow-hidden"
          style={{ width: `${sliderPosition}%`, borderRight: '2px solid white' }}
        >
          <img 
            src={beforeImage} 
            alt="Before" 
            className="absolute top-0 left-0 h-full max-w-none object-cover"
            style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100%' }}
          />
          <div className="absolute top-4 left-4 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
            {beforeLabel}
          </div>
        </div>

        {/* Slider Handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.3)] z-10"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-teal-600 transform transition-transform group-hover:scale-110">
            <MoveHorizontal size={16} />
          </div>
        </div>
      </div>
      
      <p className="text-center text-xs text-gray-500 mt-3 font-medium">
        Drag slider to compare
      </p>
    </div>
  );
};
