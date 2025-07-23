
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
      // Demo app with mock data - no API calls to prevent errors
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
        },
        {
          id: 'mock-3',
          name: "TechHub Electronics",
          business_type: "Electronics Store",
          address: "789 Tech Blvd",
          business_locations: [{ address: "789 Tech Blvd" }],
          ar_experiences: [{
            id: 'ar-3',
            title: 'AR Product Demo',
            description: 'Try products virtually before buying',
            experience_type: 'product_visualization',
            ar_content_assets: []
          }],
          distance: "0.6 miles",
          rating: 4.7,
          isOpen: true,
          loyaltyStatus: "Bronze Member",
          specialOffers: ["Tech bundle discount"]
        },
        {
          id: 'mock-4',
          name: "Urban Fitness Center",
          business_type: "Gym",
          address: "321 Fitness Way",
          business_locations: [{ address: "321 Fitness Way" }],
          ar_experiences: [{
            id: 'ar-4',
            title: 'Virtual Gym Tour',
            description: 'Explore equipment and classes',
            experience_type: 'spatial_experience',
            ar_content_assets: []
          }],
          distance: "0.8 miles",
          rating: 4.5,
          isOpen: true,
          loyaltyStatus: "Platinum Member",
          specialOffers: ["Free trial week"]
        }
      ];

      setMerchants(mockMerchants);
    } catch (error) {
      console.error('Error loading merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const launchARExperience = async (experience: ARExperience, merchant: Merchant) => {
    try {
      // Demo AR experience - no API calls
      toast({
        title: "AR Experience Launched",
        description: `Launching ${experience.title} for ${merchant.name}`,
        variant: "default"
      });

      // Simulate AR experience launch
      console.log('Demo AR experience launched:', { experience, merchant });
      
    } catch (error) {
      console.error('Error launching AR experience:', error);
    }
  };

  const viewARMenu = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32 bg-muted" />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
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
