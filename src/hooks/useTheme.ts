import { useEffect, useState } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Theme = 'light' | 'dark';
type AccessibilityMode = 'normal' | 'colorblind';

interface ThemeConfig {
  theme: Theme;
  accessibilityMode: AccessibilityMode;
}

export const useTheme = () => {
  const { theme: nextTheme, setTheme: setNextTheme } = useNextTheme();
  const [accessibilityMode, setAccessibilityMode] = useState<AccessibilityMode>('normal');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load accessibility mode from localStorage on mount
  useEffect(() => {
    const savedAccessibility = localStorage.getItem('accessibility-mode') as AccessibilityMode || 'normal';
    setAccessibilityMode(savedAccessibility);
    applyAccessibilityMode(savedAccessibility);
    setLoading(false);
  }, []);

  // Load preferences from database for authenticated users
  useEffect(() => {
    const loadUserPreferences = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('theme_preference, colorblind_mode, high_contrast, font_size')
        .eq('user_id', user.id)
        .maybeSingle();

      if (preferences) {
        if (preferences.theme_preference) {
          setNextTheme(preferences.theme_preference);
        }
        if (preferences.colorblind_mode !== null) {
          const newAccessibilityMode = preferences.colorblind_mode ? 'colorblind' : 'normal';
          setAccessibilityMode(newAccessibilityMode);
          applyAccessibilityMode(newAccessibilityMode);
          localStorage.setItem('accessibility-mode', newAccessibilityMode);
        }
        // Apply high contrast and font size
        applyHighContrast(preferences.high_contrast || false);
        applyFontSize((preferences.font_size as 'small' | 'medium' | 'large') || 'medium');
      }
    };

    loadUserPreferences();
  }, [setNextTheme]);

  const applyAccessibilityMode = (mode: AccessibilityMode) => {
    const root = document.documentElement;
    root.classList.remove('colorblind');
    if (mode === 'colorblind') {
      root.classList.add('colorblind');
    }
  };

  const applyHighContrast = (enabled: boolean) => {
    const root = document.documentElement;
    if (enabled) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
  };

  const applyFontSize = (size: 'small' | 'medium' | 'large') => {
    const root = document.documentElement;
    root.classList.remove('font-size-small', 'font-size-medium', 'font-size-large');
    root.classList.add(`font-size-${size}`);
  };

  const updateTheme = async (newTheme: Theme) => {
    setNextTheme(newTheme);
    
    // Save to database if user is authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_preferences')
          .update({ theme_preference: newTheme })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error updating theme preference:', error);
      toast({
        title: "Error",
        description: "Failed to save theme preference",
        variant: "destructive"
      });
    }
  };

  const updateAccessibilityMode = async (newMode: AccessibilityMode) => {
    setAccessibilityMode(newMode);
    applyAccessibilityMode(newMode);
    
    // Save to localStorage
    localStorage.setItem('accessibility-mode', newMode);
    
    // Save to database if user is authenticated
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_preferences')
          .update({ colorblind_mode: newMode === 'colorblind' })
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error updating accessibility preference:', error);
      toast({
        title: "Error",
        description: "Failed to save accessibility preferences",
        variant: "destructive"
      });
    }
  };

  const toggleTheme = () => {
    updateTheme(nextTheme === 'light' ? 'dark' : 'light');
  };

  const toggleAccessibilityMode = () => {
    updateAccessibilityMode(accessibilityMode === 'normal' ? 'colorblind' : 'normal');
  };

  return {
    theme: nextTheme as Theme,
    accessibilityMode,
    loading,
    updateTheme,
    updateAccessibilityMode,
    toggleTheme,
    toggleAccessibilityMode
  };
};