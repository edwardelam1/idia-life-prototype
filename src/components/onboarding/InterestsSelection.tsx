import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useEnhancedProfile } from '@/hooks/useEnhancedProfile';

interface InterestsSelectionProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const InterestsSelection: React.FC<InterestsSelectionProps> = ({ 
  onComplete, 
  onSkip 
}) => {
  const { interests, addUserInterests } = useEnhancedProfile();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInterestToggle = (interestId: string) => {
    setSelectedInterests(prev => 
      prev.includes(interestId)
        ? prev.filter(id => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSubmit = async () => {
    if (selectedInterests.length === 0) {
      onComplete();
      return;
    }

    setIsSubmitting(true);
    try {
      await addUserInterests(selectedInterests);
      onComplete();
    } catch (error) {
      console.error('Error saving interests:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group interests by category
  const groupedInterests = interests.reduce((acc, interest) => {
    const category = interest.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(interest);
    return acc;
  }, {} as Record<string, typeof interests>);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-primary mb-4">What interests you?</h2>
        <p className="text-lg text-muted-foreground">
          Help us personalize your experience by selecting your interests. This helps us recommend relevant opportunities and insights.
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedInterests).map(([category, categoryInterests]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="capitalize text-lg">
                {category === 'other' ? 'Other' : category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categoryInterests.map((interest) => {
                  const isSelected = selectedInterests.includes(interest.id);
                  return (
                    <div
                      key={interest.id}
                      className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleInterestToggle(interest.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleInterestToggle(interest.id)}
                      />
                      <span className="text-sm font-medium">{interest.name}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedInterests.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Selected Interests:</h3>
          <div className="flex flex-wrap gap-2">
            {selectedInterests.map((interestId) => {
              const interest = interests.find(i => i.id === interestId);
              return interest ? (
                <Badge key={interestId} variant="secondary">
                  {interest.name}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-8"
          size="lg"
        >
          {isSubmitting ? 'Saving...' : selectedInterests.length > 0 ? 'Save Interests' : 'Continue'}
        </Button>
        {onSkip && (
          <Button 
            onClick={onSkip}
            variant="outline"
            className="px-8"
            size="lg"
          >
            Skip for now
          </Button>
        )}
      </div>
    </div>
  );
};