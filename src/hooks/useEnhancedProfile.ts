import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  suffix?: string;
  email?: string;
  account_type?: string;
  full_legal_address?: any;
  phone_number?: string;
  date_of_birth?: string;
  ssn_last4?: string;
  ein?: string;
  is_501c3_verified?: boolean;
  kyc_status?: string;
  avatar_url?: string;
  display_name?: string;
  phone?: string;
  address?: any;
  aliases?: string[];
  quiet_time_enabled?: boolean;
  quiet_time_start?: string;
  quiet_time_end?: string;
  ai_assistant_name?: string;
  motivational_phase?: string;
  trust_score?: number;
  available_credit_line?: number;
  is_seed_backed_up?: boolean;
  created_at?: string;
  updated_at?: string;
  // Include any other fields from the database
  [key: string]: any;
}

interface Wallet {
  id: string;
  user_id: string;
  wallet_address: string;
  cash_balance: number;
  idia_usd_balance: number;
  idia_token_balance: number;
  created_at: string;
  updated_at: string;
}

interface Interest {
  id: string;
  name: string;
  category?: string;
}

export const useEnhancedProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [userInterests, setUserInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      setProfile(profileData);

      // Fetch wallet
      const { data: walletData } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setWallet(walletData);

      // Fetch user interests
      const { data: userInterestsData } = await supabase
        .from('user_interests')
        .select(`
          interests (
            id,
            name,
            category
          )
        `)
        .eq('user_id', user.id);

      if (userInterestsData) {
        setUserInterests(userInterestsData.map(ui => ui.interests));
      }

    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllInterests = async () => {
    try {
      const { data, error } = await supabase
        .from('interests')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setInterests(data || []);
    } catch (err) {
      console.error('Error fetching interests:', err);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });

      return data;
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const addUserInterests = async (interestIds: string[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const inserts = interestIds.map(interestId => ({
        user_id: user.id,
        interest_id: interestId
      }));

      const { error } = await supabase
        .from('user_interests')
        .insert(inserts);

      if (error) throw error;

      // Refresh user interests
      await fetchProfile();

      toast({
        title: "Interests updated",
        description: "Your interests have been successfully saved.",
      });
    } catch (err) {
      console.error('Error adding user interests:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update interests';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const removeUserInterest = async (interestId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', user.id)
        .eq('interest_id', interestId);

      if (error) throw error;

      // Refresh user interests
      await fetchProfile();

      toast({
        title: "Interest removed",
        description: "Interest has been successfully removed.",
      });
    } catch (err) {
      console.error('Error removing user interest:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove interest';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const generateWallet = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      // Generate a random wallet address (in real implementation, this would use crypto libraries)
      const walletAddress = `0x${Math.random().toString(16).substr(2, 40)}`;

      const { data, error } = await supabase
        .from('wallets')
        .insert({
          user_id: user.id,
          wallet_address: walletAddress,
          cash_balance: 0.0,
          idia_usd_balance: 50.0, // Welcome bonus
          idia_token_balance: 0.0
        })
        .select()
        .single();

      if (error) throw error;

      setWallet(data);
      toast({
        title: "Wallet created",
        description: "Your IDIA wallet has been successfully created with a welcome bonus!",
      });

      return data;
    } catch (err) {
      console.error('Error generating wallet:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAllInterests();
  }, []);

  return {
    profile,
    wallet,
    interests,
    userInterests,
    loading,
    error,
    updateProfile,
    addUserInterests,
    removeUserInterest,
    generateWallet,
    refetch: fetchProfile
  };
};