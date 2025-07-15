import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Theme = 'light' | 'dark';
type AccessibilityMode = 'normal' | 'colorblind';

interface ThemeConfig {
  theme: Theme;
  accessibilityMode: AccessibilityMode;
}

export const useTheme = () => {
  const [config, setConfig] = useState<ThemeConfig>({
    theme: 'light',
    accessibilityMode: 'normal'
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme || 'light';
    const savedAccessibility = localStorage.getItem('accessibility-mode') as AccessibilityMode || 'normal';
    
    setConfig({
      theme: savedTheme,
      accessibilityMode: savedAccessibility
    });
    
    applyTheme(savedTheme, savedAccessibility);
    setLoading(false);
  }, []);

  // Load theme from database for authenticated users
  useEffect(() => {
    const loadUserPreferences = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('theme_preference, colorblind_mode')
        .eq('user_id', user.id)
        .single();

      if (preferences) {
        const newConfig = {
          theme: preferences.theme_preference as Theme,
          accessibilityMode: preferences.colorblind_mode ? 'colorblind' : 'normal' as AccessibilityMode
        };
        
        setConfig(newConfig);
        applyTheme(newConfig.theme, newConfig.accessibilityMode);
        
        // Sync to localStorage
        localStorage.setItem('theme', newConfig.theme);
        localStorage.setItem('accessibility-mode', newConfig.accessibilityMode);
      }
    };

    loadUserPreferences();
  }, []);

  const applyTheme = (theme: Theme, accessibilityMode: AccessibilityMode) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'colorblind');
    
    // Apply theme classes
    if (accessibilityMode === 'colorblind') {
      root.classList.add('colorblind');
      if (theme === 'dark') {
        root.classList.add('dark');
      }
    } else {
      if (theme === 'dark') {
        root.classList.add('dark');
      }
    }
  };

  const updateTheme = async (newTheme: Theme) => {
    const newConfig = { ...config, theme: newTheme };
    setConfig(newConfig);
    applyTheme(newConfig.theme, newConfig.accessibilityMode);
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
    
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
    }
  };

  const updateAccessibilityMode = async (newMode: AccessibilityMode) => {
    const newConfig = { ...config, accessibilityMode: newMode };
    setConfig(newConfig);
    applyTheme(newConfig.theme, newConfig.accessibilityMode);
    
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
    updateTheme(config.theme === 'light' ? 'dark' : 'light');
  };

  const toggleAccessibilityMode = () => {
    updateAccessibilityMode(config.accessibilityMode === 'normal' ? 'colorblind' : 'normal');
  };

  return {
    theme: config.theme,
    accessibilityMode: config.accessibilityMode,
    loading,
    updateTheme,
    updateAccessibilityMode,
    toggleTheme,
    toggleAccessibilityMode
  };
};