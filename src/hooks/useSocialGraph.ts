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

      // Load friends with profile data
      const { data: friendsData, error: friendsError } = await supabase
        .from('friends')
        .select(`
          *,
          friend_profile:profiles!friends_user_id_2_fkey(id, first_name, last_name, display_name, avatar_url)
        `)
        .or(`user_id_1.eq.${user.id},user_id_2.eq.${user.id}`);

      if (friendsError) {
        console.error('Error loading friends:', friendsError);
      } else {
        setFriends(friendsData || []);
      }

      // Load trust circles
      const { data: circlesData, error: circlesError } = await supabase
        .from('trust_circles')
        .select(`
          *,
          trust_circle_members(count)
        `)
        .eq('owner_id', user.id);

      if (circlesError) {
        console.error('Error loading trust circles:', circlesError);
      } else {
        setTrustCircles(circlesData || []);
      }

      // Load good deeds
      const { data: deedsData, error: deedsError } = await supabase
        .from('good_deeds')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (deedsError) {
        console.error('Error loading good deeds:', deedsError);
      } else {
        setGoodDeeds(deedsData || []);
      }

      // Load social health metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('social_health_metrics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (metricsError && metricsError.code !== 'PGRST116') {
        console.error('Error loading social metrics:', metricsError);
      } else if (metricsData) {
        setSocialMetrics(metricsData);
      }

    } catch (error) {
      console.error('Error loading social data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetUserId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('friends')
        .insert({
          user_id_1: user.id,
          user_id_2: targetUserId,
          status: 'pending'
        });

      if (error) throw error;

      await loadSocialData();
      toast({
        title: "Success",
        description: "Friend request sent successfully"
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
      const { error } = await supabase
        .from('friends')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', friendshipId);

      if (error) throw error;

      await loadSocialData();
      toast({
        title: "Success",
        description: "Friend request accepted"
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let evidenceUrl = null;

      // Upload evidence if provided
      if (evidenceFile) {
        const fileExt = evidenceFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `good-deeds/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('good-deeds')
          .upload(filePath, evidenceFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('good-deeds')
          .getPublicUrl(filePath);

        evidenceUrl = publicUrl;
      }

      const { error } = await supabase
        .from('good_deeds')
        .insert({
          user_id: user.id,
          title,
          description,
          evidence_url: evidenceUrl,
          verification_status: 'pending'
        });

      if (error) throw error;

      await loadSocialData();
      toast({
        title: "Success",
        description: "Good deed submitted for verification"
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: circleData, error: circleError } = await supabase
        .from('trust_circles')
        .insert({
          name,
          owner_id: user.id
        })
        .select()
        .single();

      if (circleError) throw circleError;

      // Add members if provided
      if (memberIds.length > 0) {
        const memberInserts = memberIds.map(memberId => ({
          circle_id: circleData.id,
          user_id: memberId
        }));

        const { error: memberError } = await supabase
          .from('trust_circle_members')
          .insert(memberInserts);

        if (memberError) throw memberError;
      }

      await loadSocialData();
      toast({
        title: "Success",
        description: "Trust circle created successfully"
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