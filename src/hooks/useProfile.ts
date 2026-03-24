import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface USAddress {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  middle_name: string | null;
  suffix: string | null;
  age: number | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  bio: string | null;
  phone_number: string | null;
  full_legal_address: USAddress | null;
  interests: string[];
  health_goals: string[];
  activity_preferences: string[];
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme_preference: 'light' | 'dark';
  colorblind_mode: boolean;
  high_contrast: boolean;
  font_size: 'small' | 'medium' | 'large';
  data_sharing_consent: boolean;
  marketing_emails: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error loading profile:', profileError);
      } else if (profileData) {
        setProfile(profileData);
      }

      // Load preferences
      const { data: preferencesData, error: preferencesError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (preferencesError && preferencesError.code !== 'PGRST116') {
        console.error('Error loading preferences:', preferencesError);
      } else if (preferencesData) {
        setPreferences(preferencesData as UserPreferences);
      }

    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    setUpdating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setPreferences(data as UserPreferences);
      toast({
        title: "Success",
        description: "Preferences updated successfully"
      });

    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  return {
    profile,
    preferences,
    loading,
    updating,
    updateProfile,
    updatePreferences,
    reload: loadProfile
  };
};