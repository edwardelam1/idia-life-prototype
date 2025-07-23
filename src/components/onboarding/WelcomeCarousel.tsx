import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ValueProposition {
  title: string;
  description: string;
  icon: string;
}

const defaultPropositions: ValueProposition[] = [
  {
    title: "Earn From Your Data",
    description: "Transform your daily activities into passive income. Your data, your earnings.",
    icon: "💰"
  },
  {
    title: "Payments with a Purpose™",
    description: "Every transaction supports community growth and social impact initiatives.",
    icon: "🌟"
  },
  {
    title: "Fairer Credit",
    description: "Build trust and creditworthiness through community engagement and good deeds.",
    icon: "🤝"
  },
  {
    title: "Social Health",
    description: "Connect meaningfully with your community while maintaining privacy and control.",
    icon: "❤️"
  }
];

interface WelcomeCarouselProps {
  onSignUp: () => void;
  onLogIn: () => void;
}

export const WelcomeCarousel: React.FC<WelcomeCarouselProps> = ({
  onSignUp,
  onLogIn
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [propositions] = useState<ValueProposition[]>(defaultPropositions);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % propositions.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + propositions.length) % propositions.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col">
      {/* Header */}
      <div className="flex justify-center pt-8 pb-4">
        <div className="flex items-center space-x-3">
          <img 
            src="/lovable-uploads/a1fcabab-f9bb-4a81-9b30-10d1aab93545.png" 
            alt="IDIA Life Logo" 
            className="w-12 h-12 rounded-lg"
          />
          <h1 className="text-3xl font-bold text-primary">IDIA Life</h1>
        </div>
      </div>

      {/* Carousel */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-xl bg-card border shadow-lg">
            <div 
              className="flex transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {propositions.map((prop, index) => (
                <div key={index} className="w-full flex-shrink-0 p-8 md:p-12 text-center">
                  <div className="text-6xl mb-6">{prop.icon}</div>
                  <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
                    {prop.title}
                  </h2>
                  <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                    {prop.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Navigation arrows */}
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-md hover:bg-background transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm border shadow-md hover:bg-background transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {propositions.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentSlide ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8 max-w-md mx-auto">
            <Button 
              onClick={onSignUp}
              className="flex-1 py-3 text-lg font-semibold"
              size="lg"
            >
              Get Started
            </Button>
            <Button 
              onClick={onLogIn}
              variant="outline"
              className="flex-1 py-3 text-lg font-semibold"
              size="lg"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 pt-4">
        <p className="text-sm text-muted-foreground">
          Join the future of data ownership and community-driven finance
        </p>
      </div>
    </div>
  );
};