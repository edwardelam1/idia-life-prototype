import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Activity, Heart, Timer, Flame, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const HealthDataSimulator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateRealisticHealthData = () => {
    const now = new Date();
    const activities = ['Walk', 'Run', 'Bike', 'Swim', 'Hike'];
    const activity = activities[Math.floor(Math.random() * activities.length)];
    
    // Generate realistic data based on activity type
    let stepCount, heartRate, distance, duration, calories;
    
    switch (activity) {
      case 'Run':
        stepCount = Math.floor(Math.random() * 3000) + 2000; // 2000-5000 steps
        heartRate = Math.floor(Math.random() * 40) + 140; // 140-180 bpm
        distance = Math.floor(Math.random() * 5000) + 2000; // 2-7km in meters
        duration = Math.floor(Math.random() * 1800) + 1200; // 20-50 minutes
        calories = Math.floor(distance * 0.06); // ~60 cal per km
        break;
      case 'Walk':
        stepCount = Math.floor(Math.random() * 5000) + 3000; // 3000-8000 steps
        heartRate = Math.floor(Math.random() * 30) + 90; // 90-120 bpm
        distance = Math.floor(Math.random() * 3000) + 1000; // 1-4km in meters
        duration = Math.floor(Math.random() * 2400) + 1800; // 30-70 minutes
        calories = Math.floor(distance * 0.04); // ~40 cal per km
        break;
      case 'Bike':
        stepCount = 0; // No steps for biking
        heartRate = Math.floor(Math.random() * 50) + 120; // 120-170 bpm
        distance = Math.floor(Math.random() * 15000) + 5000; // 5-20km in meters
        duration = Math.floor(Math.random() * 2400) + 1200; // 20-60 minutes
        calories = Math.floor(distance * 0.03); // ~30 cal per km
        break;
      case 'Swim':
        stepCount = 0; // No steps for swimming
        heartRate = Math.floor(Math.random() * 40) + 130; // 130-170 bpm
        distance = Math.floor(Math.random() * 1500) + 500; // 0.5-2km in meters
        duration = Math.floor(Math.random() * 1800) + 900; // 15-45 minutes
        calories = Math.floor(distance * 0.8); // High calorie burn
        break;
      default: // Hike
        stepCount = Math.floor(Math.random() * 8000) + 4000; // 4000-12000 steps
        heartRate = Math.floor(Math.random() * 35) + 110; // 110-145 bpm
        distance = Math.floor(Math.random() * 8000) + 2000; // 2-10km in meters
        duration = Math.floor(Math.random() * 3600) + 1800; // 30-90 minutes
        calories = Math.floor(distance * 0.08); // Higher calorie burn for hiking
    }

    return {
      user_id: (supabase.auth.getUser().then(u => u.data.user?.id) || crypto.randomUUID()) as any,
      device_type: 'iPhone Health',
      activity_type: activity,
      step_count: stepCount,
      recorded_at: now.toISOString(),
      processing_status: 'pending',
      raw_payload: {
        activityType: activity,
        heart_rate: heartRate,
        distance: distance,
        duration: duration,
        calories: calories,
        startDate: new Date(now.getTime() - duration * 1000).toISOString(),
        endDate: now.toISOString(),
        deviceModel: 'iPhone 15 Pro',
        appVersion: '1.0.0',
        location: {
          latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
          longitude: -74.0060 + (Math.random() - 0.5) * 0.1
        }
      }
    };
  };

  const simulateHealthData = async () => {
    setIsGenerating(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to simulate health data",
          variant: "destructive"
        });
        return;
      }

      const healthData = generateRealisticHealthData();
      healthData.user_id = user.user.id;

      const { error } = await supabase
        .from('raw_health_data')
        .insert([healthData]);

      if (error) {
        throw error;
      }

      toast({
        title: "Health Data Generated",
        description: `Generated ${healthData.activity_type} activity with ${healthData.step_count} steps`,
      });

    } catch (error: any) {
      console.error('Error generating health data:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate health data",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Health Data Simulator</CardTitle>
          <Badge variant="secondary" className="text-xs">Development Tool</Badge>
        </div>
        <CardDescription>
          Generate realistic health data for testing the automatic pipeline
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <span>Heart Rate</span>
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-500" />
              <span>Duration</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span>Calories</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-500" />
              <span>Location</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={simulateHealthData}
              disabled={isGenerating}
              className="flex-1"
            >
              {isGenerating ? "Generating..." : "Generate Health Activity"}
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground">
            This will create realistic health data that automatically flows through the pipeline: 
            Raw Data → Processing → Staging → Rewards → Wallet Credit
          </p>
        </div>
      </CardContent>
    </Card>
  );
};