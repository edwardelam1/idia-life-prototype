
import { useState, useEffect } from 'react';

export const useSyllableBlinking = (isActive: boolean, text?: string) => {
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    if (!isActive || !text) {
      setIsBlinking(false);
      return;
    }

    // Estimate syllables in the text (rough approximation)
    const syllableCount = estimateSyllables(text);
    // Average speaking rate is about 4-5 syllables per second
    const syllableDuration = 1000 / 4.5; // ~222ms per syllable
    
    let currentSyllable = 0;
    const interval = setInterval(() => {
      if (currentSyllable >= syllableCount) {
        setIsBlinking(false);
        clearInterval(interval);
        return;
      }
      
      // Toggle blink for each syllable
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), syllableDuration * 0.4); // Blink for 40% of syllable duration
      
      currentSyllable++;
    }, syllableDuration);

    return () => clearInterval(interval);
  }, [isActive, text]);

  return isBlinking;
};

// Simple syllable estimation function
const estimateSyllables = (text: string): number => {
  if (!text) return 0;
  
  // Remove punctuation and convert to lowercase
  const cleanText = text.toLowerCase().replace(/[^a-z\s]/g, '');
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  
  let totalSyllables = 0;
  
  words.forEach(word => {
    // Count vowel groups (rough syllable estimation)
    const vowelMatches = word.match(/[aeiouy]+/g);
    let syllables = vowelMatches ? vowelMatches.length : 1;
    
    // Adjust for silent 'e' at the end
    if (word.endsWith('e') && syllables > 1) {
      syllables--;
    }
    
    // Minimum of 1 syllable per word
    totalSyllables += Math.max(1, syllables);
  });
  
  return totalSyllables;
};
