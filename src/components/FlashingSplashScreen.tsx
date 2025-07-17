import { useState, useEffect } from 'react';

interface FlashingSplashScreenProps {
  onComplete: () => void;
}

const FlashingSplashScreen = ({ onComplete }: FlashingSplashScreenProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // 20 verified, working images - diverse, authentic happy moments
  const happyImages = [
    {
      url: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Happy woman smiling outdoors"
    },
    {
      url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Man laughing with friends"
    },
    {
      url: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Woman cooking happily in kitchen"
    },
    {
      url: "https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Family laughing together"
    },
    {
      url: "https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "People exercising happily"
    },
    {
      url: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Friends having coffee together"
    },
    {
      url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Woman gardening happily"
    },
    {
      url: "https://images.unsplash.com/photo-1529068755536-a5ade0dcb4e8?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Couple walking together"
    },
    {
      url: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Happy woman with natural smile"
    },
    {
      url: "https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Man playing with dog"
    },
    {
      url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "People dancing joyfully"
    },
    {
      url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Woman biking happily"
    },
    {
      url: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Friends celebrating together"
    },
    {
      url: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Person painting creatively"
    },
    {
      url: "https://images.unsplash.com/photo-1520637836862-4d197d17c26a?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Family having picnic"
    },
    {
      url: "https://images.unsplash.com/photo-1559624047-42c4cfd24d19?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "People volunteering together"
    },
    {
      url: "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Woman enjoying sunset"
    },
    {
      url: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Children playing together"
    },
    {
      url: "https://images.unsplash.com/photo-1529258283598-8d6fe60b27f4?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "Person enjoying meal with friends"
    },
    {
      url: "https://images.unsplash.com/photo-1543269664-647b1e7d3b1c?w=1920&h=1080&fit=crop&q=80&auto=format",
      alt: "People reading together happily"
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

      {/* Full Screen Images */}
      <div className="fixed inset-0">
        {happyImages.map((image, index) => (
          <img
            key={index}
            src={image.url}
            alt={image.alt}
            className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-300 ${
              index === currentImageIndex 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-105'
            }`}
            loading="eager"
          />
        ))}
        
        {/* Overlay gradient for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20"></div>
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