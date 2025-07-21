
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Star, Clock, ShoppingCart, Camera, Eye, Sparkles, Search, Tag, Heart, ShoppingBag, Utensils, Coffee, Fuel } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ARExperience {
  id: string;
  title: string;
  description: string;
  experience_type: string;
  ar_content_assets: any[];
}

interface Merchant {
  id: string;
  name: string;
  business_type: string;
  address: string;
  business_locations: any[];
  ar_experiences: ARExperience[];
  distance?: string;
  rating?: number;
  isOpen?: boolean;
  loyaltyStatus?: string;
  specialOffers?: string[];
}

const ShopScreen = () => {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    getUserLocation();
    fetchNearbyMerchants();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use default location or show error
        }
      );
    }
  };

  const fetchNearbyMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select(`
          *,
          business_locations(*),
          ar_experiences(
            *,
            ar_content_assets(*)
          )
        `)
        .not('ar_experiences', 'is', null)
        .eq('ar_experiences.is_active', true);

      if (error) throw error;

      // Add mock data for demo purposes
      const mockMerchants = [
        {
          id: 'mock-1',
          name: "Joe's Coffee & More",
          business_type: "Coffee Shop",
          address: "123 Main St",
          business_locations: [{ address: "123 Main St" }],
          ar_experiences: [{
            id: 'ar-1',
            title: 'Interactive Coffee Menu',
            description: 'View our coffee in 3D and see ingredients',
            experience_type: 'menu_visualization',
            ar_content_assets: []
          }],
          distance: "0.2 miles",
          rating: 4.8,
          isOpen: true,
          loyaltyStatus: "Gold Member",
          specialOffers: ["10% off coffee", "Free pastry with purchase"]
        },
        {
          id: 'mock-2',
          name: "Fresh Garden Bistro",
          business_type: "Restaurant",
          address: "456 Oak Ave",
          business_locations: [{ address: "456 Oak Ave" }],
          ar_experiences: [{
            id: 'ar-2',
            title: 'AR Garden Tour',
            description: 'Explore our virtual herb garden',
            experience_type: 'spatial_experience',
            ar_content_assets: []
          }],
          distance: "0.4 miles",
          rating: 4.6,
          isOpen: true,
          loyaltyStatus: "Silver Member",
          specialOffers: ["Happy hour 3-6pm"]
        }
      ];

      setMerchants([...mockMerchants, ...(data || [])]);
    } catch (error) {
      console.error('Error fetching merchants:', error);
      toast({
        title: "Error",
        description: "Failed to load nearby merchants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const launchARExperience = async (experience: ARExperience, merchant: Merchant) => {
    try {
      // Track AR interaction
      const { error } = await supabase.functions.invoke('ar-experience-manager', {
        body: {
          action: 'track_interaction',
          user_id: (await supabase.auth.getUser()).data.user?.id,
          experience_id: experience.id,
          interaction_data: {
            type: 'launch',
            data: { merchant_id: merchant.id },
            session_id: crypto.randomUUID(),
            location: userLocation,
            device_info: { type: 'mobile_web' }
          }
        }
      });

      if (error) throw error;

      toast({
        title: "AR Experience Launched",
        description: `Launching ${experience.title}`,
        variant: "default"
      });

      // In a real implementation, this would launch the AR camera/viewer
      console.log('Launching AR experience:', experience);
      
    } catch (error) {
      console.error('Error launching AR experience:', error);
      toast({
        title: "Error",
        description: "Failed to launch AR experience",
        variant: "destructive"
      });
    }
  };

  const viewARMenu = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32 bg-muted" />
          ))}
        </div>
      </div>
    );
  };

  return (
    {
      id: 1,
      name: 'Green Bean Coffee',
      category: 'coffee',
      distance: '0.2 miles',
      rating: 4.8,
      reviews: 127,
      loyaltyPoints: 145,
      nextReward: '50 points',
      rewardType: 'Free Medium Coffee',
      isOpen: true,
      hours: 'Open until 8 PM',
      specialOffer: '20% off with IDIA Pay',
      image: '☕'
    },
    {
      id: 2,
      name: 'Fresh Market Grocery',
      category: 'food',
      distance: '0.5 miles',
      rating: 4.6,
      reviews: 89,
      loyaltyPoints: 289,
      nextReward: '200 points',
      rewardType: '$10 off groceries',
      isOpen: true,
      hours: 'Open until 10 PM',
      specialOffer: 'Double loyalty points today',
      image: '🛒'
    },
    {
      id: 3,
      name: 'Bella Vista Italian',
      category: 'food',
      distance: '0.8 miles',
      rating: 4.9,
      reviews: 203,
      loyaltyPoints: 67,
      nextReward: '25 points',
      rewardType: 'Free Appetizer',
      isOpen: false,
      hours: 'Opens at 5 PM',
      specialOffer: 'Happy hour 5-7 PM',
      image: '🍝'
    },
    {
      id: 4,
      name: 'Quick Stop Gas',
      category: 'gas',
      distance: '1.2 miles',
      rating: 4.3,
      reviews: 45,
      loyaltyPoints: 12,
      nextReward: '15 points',
      rewardType: '5¢ off per gallon',
      isOpen: true,
      hours: 'Open 24 hours',
      specialOffer: 'IDIA members save extra 3¢/gal',
      image: '⛽'
    <div className="p-6 space-y-6">
      <Tabs defaultValue="nearby" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="nearby">Nearby</TabsTrigger>
          <TabsTrigger value="ar-experiences">AR Experiences</TabsTrigger>
        </TabsList>

        <TabsContent value="nearby" className="space-y-4">
          <div className="grid gap-4">
            {merchants.map((merchant) => (
              <Card key={merchant.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{merchant.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {merchant.business_locations?.[0]?.address || merchant.address} • {merchant.distance || 'Unknown distance'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{merchant.rating || 4.5}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={merchant.isOpen !== false ? "default" : "secondary"}>
                        <Clock className="h-3 w-3 mr-1" />
                        {merchant.isOpen !== false ? "Open" : "Closed"}
                      </Badge>
                      {merchant.loyaltyStatus && (
                        <Badge variant="outline">{merchant.loyaltyStatus}</Badge>
                      )}
                      {merchant.ar_experiences && merchant.ar_experiences.length > 0 && (
                        <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-secondary/10">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AR Available
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      className="flex-1" 
                      disabled={merchant.isOpen === false}
                      onClick={() => viewARMenu(merchant)}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      View Menu
                    </Button>
                    {merchant.ar_experiences && merchant.ar_experiences.length > 0 && (
                      <Button 
                        variant="outline" 
                        disabled={merchant.isOpen === false}
                        onClick={() => launchARExperience(merchant.ar_experiences[0], merchant)}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        AR View
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ar-experiences" className="space-y-4">
          <div className="grid gap-4">
            {merchants
              .filter(m => m.ar_experiences && m.ar_experiences.length > 0)
              .map((merchant) => (
                <Card key={merchant.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      {merchant.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {merchant.ar_experiences.map((experience) => (
                      <div key={experience.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{experience.title}</h4>
                          <p className="text-sm text-muted-foreground">{experience.description}</p>
                        </div>
                        <Button size="sm" onClick={() => launchARExperience(experience, merchant)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Launch
                        </Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ShopScreen;
