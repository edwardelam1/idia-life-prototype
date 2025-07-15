import { useState, useEffect } from 'react';

interface FlashingSplashScreenProps {
  onComplete: () => void;
}

const FlashingSplashScreen = ({ onComplete }: FlashingSplashScreenProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // 20 happy people doing everyday things - diverse, authentic moments
  const happyImages = [
    {
      url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=800&fit=crop&q=80",
      alt: "Happy woman smiling outdoors"
    },
    {
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&q=80",
      alt: "Man laughing with friends"
    },
    {
      url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=800&fit=crop&q=80",
      alt: "Woman cooking happily in kitchen"
    },
    {
      url: "https://images.unsplash.com/photo-1609220136736-443140cffec6?w=800&h=800&fit=crop&q=80",
      alt: "Family laughing together"
    },
    {
      url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=800&fit=crop&q=80",
      alt: "People exercising happily"
    },
    {
      url: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&h=800&fit=crop&q=80",
      alt: "Person reading and smiling"
    },
    {
      url: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=800&h=800&fit=crop&q=80",
      alt: "Friends having coffee together"
    },
    {
      url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800&h=800&fit=crop&q=80",
      alt: "Woman gardening happily"
    },
    {
      url: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=800&h=800&fit=crop&q=80",
      alt: "Couple walking together"
    },
    {
      url: "https://images.unsplash.com/photo-1494790108755-2616c96bc96d?w=800&h=800&fit=crop&q=80",
      alt: "Happy woman with natural smile"
    },
    {
      url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=800&fit=crop&q=80",
      alt: "Man playing with dog"
    },
    {
      url: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&h=800&fit=crop&q=80",
      alt: "Children playing together"
    },
    {
      url: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&h=800&fit=crop&q=80",
      alt: "People dancing joyfully"
    },
    {
      url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=800&fit=crop&q=80",
      alt: "Person enjoying meal"
    },
    {
      url: "https://images.unsplash.com/photo-1527082395-e939b847da0d?w=800&h=800&fit=crop&q=80",
      alt: "Woman biking happily"
    },
    {
      url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=800&fit=crop&q=80",
      alt: "Friends celebrating"
    },
    {
      url: "https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=800&h=800&fit=crop&q=80",
      alt: "Person painting creatively"
    },
    {
      url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&h=800&fit=crop&q=80",
      alt: "Family having picnic"
    },
    {
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop&q=80",
      alt: "People volunteering together"
    },
    {
      url: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&h=800&fit=crop&q=80",
      alt: "Woman enjoying sunset"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        if (nextIndex >= happyImages.length) {
          // After showing all images, start fade out
          setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onComplete(), 1000); // Give time for fade out
          }, 500);
          return prevIndex;
        }
        return nextIndex;
      });
    }, 450); // 450ms per image for snappy transitions

    return () => clearInterval(interval);
  }, [onComplete, happyImages.length]);

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

      {/* Image Container */}
      <div className="flex items-center justify-center h-full">
        <div className="relative w-80 h-80 rounded-3xl overflow-hidden shadow-2xl">
          {happyImages.map((image, index) => (
            <img
              key={index}
              src={image.url}
              alt={image.alt}
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                index === currentImageIndex 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-105'
              }`}
              loading="eager"
            />
          ))}
          
          {/* Overlay gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2">
        <div className="flex space-x-2">
          {happyImages.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index <= currentImageIndex 
                  ? 'bg-white' 
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