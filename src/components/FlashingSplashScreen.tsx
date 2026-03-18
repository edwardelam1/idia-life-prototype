import { useState, useEffect } from 'react';

interface FlashingSplashScreenProps {
  onComplete: () => void;
}

const FlashingSplashScreen = ({ onComplete }: FlashingSplashScreenProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Simple animation without external images
  const animationSteps = [
    "Connecting to your health data...",
    "Securing your information...", 
    "Calculating rewards...",
    "Almost ready..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= animationSteps.length) {
          // After showing all steps, start fade out
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onComplete(), 1000); // Give time for fade out
          }, 500);
          return prevIndex;
        }
        return nextIndex;
      });
    }, 1000); // 1 second per step

    return () => clearInterval(interval);
  }, [onComplete, animationSteps.length]);

  return (
    <div className={`fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-800 z-50 transition-opacity duration-1000 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      {/* Logo */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-20">
        <img 
          src="/lovable-uploads/a1fcabab-f9bb-4a81-9b30-10d1aab93545.png" 
          alt="IDIA Life Logo" 
          className="w-16 h-16 rounded-2xl shadow-lg"
        />
      </div>

      {/* Animated content */}
      <div className="fixed inset-0 flex flex-col items-center justify-center">
        <div className="text-center text-white max-w-md mx-auto px-8">
          <h1 className="text-3xl font-bold mb-8 text-teal-300">IDIA Life</h1>
          <div className="h-8 mb-8">
            {animationSteps.map((step, index) => (
              <p
                key={index}
                className={`text-lg transition-all duration-500 absolute left-1/2 transform -translate-x-1/2 ${
                  index === currentImageIndex 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-4'
                }`}
              >
                {step}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-2">
          {animationSteps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index <= currentImageIndex 
                  ? 'bg-teal-300' 
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Subtle loading text */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-white/80 text-sm">
        Loading your personalized experience...
      </div>
    </div>
  );
};

export default FlashingSplashScreen;