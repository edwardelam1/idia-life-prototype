
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LandingScreenProps {
  onSignUp: () => void;
}

const LandingScreen = ({ onSignUp }: LandingScreenProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      title: "Earn From Your Data",
      description: "Transform your digital footprint into passive income. Earn IDIA-USD by consensually sharing your anonymized data with trusted partners.",
      gradient: "from-teal-600 to-emerald-600"
    },
    {
      title: "Payments with a Purpose",
      description: "Every transaction creates positive impact. A portion of our revenue funds community programs and innovative tech ventures.",
      gradient: "from-emerald-600 to-green-600"
    },
    {
      title: "Fairer Credit",
      description: "Access capital based on your IDIA Trust Score™. Get rewarded for positive ecosystem participation, not just credit history.",
      gradient: "from-green-600 to-teal-600"
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="relative flex min-h-screen min-h-[100dvh] flex-col overflow-hidden trust-blue-radial text-primary-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-[-3rem] top-1/3 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-24 left-[-2rem] h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* Logo */}
      <div className="absolute left-1/2 top-6 z-20 -translate-x-1/2 transform sm:top-8">
        <img 
          src="/lovable-uploads/a1fcabab-f9bb-4a81-9b30-10d1aab93545.png" 
          alt="IDIA Life Logo" 
          className="w-16 h-16 rounded-2xl shadow-lg"
        />
      </div>

      {/* Carousel Container */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden px-4 pb-28 pt-28 sm:px-6 sm:pb-32 sm:pt-32">
        <div 
          className="flex h-full w-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div 
              key={index}
               className="relative flex min-h-full min-w-full flex-col justify-center"
            >
               <div className="relative mx-auto flex h-full w-full max-w-md flex-col justify-between rounded-[2rem] border border-primary-foreground/10 bg-card/8 px-6 py-8 shadow-2xl backdrop-blur-sm sm:px-8 sm:py-10">
                 <div className="absolute inset-0 rounded-[2rem] border border-primary-foreground/5" />
                 <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/40 to-transparent" />

                 <div className="relative space-y-6 text-center">
                   <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur-sm">
                     <span className="text-lg font-semibold text-primary-foreground">0{index + 1}</span>
                   </div>

                   <div className="space-y-4">
                     <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                       {slide.title}
                     </h1>
                     <p className="mx-auto max-w-xs text-base leading-7 text-primary-foreground/80 sm:max-w-sm sm:text-lg">
                       {slide.description}
                     </p>
                   </div>
                 </div>

                 <div className="relative mt-10 grid grid-cols-3 gap-3 text-left">
                   <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-3">
                     <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/55">Tier</p>
                     <p className="mt-2 text-sm font-semibold">Basic to Verified</p>
                   </div>
                   <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-3">
                     <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/55">Limits</p>
                     <p className="mt-2 text-sm font-semibold">$1K to Unlimited</p>
                   </div>
                   <div className="rounded-2xl border border-primary-foreground/10 bg-primary-foreground/5 p-3">
                     <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/55">Privacy</p>
                     <p className="mt-2 text-sm font-semibold">Encrypted by design</p>
                   </div>
                 </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button 
          onClick={prevSlide}
           className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-primary-foreground/10 bg-primary-foreground/10 p-3 backdrop-blur-sm transition-colors hover:bg-primary-foreground/20 sm:left-6"
           aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button 
          onClick={nextSlide}
           className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-primary-foreground/10 bg-primary-foreground/10 p-3 backdrop-blur-sm transition-colors hover:bg-primary-foreground/20 sm:right-6"
           aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Slide Indicators */}
      <div className="relative z-20 mb-6 flex justify-center space-x-3 px-6">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-primary-foreground scale-125' 
                : 'bg-primary-foreground/35 hover:bg-primary-foreground/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="relative z-20 px-6 pb-6 sm:px-8 sm:pb-8">
        <Button 
          onClick={onSignUp}
          className="h-14 w-full rounded-2xl bg-card text-card-foreground shadow-xl hover:bg-card/90"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default LandingScreen;
