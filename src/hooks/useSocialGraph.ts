import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Friend {
  id: string;
  user_id_1: string;
  user_id_2: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  accepted_at: string | null;
  friend_profile?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export interface TrustCircle {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

export interface GoodDeed {
  id: string;
  user_id: string;
  title: string;
  description: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  evidence_url: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
}

export interface SocialHealthMetrics {
  user_id: string;
  reciprocity_score: number;
  network_vitality_score: number;
  last_calculated: string;
}

export const useSocialGraph = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [trustCircles, setTrustCircles] = useState<TrustCircle[]>([]);
  const [goodDeeds, setGoodDeeds] = useState<GoodDeed[]>([]);
  const [socialMetrics, setSocialMetrics] = useState<SocialHealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSocialData();
  }, []);

  const loadSocialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Mock data since social tables don't exist yet
      setFriends([]);
      setTrustCircles([]);
      setGoodDeeds([]);
      setSocialMetrics({
        user_id: user.id,
        reciprocity_score: 0.85,
        network_vitality_score: 0.72,
        last_calculated: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error loading social data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetUserId: string) => {
    try {
      // Mock implementation
      toast({
        title: "Coming Soon",
        description: "Friend requests will be available when social features are fully implemented"
      });
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive"
      });
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      // Mock implementation
      toast({
        title: "Coming Soon",
        description: "Friend request management will be available when social features are fully implemented"
      });
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive"
      });
    }
  };

  const submitGoodDeed = async (title: string, description: string, evidenceFile?: File) => {
    try {
      // Mock implementation
      toast({
        title: "Coming Soon",
        description: "Good deed submissions will be available when social features are fully implemented"
      });
    } catch (error) {
      console.error('Error submitting good deed:', error);
      toast({
        title: "Error",
        description: "Failed to submit good deed",
        variant: "destructive"
      });
    }
  };

  const createTrustCircle = async (name: string, memberIds: string[] = []) => {
    try {
      // Mock implementation
      toast({
        title: "Coming Soon",
        description: "Trust circles will be available when social features are fully implemented"
      });
    } catch (error) {
      console.error('Error creating trust circle:', error);
      toast({
        title: "Error",
        description: "Failed to create trust circle",
        variant: "destructive"
      });
    }
  };

  return {
    friends,
    trustCircles,
    goodDeeds,
    socialMetrics,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    submitGoodDeed,
    createTrustCircle,
    reload: loadSocialData
  };
};